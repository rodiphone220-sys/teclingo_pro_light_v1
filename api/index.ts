import Groq from "groq-sdk";
import { google } from "googleapis";
import {
  checkOrCreateUser,
  registerLog,
  saveGrade,
  initializeSpreadsheet,
} from "../server/services/googleService.ts";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "MISSING_API_KEY" });

function getOAuth2Client() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return null;
  }
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "postmessage",
  );
}

initializeSpreadsheet().catch((err) =>
  console.warn('[Vercel] initializeSpreadsheet falló:', (err as Error).message),
);

function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req: any, res: any) {
  const origin = req.headers.origin || req.headers?.Origin || "";
  const allowedOrigins = [
    "https://teclingo-pro.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
  ];
  const isAllowed = allowedOrigins.includes(origin) || origin.endsWith(".vercel.app");
  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET" && req.url === "/api/health") {
    return res.status(200).json({ status: "ok" });
  }

  if (req.method !== "POST") {
    return res.status(404).json({ error: "Not found" });
  }

  const data = await readBody(req);

  /* ───── API Auth Google Login ───── */
  if (req.url === "/api/auth/google-login") {
    const { accessToken } = data;
    if (!accessToken) return res.status(400).json({ error: "accessToken requerido" });

    const oauth2Client = getOAuth2Client();
    if (!oauth2Client) {
      console.error("[Vercel Auth] GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no configurados");
      return res.status(500).json({ error: "Google OAuth no está configurado en el servidor" });
    }

    try {
      oauth2Client.setCredentials({ access_token: accessToken });
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      const email = userInfo.data.email;
      const name = userInfo.data.name || email?.split("@")[0] || "User";

      if (!email) return res.status(400).json({ error: "No se pudo obtener el email" });

      let isNew = false;
      try {
        const result = await checkOrCreateUser(email, name);
        isNew = result.isNew;
      } catch (sheetsErr: any) {
        console.warn("[Vercel Auth] Sheets no disponible, login continúa:", sheetsErr.message);
      }
      try {
        await registerLog(email, "LOGIN");
      } catch (sheetsErr: any) {
        console.warn("[Vercel Auth] No se pudo registrar log en Sheets:", sheetsErr.message);
      }

      let role = "ALUMNO";
      if (email.endsWith("@directivo.teclingo")) role = "DIRECTOR";
      else if (email.endsWith("@docente.teclingo")) role = "DOCENTE";

      return res.status(200).json({ email, name, picture: userInfo.data.picture, role, isNew });
    } catch (error: any) {
      const isAuthError = error.message?.includes("Token") || error.message?.includes("credential");
      console.error("[Vercel Auth] google-login error:", {
        message: error.message,
        status: error?.response?.status,
        data: error?.response?.data,
        stack: error.stack?.split("\n").slice(0, 3).join("\n") || error.stack,
      });
      return res.status(isAuthError ? 401 : 500).json({ error: error.message || "Error de autenticación" });
    }
  }

  /* ───── API Auth Google One Tap ───── */
  if (req.url === "/api/auth/google-one-tap") {
    const { credential } = data;
    if (!credential) return res.status(400).json({ error: "Credencial requerida" });

    const oauth2Client = getOAuth2Client();
    if (!oauth2Client) {
      console.error("[Vercel Auth] GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no configurados");
      return res.status(500).json({ error: "Google OAuth no está configurado en el servidor" });
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
      const name = payload.name || email?.split("@")[0] || "User";

      let isNew = false;
      try {
        const result = await checkOrCreateUser(email, name);
        isNew = result.isNew;
      } catch (sheetsErr: any) {
        console.warn("[Vercel Auth] Sheets no disponible, login continúa:", sheetsErr.message);
      }
      try {
        await registerLog(email, "LOGIN");
      } catch (sheetsErr: any) {
        console.warn("[Vercel Auth] No se pudo registrar log en Sheets:", sheetsErr.message);
      }

      let role = "ALUMNO";
      if (email.endsWith("@directivo.teclingo")) role = "DIRECTOR";
      else if (email.endsWith("@docente.teclingo")) role = "DOCENTE";

      return res.status(200).json({ email, name, picture: payload.picture, role, isNew });
    } catch (error: any) {
      console.error("Error crítico en One Tap:", error);
      return res.status(200).json({
        success: false,
        error: error.message || "Error interno encapsulado",
        stack: error.stack
      });
    }
  }

  /* ───── API Auth Logout ───── */
  if (req.url === "/api/auth/logout") {
    try {
      if (data.email) await registerLog(data.email, "LOGOUT");
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Error al cerrar sesión" });
    }
  }

  /* ───── API Grades ───── */
  if (req.url === "/api/grades") {
    const { email, modulo, herramienta, calificacion, tokensUsados } = data;
    if (!email || !modulo || !herramienta || calificacion === undefined) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }
    const score = Number(calificacion);
    if (isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({ error: "calificacion debe ser 0-100" });
    }
    try {
      await saveGrade(email, modulo, herramienta, score, tokensUsados ? Number(tokensUsados) : 0);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Error al guardar calificación" });
    }
  }

  /* ───── API TTS ───── */
  if (req.url === "/api/tts") {
    const { text } = data;
    if (!text) return res.status(400).json({ error: "Text is required" });
    try {
      const q = encodeURIComponent(text.slice(0, 200));
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${q}&tl=en&total=1&idx=0&textlen=${text.length}&client=tw-ob&prev=input&ttsspeed=1`;
      const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!response.ok) return res.status(502).json({ error: "TTS upstream failed" });
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      res.setHeader("Content-Type", "audio/mpeg");
      return res.status(200).send(audioBuffer);
    } catch (error) {
      console.error("[TTS] Error:", error);
      return res.status(500).json({ error: "TTS failed" });
    }
  }

  /* ───── API Tutor ───── */
  if (req.url === "/api/tutor") {
    const { message, history, systemPrompt, temperature, maxTokens } = data;
    if (!message) return res.status(400).json({ error: "Message is required" });
    try {
      const messages: any[] = [
        { role: "system", content: systemPrompt || "You are TECLINGO, an English tutor." }
      ];
      if (Array.isArray(history)) {
        history.forEach((h: any) => {
          if (h.role && h.parts) messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.parts.map((p: any) => p.text || "").join(" ") });
        });
      }
      messages.push({ role: "user", content: message });
      const result = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: messages as any,
        temperature: temperature !== undefined ? temperature : 0.7,
        max_tokens: maxTokens !== undefined ? maxTokens : 256,
      });
      const content = result.choices[0]?.message?.content || "Lo siento, no pude procesar.";
      return res.status(200).json({ content, sources: [] });
    } catch (error: any) {
      console.error("[Tutor] Error:", error);
      return res.status(200).json({ content: "An error occurred. Please try again.", fallback: true });
    }
  }

  /* ───── API Grammar Analyze ───── */
  if (req.url === "/api/grammar/analyze") {
    const { text, expertMode } = data;
    if (!text) return res.status(400).json({ error: "Text is required" });
    try {
      const prompt = expertMode
        ? `Analyze this English text for advanced style. Provide: 1. Quality score (0-100). 2. CEFR level (A1-C2). 3. Advanced style suggestion. Text: "${text}"`
        : `Analyze this English text. Provide: 1. Quality score (0-100). 2. CEFR level (A1-C2). 3. Brief style suggestion. Text: "${text}"`;
      const result = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: `You are an English grammar analyzer. Always respond with valid JSON: { "score": number (0-100), "cefr": string (A1/A2/B1/B2/C1/C2), "suggestion": string }. Output ONLY the JSON.` },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });
      const text2 = result.choices[0]?.message?.content;
      if (text2) return res.status(200).json(JSON.parse(text2));
      return res.status(200).json({ score: 75, cefr: "B1", suggestion: "Good effort." });
    } catch (error) {
      console.error("[Grammar Analyze] Error:", error);
      const sample = text.trim();
      let score = 80, cefr = "A2", suggestion = "Good work!";
      if (sample.length < 15) { score = 70; cefr = "A1"; suggestion = "Add more details."; }
      else if (sample.length < 40) { score = 80; cefr = "A2"; suggestion = "Try adding complexity."; }
      else if (sample.length < 80) { score = 85; cefr = "B1"; suggestion = "Nice structure!"; }
      else if (sample.length < 120) { score = 90; cefr = "B2"; suggestion = "Excellent!"; }
      else { score = 95; cefr = "C1"; suggestion = "Superb!"; }
      return res.status(200).json({ score, cefr, suggestion, fallback: true });
    }
  }

  /* ───── API Grammar Verify ───── */
  if (req.url === "/api/grammar/verify") {
    const { spanish, studentEnglish, targetEnglish } = data;
    try {
      const prompt = `Evaluate the translation. Spanish: "${spanish}". Student: "${studentEnglish}". Reference: "${targetEnglish}"`;
      const result = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: `You are an evaluator. Respond with JSON: { "score": number (0-100), "details": string }. Only JSON.` },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });
      const text2 = result.choices[0]?.message?.content;
      if (text2) return res.status(200).json(JSON.parse(text2));
      return res.status(200).json({ score: 70, details: "Revisa la concordancia verbal." });
    } catch (error) {
      console.error("[Grammar Verify] Error:", error);
      const cleanStudent = (studentEnglish || "").toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
      const cleanTarget = (targetEnglish || "").toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
      if (cleanStudent === cleanTarget) return res.status(200).json({ score: 100, details: "Perfect!", fallback: true });
      const sWords = cleanStudent.split(/\s+/);
      const tWords = cleanTarget.split(/\s+/);
      const matches = tWords.filter((w: string) => sWords.includes(w)).length;
      const score = Math.max(30, Math.round((matches / Math.max(tWords.length, 1)) * 100));
      let details = `${Math.round((matches / Math.max(tWords.length, 1)) * 100)}% match with "${targetEnglish}".`;
      if (score >= 90) details += " Excellent!";
      else if (score >= 70) details += " Check word order.";
      else details += " Compare with the reference.";
      return res.status(200).json({ score, details, fallback: true });
    }
  }

  return res.status(404).json({ error: "Not found" });
}
