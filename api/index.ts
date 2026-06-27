import Groq from "groq-sdk";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "MISSING_API_KEY" });

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET" && req.url === "/api/health") {
    return res.status(200).json({ status: "ok" });
  }

  if (req.method !== "POST") {
    return res.status(404).json({ error: "Not found" });
  }

  let body = "";
  await new Promise((resolve, reject) => {
    req.on("data", (chunk: Buffer) => body += chunk.toString());
    req.on("end", resolve);
    req.on("error", reject);
  });
  const data = JSON.parse(body || "{}");

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
