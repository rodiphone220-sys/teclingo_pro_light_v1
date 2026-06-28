import { google, sheets_v4, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

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

  console.log("[GoogleService] ¿Existe GOOGLE_SERVICE_ACCOUNT_JSON?", !!envJson);

  if (envJson) {
    try {
      const parsed = JSON.parse(envJson);
      return { 
        client_email: parsed.client_email, 
        private_key: fixPrivateKey(parsed.private_key) 
      };
    } catch {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON contiene JSON inválido');
    }
  }

  throw new Error(
    'No se encontraron credenciales de Service Account. ' +
    'Define GOOGLE_SERVICE_ACCOUNT_JSON en las variables de entorno de Vercel.'
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

    const existingSheets = meta.data.sheets?.map(s => s.properties?.title) || [];

    for (const sheetName of SHEET_NAMES) {
      if (!existingSheets.includes(sheetName)) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: { title: sheetName },
                },
              },
            ],
          },
        });
      }

      const range = `${sheetName}!A1:Z1`;
      const expected = SHEET_HEADERS[sheetName];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [expected] },
      });
    }

    console.log('[GoogleService] Spreadsheet inicializado correctamente');
  } catch (error: any) {
    if (error?.response?.status === 404) {
      console.error(
        `[GoogleService] El spreadsheet ${SPREADSHEET_ID} no existe.` +
        'Verifica que el ID sea correcto y que la Service Account tenga acceso de Editor.'
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
      range: 'USERS',
    });

    const rows = res.data.values || [];
    const existing = rows.find(row => row[2] === email);

    if (existing) {
      const rowIndex = rows.indexOf(existing) + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `USERS!E${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[now]] },
      });
      return { isNew: false };
    }

    const h = SHEET_HEADERS.USERS;
    const newRow = h.map(col => {
      if (col === 'id') return `USR-${Date.now()}`;
      if (col === 'nombre') return name;
      if (col === 'email') return email;
      if (col === 'fecha_registro') return now;
      if (col === 'último_login') return now;
      return '';
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'USERS',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newRow] },
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

    const h = SHEET_HEADERS.LOGS;
    const newRow = h.map(col => {
      if (col === 'id_log') return `LOG-${Date.now()}`;
      if (col === 'email') return email;
      if (col === 'evento') return action;
      if (col === 'timestamp') return now;
      return '';
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'LOGS',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newRow] },
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

    const h = SHEET_HEADERS.GRADES;
    const newRow = h.map(col => {
      if (col === 'id_nota') return `GRD-${Date.now()}`;
      if (col === 'email') return email;
      if (col === 'modulo') return modulo;
      if (col === 'herramienta') return herramienta;
      if (col === 'calificacion') return calificacion;
      if (col === 'tokens_usados') return tokensUsados;
      if (col === 'timestamp') return now;
      return '';
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'GRADES',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newRow] },
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
      '<html>',
      '<head><meta charset="utf-8"></head>',
      '<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">',
      '<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">',
      '<tr><td align="center">',
      '<table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:24px;overflow:hidden;">',
      '<tr><td align="center" style="padding:40px 40px 20px;">',
      '<h1 style="color:#DEFF9A;font-size:24px;font-weight:900;margin:0;letter-spacing:2px;">TECLINGO PRO</h1>',
      '</td></tr>',
      '<tr><td align="center" style="padding:0 40px 32px;">',
      '<p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 20px;">',
      'Hola <strong style="color:#DEFF9A;">' + name + '</strong>,</p>',
      '<p style="color:#b0b0b0;font-size:14px;line-height:1.6;margin:0;">',
      'Tu cuenta ha sido creada exitosamente en la plataforma <strong style="color:#ffffff;">TECLINGO PRO</strong>.',
      'Ya puedes comenzar tu misión lingüística con acceso a todas nuestras herramientas de aprendizaje impulsadas por IA.</p>',
      '</td></tr>',
      '<tr><td align="center" style="padding:0 40px 32px;">',
      '<a href="' + appUrl + '" style="display:inline-block;padding:16px 48px;border-radius:16px;background:#DEFF9A;color:#061a1a;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-decoration:none;">IR A TECLINGO</a>',
      '</td></tr>',
      '<tr><td align="center" style="padding:0 40px 20px;">',
      '<p style="color:#505050;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:3px;margin:0;">',
      '&copy; 2026 TECLINGO Protocols &mdash; Secure-Core Enabled</p>',
      '</td></tr>',
      '</table></td></tr></table></body></html>',
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
      error?.message || error
    );
    return false;
  }
}