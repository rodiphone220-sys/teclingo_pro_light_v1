import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { checkOrCreateUser, registerLog } from '../../server/services/googleService.ts';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { code, redirectUri } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Falta el código de autorización' });
  }

  try {
    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: redirectUri || 'postmessage',
    });

    const idToken = tokens.id_token;
    if (!idToken) {
      return res.status(400).json({ error: 'No se recibió ID token de Google' });
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'No se pudo obtener el email del token' });
    }

    const email = payload.email;
    const name = payload.name || email.split("@")[0] || "User";
    const userAccessToken = tokens.access_token;

    let isNew = false;
    try {
      const result = await checkOrCreateUser(email, name, userAccessToken);
      isNew = result.isNew;
    } catch (sheetsErr: any) {
      console.warn("[Vercel Dedicated Auth] Sheets no disponible, login continúa:", sheetsErr.message);
    }

    try {
      await registerLog(email, "LOGIN", userAccessToken);
    } catch (sheetsErr: any) {
      console.warn("[Vercel Dedicated Auth] No se pudo registrar log en Sheets:", sheetsErr.message);
    }

    let role = "ALUMNO";
    if (email.endsWith("@directivo.teclingo")) role = "DIRECTOR";
    else if (email.endsWith("@docente.teclingo")) role = "DOCENTE";

    return res.status(200).json({ email, name, picture: payload.picture, role, isNew });
  } catch (error: any) {
    console.error("Error crítico en función aislada One Tap:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Error interno encapsulado",
    });
  }
}
