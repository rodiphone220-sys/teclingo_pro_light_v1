import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { checkOrCreateUser, registerLog } from '../services/googleService.ts';

const router = Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);

router.post('/google-login', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'accessToken requerido' });
    }

    oauth2Client.setCredentials({ access_token: accessToken });

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const email = userInfo.data.email;
    const name = userInfo.data.name || email?.split('@')[0] || 'User';

    if (!email) {
      return res.status(400).json({ error: 'No se pudo obtener el email del usuario' });
    }

    const { isNew } = await checkOrCreateUser(email, name);
    await registerLog(email, 'LOGIN');

    let role: string = 'ALUMNO';
    if (email.endsWith('@directivo.teclingo')) role = 'DIRECTOR';
    else if (email.endsWith('@docente.teclingo')) role = 'DOCENTE';

    res.json({
      email,
      name,
      picture: userInfo.data.picture || null,
      role,
      isNew,
    });
  } catch (error: any) {
    console.error('[Auth Route] google-login error:', error);
    res.status(401).json({ error: error.message || 'Error al autenticar con Google' });
  }
});

router.post('/google-one-tap', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Credencial requerida' });
    }

    oauth2Client.setCredentials({});
    const ticket = await oauth2Client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'No se pudo obtener el email del token' });
    }

    const email = payload.email;
    const name = payload.name || email?.split('@')[0] || 'User';

    const { isNew } = await checkOrCreateUser(email, name);
    await registerLog(email, 'LOGIN');

    let role: string = 'ALUMNO';
    if (email.endsWith('@directivo.teclingo')) role = 'DIRECTOR';
    else if (email.endsWith('@docente.teclingo')) role = 'DOCENTE';

    res.json({
      email,
      name,
      picture: payload.picture || null,
      role,
      isNew,
    });
  } catch (error: any) {
    console.error('[Auth Route] google-one-tap error:', error);
    res.status(401).json({ error: error.message || 'Error al autenticar con Google' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (email) {
      await registerLog(email, 'LOGOUT');
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Auth Route] logout error:', error);
    res.status(500).json({ error: error.message || 'Error al registrar logout' });
  }
});

export default router;
