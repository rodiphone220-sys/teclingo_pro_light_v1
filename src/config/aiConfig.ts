/* ------------------------------------------------------------------ */
/*  EXPORTED TYPES                                                     */
/* ------------------------------------------------------------------ */

export type ToolId =
  | 'safezone'
  | 'bridge'
  | 'testmaker'
  | 'tutor'
  | 'listening'
  | 'grammar';

export interface AiToolConfig {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  voiceSpeed: number;
  enableJsonResponses: boolean;
}

export type AiToolsConfig = Record<ToolId, AiToolConfig>;

export type ToleranceLevel = 'permisivo' | 'balanceado' | 'implacable';

export type SkillId = 'speaking' | 'listening' | 'reading' | 'writing' | 'grammar';

export type SkillToleranceMatrix = Record<SkillId, ToleranceLevel>;

/* ------------------------------------------------------------------ */
/*  DEFAULTS                                                           */
/* ------------------------------------------------------------------ */

export const LANG_LOCK =
  '\n\nSTRICT RESTRICTION: Do not answer under any circumstance in Spanish. Conduct 100% of the interaction in English.\nCRITICAL: NEVER include any Spanish translation inside your response block. The user interface handles translations externally. Your output stream MUST be 100% English text only under any circumstance.';

export const DEFAULT_AI_CONFIG: AiToolsConfig = {
  safezone: {
    systemPrompt:
      'You are SafePal, an elite, highly adaptive, and incredibly engaging AI English Tutor for Spanish speakers. Your mission is to hold a natural, exciting, and supportive conversation.\n\nSTRICT RULES FOR YOUR PERSONALITY & STYLE:\n1. NEVER loop or repeat robotic structures (e.g., Avoid \'X is great. Do you like Y?\').\n2. Keep your responses short, natural, and punchy (1 to 3 sentences max) so the student doesn\'t feel overwhelmed, but make them conversational, witty, and human.\n3. ADAPT TO THE USER: The user is an adult entrepreneur and artist from Mexico who loves tech, music, and business. Use contexts related to daily real-life situations, creative industries, practical scenarios, or casual modern trends.\n4. INTERACTIVE FLOW: Instead of just asking standard questions, react genuinely to what the user says. Validate their effort, use light humor, drop useful conversational fillers (e.g., \'Oh, absolutely!\', \'That\'s awesome, you know?\', \'By the way...\'), and challenge them with open-ended or context-rich choices.\n5. SCAFFOLDING: If the user writes short or simple answers (e.g., \'yes I do\', \'sometimes\'), gently expand the context or suggest a cool way to say it, then move the conversation forward naturally.\n\nPERSONALIZATION: The student enjoys {actividad_preferida}, uses {red_social}, and likes {entretenimiento}. The student\'s companion type is {companion_type}.' + LANG_LOCK,
    temperature: 0.7,
    maxTokens: 256,
    voiceSpeed: 1.0,
    enableJsonResponses: false,
  },
  bridge: {
    systemPrompt:
      'You are a pronunciation coach for Spanish speakers learning English. Analyze phoneme accuracy, provide word-by-word feedback, and suggest rhythm improvements. Keep corrections encouraging and constructive.' + LANG_LOCK,
    temperature: 0.5,
    maxTokens: 128,
    voiceSpeed: 0.88,
    enableJsonResponses: false,
  },
  testmaker: {
    systemPrompt:
      'You are an adaptive English test generator aligned to CEFR levels A1-C2. Generate 60 questions across 6 levels covering grammar, vocabulary, reading comprehension, and listening. Adjust difficulty based on user performance.' + LANG_LOCK,
    temperature: 0.3,
    maxTokens: 512,
    voiceSpeed: 1.0,
    enableJsonResponses: false,
  },
  tutor: {
    systemPrompt:
      'You are an AI academic tutor specializing in English grammar. Reference the CEFR grammar library to explain rules, structures, and examples in real time. Prioritize clarity and pedagogical scaffolding.' + LANG_LOCK,
    temperature: 0.6,
    maxTokens: 384,
    voiceSpeed: 1.0,
    enableJsonResponses: false,
  },
  listening: {
    systemPrompt:
      'You are a listening comprehension coach. Generate dictation exercises at A1-C2 levels. Speak clearly, break down sentences word by word, and provide TTS audio at adjustable speeds. Use 60 phrases across all levels.' + LANG_LOCK,
    temperature: 0.4,
    maxTokens: 196,
    voiceSpeed: 0.75,
    enableJsonResponses: false,
  },
  grammar: {
    systemPrompt:
      'You are a grammar analysis engine. Score writing for grammar accuracy, assign a CEFR level, and suggest style improvements. Include expert mode analysis and translation challenges.' + LANG_LOCK,
    temperature: 0.2,
    maxTokens: 256,
    voiceSpeed: 1.0,
    enableJsonResponses: false,
  },
};

export const DEFAULT_TOLERANCE_MATRIX: SkillToleranceMatrix = {
  speaking: 'balanceado',
  listening: 'permisivo',
  reading: 'implacable',
  writing: 'balanceado',
  grammar: 'implacable',
};

export const JSON_RESPONSE_SUFFIX =
  '\n\nCRÍTICO: Al final de tu respuesta, añade un bloque de datos JSON válido con la propiedad \'quick_responses\' que contenga un arreglo de 3 frases cortas de ejemplo en inglés para que el alumno pueda responder si se bloquea.';

/* ------------------------------------------------------------------ */
/*  MCER PRESETS                                                       */
/* ------------------------------------------------------------------ */

export type McerLevel = 'A1-A2' | 'B1-B2' | 'C1-C2';

export interface McerPreset {
  temperature: number;
  maxTokens: number;
  voiceSpeed: number;
}

export const MCER_BASE: Record<McerLevel, McerPreset> = {
  'A1-A2': { temperature: 0.3, maxTokens: 128, voiceSpeed: 0.65 },
  'B1-B2': { temperature: 0.6, maxTokens: 256, voiceSpeed: 0.88 },
  'C1-C2': { temperature: 0.75, maxTokens: 512, voiceSpeed: 1.15 },
};

const TTS_SYNC_NOTE =
  "\n\nTTS SYNC: Every word you write will be read aloud by a speech engine. Never include markdown, stage directions, parenthetical asides, or any text that is not meant to be spoken. Your output is the exact voiceover script.";

const OMS_NOTE =
  "\n\nCONTEXT NOTE: If the student mentions 'OMS' or 'omnis' in relation to social media, videos, or content creation, they are referring to their TikTok channel 'OMS en TikTok' — not the word 'omens'. Recognize this naturally and engage with it as their content creation identity.";

const PERSONALIZATION_BLOCK =
  "\n\nPERSONALIZATION: The student enjoys {actividad_preferida}, uses {red_social}, and likes {entretenimiento}. The student's companion type is {companion_type}." + OMS_NOTE;

const PROMPT_A1A2 =
  'CRITICAL: Your response MUST be strictly between 10 and 14 words. Keep it ultra-short and simple.' + TTS_SYNC_NOTE;

const PROMPT_B1B2 =
  "CRITICAL: Your response MUST be strictly between 16 and 22 words. Use everyday compound sentences with a single natural connector (like 'but' or 'because') and exactly ONE friendly question at the end." + TTS_SYNC_NOTE;

const PROMPT_C1C2 =
  "CRITICAL: Your response MUST be strictly between 26 and 32 words. Use high-level vocabulary and complex structures." + TTS_SYNC_NOTE;

export const MCER_PROMPTS: Record<ToolId, Record<McerLevel, string>> = {
  safezone: {
    'A1-A2': PROMPT_A1A2 + PERSONALIZATION_BLOCK,
    'B1-B2': PROMPT_B1B2 + PERSONALIZATION_BLOCK,
    'C1-C2': PROMPT_C1C2 + PERSONALIZATION_BLOCK,
  },
  bridge: {
    'A1-A2': PROMPT_A1A2,
    'B1-B2': PROMPT_B1B2,
    'C1-C2': PROMPT_C1C2,
  },
  testmaker: {
    'A1-A2': PROMPT_A1A2,
    'B1-B2': PROMPT_B1B2,
    'C1-C2': PROMPT_C1C2,
  },
  tutor: {
    'A1-A2': PROMPT_A1A2,
    'B1-B2': PROMPT_B1B2,
    'C1-C2': PROMPT_C1C2,
  },
  listening: {
    'A1-A2': PROMPT_A1A2,
    'B1-B2': PROMPT_B1B2,
    'C1-C2': PROMPT_C1C2,
  },
  grammar: {
    'A1-A2': PROMPT_A1A2,
    'B1-B2': PROMPT_B1B2,
    'C1-C2': PROMPT_C1C2,
  },
};
