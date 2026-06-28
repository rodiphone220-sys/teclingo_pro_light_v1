import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';

// ✅ CORREGIDO: Import desde la misma carpeta
import { checkOrCreateUser, registerLog } from './googleService';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { code, redirectUri } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Falta el código de autorización (code) en el req.body' });
  }
  if (!redirectUri) {
    return res.status(400).json({ 
      error: 'Falta la URI de redirección (redirectUri) en el req.body. El frontend debe enviarla explícitamente.' 
    });
  }

  try {
    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: redirectUri,
    });

    const idToken = tokens.id_token;
    if (!idToken) {
      return res.status(400).json({ error: 'No se recibió el ID Token desde Google.' });
    }

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

    let isNew = false;
    try {
      const result = await checkOrCreateUser(email, name); 
      isNew = result.isNew;
    } catch (sheetsErr: any) {
      console.warn("[OAuth Debug] Falló checkOrCreateUser en Sheets, pero el login continúa:", sheetsErr.message);
    }

    try {
      await registerLog(email, "LOGIN");
    } catch (sheetsErr: any) {
      console.warn("[OAuth Debug] Falló el registro de log en Sheets:", sheetsErr.message);
    }

    let role = "ALUMNO";
    if (email.endsWith("@directivo.teclingo")) role = "DIRECTOR";
    else if (email.endsWith("@docente.teclingo")) role = "DOCENTE";

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
    
    const googleRawError = error.response?.data || null;

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
