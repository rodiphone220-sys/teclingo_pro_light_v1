import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { checkOrCreateUser, registerLog } from '../../server/services/googleService.ts';

const oauth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Falta la credencial en la petición' });
  }

  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: "No se pudo obtener el email del token" });
    }

    const email = payload.email;
    const name = payload.name || email.split("@")[0] || "User";

    let isNew = false;
    try {
      const result = await checkOrCreateUser(email, name);
      isNew = result.isNew;
    } catch (sheetsErr: any) {
      console.warn("[Vercel Dedicated Auth] Sheets no disponible, login continúa:", sheetsErr.message);
    }

    try {
      await registerLog(email, "LOGIN");
    } catch (sheetsErr: any) {
      console.warn("[Vercel Dedicated Auth] No se pudo registrar log en Sheets:", sheetsErr.message);
    }

    let role = "ALUMNO";
    if (email.endsWith("@directivo.teclingo")) role = "DIRECTOR";
    else if (email.endsWith("@docente.teclingo")) role = "DOCENTE";

    return res.status(200).json({ email, name, picture: payload.picture, role, isNew });
  } catch (error: any) {
    console.error("Error crítico en función aislada One Tap:", error);
    return res.status(200).json({
      success: false,
      error: error.message || "Error interno encapsulado",
      stack: error.stack
    });
  }
}
