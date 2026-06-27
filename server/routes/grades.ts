import { Router, Request, Response } from 'express';
import { saveGrade } from '../services/googleService';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, modulo, herramienta, calificacion, tokensUsados } = req.body;

    if (!email || !modulo || !herramienta || calificacion === undefined) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: email, modulo, herramienta, calificacion',
      });
    }

    const score = Number(calificacion);
    if (isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({ error: 'calificacion debe ser un número entre 0 y 100' });
    }

    const tokens = tokensUsados ? Number(tokensUsados) : 0;

    await saveGrade(email, modulo, herramienta, score, tokens);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Grades Route] error:', error);
    res.status(500).json({ error: error.message || 'Error al guardar la calificación' });
  }
});

export default router;
