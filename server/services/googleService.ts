import { google, sheets_v4, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { readFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '';
const SHEET_NAMES = ['USERS', 'LOGS', 'GRADES'] as const;

const SHEET_HEADERS: Record<string, string[]> = {
  USERS: ['id', 'nombre', 'email', 'fecha_registro', 'último_login'],
  LOGS: ['id_log', 'email', 'evento', 'timestamp'],
  GRADES: ['id_nota', 'email', 'modulo', 'herramienta', 'calificacion', 'tokens_usados', 'timestamp'],
};

let sheetsClient: sheets_v4.Sheets | null = null;
let gmailClient: gmail_v1.Gmail | null = null;

function fixPrivateKey(key: string): string {
  return key.replace(/\\n/g, '\n');
}

function loadServiceAccountCredentials(): { client_email: string; private_key: string } {
  const envJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const filePath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;

  console.log("[GoogleService] ¿Existe GOOGLE_SERVICE_ACCOUNT_JSON?", !!envJson);
  console.log("[GoogleService] ¿Existe GOOGLE_SERVICE_ACCOUNT_PATH?", !!filePath);

  if (envJson) {
    try {
      const parsed = JSON.parse(envJson);
      return { client_email: parsed.client_email, private_key: fixPrivateKey(parsed.private_key) };
    } catch {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON contiene JSON inválido');
    }
  }

  if (filePath && existsSync(filePath)) {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = raw;
    return { client_email: parsed.client_email, private_key: fixPrivateKey(parsed.private_key) };
  }

  throw new Error(
    'No se encontraron credenciales de Service Account. ' +
    'Define GOOGLE_SERVICE_ACCOUNT_JSON (env var) o GOOGLE_SERVICE_ACCOUNT_PATH (ruta local).',
  );
}

function getAuthClient() {
  const { client_email, private_key } = loadServiceAccountCredentials();
  return new google.auth.JWT(
    client_email,
    undefined,
    private_key,
    [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/gmail.send',
    ],
    undefined,
  );
}

function getSheets(): sheets_v4.Sheets {
  if (!sheetsClient) {
    sheetsClient = google.sheets({ version: 'v4', auth: getAuthClient() });
  }
  return sheetsClient;
}

function getGmail(): gmail_v1.Gmail {
  if (!gmailClient) {
    gmailClient = google.gmail({ version: 'v1', auth: getAuthClient() });
  }
  return gmailClient;
}

function getSheetsWithToken(accessToken: string): sheets_v4.Sheets {
  const auth = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: 'v4', auth });
}

export async function initializeSpreadsheet(): Promise<void> {
  const sheets = getSheets();

  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const existingTitles = (meta.data.sheets || []).map(
      (s) => s.properties?.title || '',
    );

    const missing = SHEET_NAMES.filter((name) => !existingTitles.includes(name));

    if (missing.length > 0) {
      console.log(`[GoogleService] Creando pestañas faltantes: ${missing.join(', ')}`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: missing.map((title) => ({
            addSheet: {
              properties: { title },
            },
          })),
        },
      });
    }

    for (const name of SHEET_NAMES) {
      const range = `${name}!1:1`;
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range,
      });

      const row = res.data.values?.[0];
      const expected = SHEET_HEADERS[name];
      const isEmpty = !row || row.length === 0 || row.every((c) => String(c).trim() === '');

      if (isEmpty) {
        console.log(`[GoogleService] Escribiendo headers en ${name}`);
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [expected] },
        });
      }
    }

    console.log('[GoogleService] Spreadsheet inicializado correctamente');
  } catch (error: any) {
    if (error?.response?.status === 404) {
      console.error(
        `[GoogleService] El spreadsheet ${SPREADSHEET_ID} no existe. ` +
        'Verifica que el ID sea correcto y que la Service Account tenga acceso de Editor.',
      );
    } else {
      console.error('[GoogleService] initializeSpreadsheet error:', error);
    }
    throw error;
  }
}

export async function checkOrCreateUser(
  email: string,
  name: string,
  accessToken?: string,
): Promise<{ isNew: boolean }> {
  try {
    const sheets = accessToken ? getSheetsWithToken(accessToken) : getSheets();
    const now = new Date().toISOString();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `USERS!A:E`,
    });

    const rows = res.data.values || [];
    const existingRowIndex = rows.findIndex(
      (row) => row[2]?.toString().toLowerCase() === email.toLowerCase(),
    );

    if (existingRowIndex >= 1) {
      const rowNum = existingRowIndex + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `USERS!E${rowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[now]] },
      });
      return { isNew: false };
    }

    const nextId = rows.length;
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'USERS',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[nextId, name, email, now, now]],
      },
    });

    sendWelcomeEmail(email, name).catch(() => {});

    return { isNew: true };
  } catch (error) {
    console.error('[GoogleService] checkOrCreateUser error:', error);
    throw error;
  }
}

export async function registerLog(
  email: string,
  action: 'LOGIN' | 'LOGOUT',
  accessToken?: string,
): Promise<void> {
  try {
    const sheets = accessToken ? getSheetsWithToken(accessToken) : getSheets();
    const now = new Date().toISOString();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'LOGS!A:A',
    });

    const nextId = (res.data.values || []).length;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'LOGS',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[nextId, email, action, now]],
      },
    });
  } catch (error) {
    console.error('[GoogleService] registerLog error:', error);
    throw error;
  }
}

export async function saveGrade(
  email: string,
  modulo: string,
  herramienta: string,
  calificacion: number,
  tokensUsados: number,
  accessToken?: string,
): Promise<void> {
  try {
    const sheets = accessToken ? getSheetsWithToken(accessToken) : getSheets();
    const now = new Date().toISOString();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'GRADES!A:A',
    });

    const nextId = (res.data.values || []).length;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'GRADES',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[nextId, email, modulo, herramienta, calificacion, tokensUsados, now]],
      },
    });
  } catch (error) {
    console.error('[GoogleService] saveGrade error:', error);
    throw error;
  }
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
): Promise<boolean> {
  try {
    const gmail = getGmail();
    const appUrl = process.env.APP_URL || 'https://teclingo.app';

    const htmlBody = [
      '<!DOCTYPE html>',
      '<html><head><meta charset="utf-8"></head>',
      '<body style="margin:0;padding:0;background-color:#061a1a;font-family:Arial,sans-serif;">',
      '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">',
      '<table width="600" cellpadding="0" cellspacing="0" style="background:#0d2b2b;border-radius:24px;border:1px solid rgba(222,255,154,0.2);overflow:hidden;">',
      '<tr><td align="center" style="padding:40px 20px 20px;">',
      '<div style="width:72px;height:72px;border-radius:24px;background:rgba(222,255,154,0.1);border:2px solid rgba(222,255,154,0.2);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">',
      '<span style="font-size:36px;">&#127760;</span></div>',
      '<h1 style="color:#ffffff;font-size:28px;font-weight:900;letter-spacing:-0.5px;margin:0 0 8px;">',
      'TECLINGO<span style="color:#DEFF9A;"> PRO</span></h1>',
      '<p style="color:#DEFF9A;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:4px;margin:0 0 24px;">Bienvenido a bordo</p>',
      '</td></tr>',
      '<tr><td align="left" style="padding:0 40px 20px;">',
      `<p style="color:#e0e0e0;font-size:16px;line-height:1.6;margin:0;">Hola <strong style="color:#DEFF9A;">${name}</strong>,</p>`,
      '<p style="color:#a0a0a0;font-size:14px;line-height:1.6;margin:16px 0 0;">',
      'Tu cuenta ha sido creada exitosamente en la plataforma <strong style="color:#ffffff;">TECLINGO PRO</strong>.',
      'Ya puedes comenzar tu misi&oacute;n ling&uuml;&iacute;stica con acceso a todas nuestras herramientas de aprendizaje impulsadas por IA.</p>',
      '</td></tr>',
      '<tr><td align="center" style="padding:0 40px 32px;">',
      `<a href="${appUrl}" style="display:inline-block;padding:16px 48px;border-radius:16px;background:#DEFF9A;color:#061a1a;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-decoration:none;">IR A TECLINGO</a>`,
      '</td></tr>',
      '<tr><td align="center" style="padding:0 40px 20px;">',
      '<p style="color:#505050;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:3px;margin:0;">',
      '&copy; 2026 TECLINGO Protocols &mdash; Secure-Core Enabled</p>',
      '</td></tr></table></td></tr></table></body></html>',
    ].join('');

    const raw = [
      `To: ${email}`,
      'From: TECLINGO PRO <noreply@teclingo.app>',
      `Subject: =?utf-8?B?${Buffer.from(`¡Bienvenido a TECLINGO PRO, ${name}!`).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="utf-8"',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(htmlBody, 'utf-8').toString('base64'),
    ].join('\r\n');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    console.log(`[GoogleService] Welcome email sent to ${email}`);
    return true;
  } catch (error: any) {
    console.warn(
      `[Gmail Service] No se pudo enviar el correo de bienvenida a ${email}, pero el login continuará:`,
      error?.message || error,
    );
    return false;
  }
}
