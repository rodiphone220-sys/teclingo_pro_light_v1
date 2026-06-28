import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { checkOrCreateUser, registerLog } from '../../server/services/googleService.ts';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

export default async function handler(req: Request, res: Response) {
  // 1. Validar método HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { code, redirectUri } = req.body;

  // 2. Validación estricta de parámetros de entrada
  if (!code) {
    return res.status(400).json({ error: 'Falta el código de autorización (code) en el req.body' });
  }
  if (!redirectUri) {
    return res.status(400).json({ 
      error: 'Falta la URI de redirección (redirectUri) en el req.body. El frontend debe enviarla explícitamente.' 
    });
  }

  try {
    // 3. Intercambiar el código de autorización por los tokens
    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: redirectUri,
    });

    const idToken = tokens.id_token;
    if (!idToken) {
      return res.status(400).json({ error: 'No se recibió el ID Token desde Google.' });
    }

    // 4. Verificar la identidad del usuario con el ID Token
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'No se pudo extraer el email del payload de Google.' });
    }

    const email = payload.email;
    const name = payload.name || email.split("@")[0] || "User";

    // 5. Validar que tengamos access_token para operar Google Sheets
    if (!tokens.access_token) {
      throw new Error('Google autenticó la identidad, pero no devolvió el "access_token" necesario para Sheets. Asegúrate de incluir access_type: "offline" y prompt: "consent" en el frontend.');
    }

    // 6. Operaciones con la base de datos de Google Sheets (Encapsuladas de forma segura)
    let isNew = false;
    try {
      const result = await checkOrCreateUser(email, name, tokens.access_token);
      isNew = result.isNew;
    } catch (sheetsErr: any) {
      console.warn("[OAuth Debug] Falló checkOrCreateUser en Sheets, pero el login continúa:", sheetsErr.message);
    }

    try {
      await registerLog(email, "LOGIN", tokens.access_token);
    } catch (sheetsErr: any) {
      console.warn("[OAuth Debug] Falló el registro de log en Sheets:", sheetsErr.message);
    }

    // 7. Enrutamiento de Roles de Teclingo Pro
    let role = "ALUMNO";
    if (email.endsWith("@directivo.teclingo")) role = "DIRECTOR";
    else if (email.endsWith("@docente.teclingo")) role = "DOCENTE";

    // 8. Respuesta exitosa (200 OK)
    return res.status(200).json({ 
      success: true,
      email, 
      name, 
      picture: payload.picture, 
      role, 
      isNew 
    });

  } catch (error: any) {
    console.error("Error crítico en interceptor One Tap:", error);
    
    // Captura los detalles crudos que Google devuelve en caso de rechazo
    const googleRawError = error.response?.data || null;

    // Retorna el error 500 inyectando telemetría directa al navegador
    return res.status(500).json({
      success: false,
      error: error.message || "Error interno encapsulado en el servidor",
      googleDetails: googleRawError,
      telemetria: {
        recibioCode: !!code,
        valorRedirectUriRecibido: redirectUri || "NULO / NO ENVIADO POR EL FRONTEND",
        envIdConfigurado: !!GOOGLE_CLIENT_ID,
        envSecretConfigurado: !!GOOGLE_CLIENT_SECRET
      }
    });
  }
}