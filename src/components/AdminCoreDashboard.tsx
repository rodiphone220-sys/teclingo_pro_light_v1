import { useState, useEffect, createContext, useContext, Fragment, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  Database,
  Sliders,
  Shield,
  Waves,
  TestTube,
  Bot,
  Headphones,
  SpellCheck,
  ChevronDown,
  ChevronRight,
  Zap,
  RefreshCw,
  Gauge,
  BookOpen,
  Mic,
  PenTool,
  FileText,
} from 'lucide-react';

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
  '\n\nSTRICT RESTRICTION: Do not answer under any circumstance in Spanish. Conduct 100% of the interaction in English.';

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

type McerLevel = 'A1-A2' | 'B1-B2' | 'C1-C2';

interface McerPreset {
  temperature: number;
  maxTokens: number;
  voiceSpeed: number;
}

const MCER_BASE: Record<McerLevel, McerPreset> = {
  'A1-A2': { temperature: 0.3, maxTokens: 128, voiceSpeed: 0.65 },
  'B1-B2': { temperature: 0.6, maxTokens: 256, voiceSpeed: 0.88 },
  'C1-C2': { temperature: 0.85, maxTokens: 512, voiceSpeed: 1.15 },
};

const MCER_PROMPTS: Record<ToolId, Record<McerLevel, string>> = {
  safezone: {
    'A1-A2':
      'You are SafePal, a patient beginner-level English tutor for Spanish speakers. Use extremely simple words and very short sentences (1 line maximum). Speak slowly and repeat key phrases. Celebrate every small success.\n\nPERSONALIZATION: The student enjoys {actividad_preferida}, uses {red_social}, and likes {entretenimiento}. The student\'s companion type is {companion_type}.',
    'B1-B2':
      'You are SafePal, an intermediate English tutor for Spanish speakers. Use moderate vocabulary and natural sentence flow (2-3 lines). Introduce common idioms gradually and challenge the student slightly.\n\nPERSONALIZATION: The student enjoys {actividad_preferida}, uses {red_social}, and likes {entretenimiento}. The student\'s companion type is {companion_type}.',
    'C1-C2':
      'You are SafePal, an advanced English coach for Spanish speakers. Use sophisticated vocabulary, complex sentence structures, and native speech patterns. Challenge with abstract topics and nuanced expressions.\n\nPERSONALIZATION: The student enjoys {actividad_preferida}, uses {red_social}, and likes {entretenimiento}. The student\'s companion type is {companion_type}.',
  },
  bridge: {
    'A1-A2':
      'You are a beginner pronunciation coach for Spanish speakers. Focus on basic phonemes, simple words, and syllable-by-syllable accuracy. Keep feedback encouraging and brief.',
    'B1-B2':
      'You are an intermediate pronunciation coach. Analyze word-level stress, intonation patterns, and connected speech. Provide constructive and clear feedback.',
    'C1-C2':
      'You are an advanced pronunciation coach. Focus on nuanced phonetics, rhythm, reduction patterns, and natural prosody. Demand high precision in delivery.',
  },
  testmaker: {
    'A1-A2':
      'You are an A1-A2 English test generator. Create basic vocabulary and simple grammar questions. Use only CEFR A1-A2 level content with clear instructions.',
    'B1-B2':
      'You are a B1-B2 English test generator. Create intermediate comprehension and grammar questions with moderate complexity and contextual scenarios.',
    'C1-C2':
      'You are a C1-C2 English test generator. Create advanced questions requiring sophisticated analysis, inference, and nuanced understanding of complex texts.',
  },
  tutor: {
    'A1-A2':
      'You are a beginner academic English tutor. Explain grammar concepts simply with basic examples and minimal jargon. Prioritize clarity above all.',
    'B1-B2':
      'You are an intermediate academic English tutor. Provide detailed grammar explanations with moderate complexity and practical real-world examples.',
    'C1-C2':
      'You are an advanced academic English tutor. Give sophisticated explanations with nuanced examples and references to advanced grammatical concepts.',
  },
  listening: {
    'A1-A2':
      'You are a beginner listening coach. Use extremely clear speech, basic vocabulary, and simple sentence structures. Focus on word-by-word recognition.',
    'B1-B2':
      'You are an intermediate listening coach. Use natural-paced speech with moderate vocabulary and common expressions at B1-B2 level.',
    'C1-C2':
      'You are an advanced listening coach. Use authentic fast-paced speech with colloquialisms, idioms, and complex grammatical constructions.',
  },
  grammar: {
    'A1-A2':
      'You are a beginner grammar analyzer. Focus on basic tenses, simple sentence construction, and fundamental grammatical rules for A1-A2 level.',
    'B1-B2':
      'You are an intermediate grammar analyzer. Identify tense consistency, conditional structures, and moderate complexity errors in written text.',
    'C1-C2':
      'You are an advanced grammar analyzer. Detect subtle errors in complex structures, subjunctive mood, and sophisticated grammatical constructions.',
  },
};

/* ------------------------------------------------------------------ */
/*  CONTEXT + PROVIDER                                                 */
/* ------------------------------------------------------------------ */

interface AiToolsConfigContextType {
  config: AiToolsConfig;
  updateConfig: (toolId: ToolId, partial: Partial<AiToolConfig>) => void;
  resetConfig: (toolId: ToolId) => void;
  tolerance: SkillToleranceMatrix;
  setTolerance: (skill: SkillId, level: ToleranceLevel) => void;
}

const AiToolsConfigCtx = createContext<AiToolsConfigContextType | null>(null);

export function AiToolsConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AiToolsConfig>(() => {
    const saved = localStorage.getItem('admin_ai_tools_config');
    if (!saved) return DEFAULT_AI_CONFIG;
    const parsed = JSON.parse(saved);
    const merged: AiToolsConfig = { ...DEFAULT_AI_CONFIG };
    for (const toolId of Object.keys(DEFAULT_AI_CONFIG) as ToolId[]) {
      merged[toolId] = { ...merged[toolId], ...parsed[toolId] };
    }
    return merged;
  });

  const [tolerance, setToleranceState] = useState<SkillToleranceMatrix>(() => {
    const saved = localStorage.getItem('admin_tolerance_matrix');
    return saved ? JSON.parse(saved) : DEFAULT_TOLERANCE_MATRIX;
  });

  const updateConfig = (toolId: ToolId, partial: Partial<AiToolConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, [toolId]: { ...prev[toolId], ...partial } };
      localStorage.setItem('admin_ai_tools_config', JSON.stringify(next));
      return next;
    });
  };

  const resetConfig = (toolId: ToolId) => {
    setConfig((prev) => {
      const next = { ...prev, [toolId]: { ...DEFAULT_AI_CONFIG[toolId] } };
      localStorage.setItem('admin_ai_tools_config', JSON.stringify(next));
      return next;
    });
  };

  const setTolerance = (skill: SkillId, level: ToleranceLevel) => {
    setToleranceState((prev) => {
      const next = { ...prev, [skill]: level };
      localStorage.setItem('admin_tolerance_matrix', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AiToolsConfigCtx.Provider
      value={{ config, updateConfig, resetConfig, tolerance, setTolerance }}
    >
      {children}
    </AiToolsConfigCtx.Provider>
  );
}

export function useAiToolsConfig(): AiToolsConfigContextType {
  const ctx = useContext(AiToolsConfigCtx);
  if (!ctx) throw new Error('useAiToolsConfig must be used within AiToolsConfigProvider');
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  INTERNAL DATA                                                      */
/* ------------------------------------------------------------------ */

type AdminTab = 'cognitive' | 'workbook' | 'tuning';

interface ToolMeta {
  id: ToolId;
  title: string;
  icon: any;
}

const TOOL_META: Record<ToolId, ToolMeta> = {
  safezone: { id: 'safezone', title: 'SafeZone Chat', icon: Shield },
  bridge: { id: 'bridge', title: 'The Bridge', icon: Waves },
  testmaker: { id: 'testmaker', title: 'Test Maker', icon: TestTube },
  tutor: { id: 'tutor', title: 'AI Tutor', icon: Bot },
  listening: { id: 'listening', title: 'Listening Lab', icon: Headphones },
  grammar: { id: 'grammar', title: 'Grammar Fixer', icon: SpellCheck },
};

const CATEGORIES: { id: string; label: string; icon: string; tools: ToolId[] }[] = [
  { id: 'interaction', label: 'INTERACCIÓN', icon: '🎙️', tools: ['bridge', 'listening'] },
  { id: 'technical', label: 'DOMINIO TÉCNICO', icon: '📝', tools: ['grammar', 'testmaker'] },
  { id: 'lab', label: 'LABORATORIO EXCLUSIVO', icon: '🤖', tools: ['safezone', 'tutor'] },
];

const SKILL_LABELS: Record<SkillId, string> = {
  speaking: 'Speaking',
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  grammar: 'Grammar',
};

const SKILL_ICONS: Record<SkillId, any> = {
  speaking: Mic,
  listening: Headphones,
  reading: BookOpen,
  writing: PenTool,
  grammar: SpellCheck,
};

const TOLERANCE_OPTIONS: { value: ToleranceLevel; label: string; desc: string }[] = [
  { value: 'permisivo', label: 'Permisivo', desc: 'Máxima flexibilidad. La IA alienta incluso con errores significativos.' },
  { value: 'balanceado', label: 'Balanceado', desc: 'Corrige con equilibrio entre precisión y motivación.' },
  { value: 'implacable', label: 'Implacable', desc: 'Exigencia total. Solo respuestas óptimas son validadas.' },
];

const MOCK_WORKBOOK_ENTRIES = Array.from({ length: 18 }, (_, i) => ({
  week: i + 1,
  speaking: `Unit ${i + 1}: Role-play & dialogue practice`,
  listening: `Dictation exercise set ${i + 1}`,
  reading: `Comprehension passage ${i + 1}`,
  writing: `Prompt-based essay ${i + 1}`,
  grammar: `Grammar focus: ${['Present Simple', 'Past Continuous', 'Present Perfect', 'Conditionals', 'Passive Voice', 'Reported Speech', 'Modal Verbs', 'Relative Clauses', 'Phrasal Verbs', 'Future Forms', 'Past Perfect', 'Subjunctive', 'Causative', 'Inversion', 'Collocations', 'Discourse Markers', 'Emphasis', 'Review'][i]}`,
}));

/* ------------------------------------------------------------------ */
/*  SUB-COMPONENTS                                                     */
/* ------------------------------------------------------------------ */

function ToolConfigCard({ toolId }: { toolId: ToolId }) {
  const { config, updateConfig } = useAiToolsConfig();
  const [expanded, setExpanded] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const meta = TOOL_META[toolId];
  const cfg = config[toolId];
  const Icon = meta.icon;

  const [localCfg, setLocalCfg] = useState<AiToolConfig>({ ...cfg });

  useEffect(() => {
    setLocalCfg({ ...cfg });
  }, [cfg.temperature, cfg.maxTokens, cfg.voiceSpeed, cfg.enableJsonResponses]);

  const isDirty =
    localCfg.systemPrompt !== cfg.systemPrompt ||
    localCfg.temperature !== cfg.temperature ||
    localCfg.maxTokens !== cfg.maxTokens ||
    localCfg.voiceSpeed !== cfg.voiceSpeed ||
    localCfg.enableJsonResponses !== cfg.enableJsonResponses;

  const handleSave = () => {
    updateConfig(toolId, localCfg);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  return (
    <motion.div
      layout
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-white/[0.10]"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <Icon size={16} className="text-white/70" />
          </div>
          <div>
            <span className="text-[12px] font-black uppercase tracking-tight text-white">
              {meta.title}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[8px] font-mono text-white/30">
                T:{localCfg.temperature.toFixed(1)} · TK:{localCfg.maxTokens} · VS:{localCfg.voiceSpeed.toFixed(2)}
              </span>
              {isDirty && (
                <span className="text-[7px] font-mono font-bold text-amber-400/80 uppercase tracking-wider">
                  ● Cambios sin guardar
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronDown size={14} className="text-white/40 shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-white/40 shrink-0" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-white/[0.04] pt-4">
              {/* MCER Presets */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-mono font-bold uppercase tracking-wider text-white/30">
                  Presets por Nivel MCER
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['A1-A2', 'B1-B2', 'C1-C2'] as McerLevel[]).map((level) => {
                    const base = MCER_BASE[level];
                    const prompt = MCER_PROMPTS[toolId][level];
                    return (
                      <motion.button
                        key={level}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() =>
                          setLocalCfg({
                            systemPrompt: prompt + LANG_LOCK,
                            temperature: base.temperature,
                            maxTokens: base.maxTokens,
                            voiceSpeed: base.voiceSpeed,
                            enableJsonResponses: localCfg.enableJsonResponses,
                          })
                        }
                        className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                          localCfg.temperature === base.temperature &&
                          localCfg.maxTokens === base.maxTokens
                            ? 'border-[#DEFF9A]/40 bg-[#DEFF9A]/10 text-[#DEFF9A]'
                            : 'border-white/[0.06] text-white/40 hover:border-white/[0.15] hover:text-white/70'
                        }`}
                      >
                        {level === 'A1-A2' && '🎙️ '}
                        {level === 'B1-B2' && '📝 '}
                        {level === 'C1-C2' && '🚀 '}
                        {level}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-white/40">
                  System Prompt
                </label>
                <textarea
                  value={localCfg.systemPrompt}
                  onChange={(e) => setLocalCfg((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2 text-[11px] font-mono leading-relaxed text-emerald-400/90 placeholder:text-white/20 resize-y focus:outline-none focus:border-[#DEFF9A]/30 transition-colors"
                />
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SliderField
                  label="Temperatura"
                  value={localCfg.temperature}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setLocalCfg((prev) => ({ ...prev, temperature: v }))}
                  formatLabel={`${localCfg.temperature.toFixed(2)}`}
                  hint="Creatividad vs. Rigidez"
                />
                <SliderField
                  label="Max Tokens"
                  value={localCfg.maxTokens}
                  min={64}
                  max={1024}
                  step={16}
                  onChange={(v) => setLocalCfg((prev) => ({ ...prev, maxTokens: v }))}
                  formatLabel={`${localCfg.maxTokens}`}
                  hint="Longitud de respuesta"
                />
                <SliderField
                  label="Voice Speed"
                  value={localCfg.voiceSpeed}
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  onChange={(v) => setLocalCfg((prev) => ({ ...prev, voiceSpeed: v }))}
                  formatLabel={`${localCfg.voiceSpeed.toFixed(2)}x`}
                  hint="ElevenLabs TTS"
                />
              </div>

              {/* JSON Quick Responses Toggle */}
              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-tight text-white/70">
                    Sugerencias de Respuesta Rápida
                  </span>
                  <span className="block text-[8px] font-mono font-bold text-white/30 uppercase tracking-wider">
                    Formato JSON
                  </span>
                </div>
                <button
                  onClick={() =>
                    setLocalCfg((prev) => ({ ...prev, enableJsonResponses: !prev.enableJsonResponses }))
                  }
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                    localCfg.enableJsonResponses
                      ? 'bg-gradient-to-r from-cyan-500/40 to-[#DEFF9A]/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : 'bg-white/10'
                  }`}
                >
                  <motion.div
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm ${
                      localCfg.enableJsonResponses ? 'left-[26px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Bottom row: Reset + Save */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  onClick={() =>
                    setLocalCfg({ ...DEFAULT_AI_CONFIG[toolId] })
                  }
                  className="text-[9px] font-mono font-bold uppercase tracking-wider text-white/30 hover:text-red-400/80 transition-colors"
                >
                  ↺ Restaurar valores por defecto
                </button>

                <motion.button
                  whileHover={isDirty ? { scale: 1.02 } : {}}
                  whileTap={isDirty ? { scale: 0.98 } : {}}
                  onClick={handleSave}
                  disabled={!isDirty}
                  className={`px-5 py-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all duration-300 ${
                    saveFeedback
                      ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                      : isDirty
                        ? 'bg-white/5 border-white/15 text-white hover:bg-[#DEFF9A]/10 hover:border-[#DEFF9A]/40 hover:text-[#DEFF9A]'
                        : 'bg-white/[0.02] border-white/[0.04] text-white/20 cursor-not-allowed'
                  } border`}
                >
                  {saveFeedback ? '✅ ¡PROMPT GUARDADO CON ÉXITO!' : '💾 GUARDAR CAMBIOS'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatLabel,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatLabel: string;
  hint: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-white/50">
          {label}
        </span>
        <span className="text-[10px] font-mono font-black text-[#DEFF9A]/80">{formatLabel}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#DEFF9A] h-1 bg-white/10 rounded-lg cursor-pointer"
      />
      <div className="flex justify-between text-[7px] font-mono text-white/20 uppercase tracking-widest">
        <span>{min}</span>
        <span>{hint}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function ToleranceSelector({
  skill,
  value,
  onChange,
}: {
  skill: SkillId;
  value: ToleranceLevel;
  onChange: (level: ToleranceLevel) => void;
}) {
  const Icon = SKILL_ICONS[skill];
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          <Icon size={16} className="text-white/70" />
        </div>
        <span className="text-[12px] font-black uppercase tracking-tight text-white">
          {SKILL_LABELS[skill]}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {TOLERANCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
              value === opt.value
                ? 'bg-gradient-to-r from-cyan-500/15 via-[#DEFF9A]/15 to-cyan-500/15 border-[#DEFF9A]/30 text-white shadow-[0_0_12px_rgba(222,255,154,0.08)]'
                : 'border-white/[0.06] text-white/40 hover:border-white/[0.12] hover:text-white/70'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-[9px] font-mono text-white/30 leading-relaxed">
        {TOLERANCE_OPTIONS.find((o) => o.value === value)?.desc}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

export default function AdminCoreDashboard({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('cognitive');
  const [newDictationInput, setNewDictationInput] = useState('');
  const [newTestInput, setNewTestInput] = useState('');
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  };

  const TABS: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'cognitive', label: 'Configuración de Modelos de IA', icon: Brain },
    { id: 'workbook', label: 'Workbook & Data Manager', icon: Database },
    { id: 'tuning', label: 'Matriz de Tolerancia a Errores', icon: Gauge },
  ];

  return (
    <div className="min-h-screen bg-[#061a1a] text-white font-sans selection:bg-[#DEFF9A] selection:text-black">
      <div className="relative">
        {/* Background decorative elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#DEFF9A]/[0.015] blur-[120px]" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.015] blur-[100px]" />
        </div>

        {/* Header */}
        <header className="relative z-10 pt-8 pb-6 px-6 md:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#DEFF9A]/10 border border-[#DEFF9A]/20 flex items-center justify-center">
                  <Zap size={20} className="text-[#DEFF9A]" fill="currentColor" />
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight uppercase">
                    ADMIN <span className="text-[#DEFF9A]">CORE DASHBOARD</span>
                  </h1>
                  <p className="text-[8px] font-mono font-bold text-white/30 tracking-[0.3em] uppercase">
                    Panel de Control Maestro · Calibración de Herramientas de IA
                  </p>
                </div>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  ← VOLVER AL HUB
                </button>
              )}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        </header>

        {/* Sub-tab Navigation */}
        <nav className="relative z-10 px-6 md:px-12 mb-8">
          <div className="max-w-7xl mx-auto flex justify-center">
            <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-400/15 via-[#DEFF9A]/15 to-cyan-400/15 border border-[#DEFF9A]/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                        : 'text-white/35 border border-transparent hover:text-white/60 hover:bg-white/[0.03]'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="relative z-10 px-6 md:px-12 pb-24">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                {activeTab === 'cognitive' && <CognitiveHub />}
                {activeTab === 'workbook' && (
                  <WorkbookPanel
                    newDictationInput={newDictationInput}
                    setNewDictationInput={setNewDictationInput}
                    newTestInput={newTestInput}
                    setNewTestInput={setNewTestInput}
                    syncing={syncing}
                    onSync={handleSync}
                  />
                )}
                {activeTab === 'tuning' && <TuningPanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB PANELS                                                         */
/* ------------------------------------------------------------------ */

function CognitiveHub() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {CATEGORIES.map((cat) => (
        <div key={cat.id} className="space-y-3">
          <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-white/30 flex items-center gap-2">
            <span>{cat.icon}</span>
            {cat.label}
          </h3>
          <div className="space-y-2">
            {cat.tools.map((toolId) => (
              <Fragment key={toolId}>
                <ToolConfigCard toolId={toolId} />
              </Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkbookPanel({
  newDictationInput,
  setNewDictationInput,
  newTestInput,
  setNewTestInput,
  syncing,
  onSync,
}: {
  newDictationInput: string;
  setNewDictationInput: (v: string) => void;
  newTestInput: string;
  setNewTestInput: (v: string) => void;
  syncing: boolean;
  onSync: () => void;
}) {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header info */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-cyan-400" />
          <span className="text-[11px] font-black uppercase tracking-wider text-white">
            Google Apps Script · Sync Hub
          </span>
        </div>
        <p className="text-[10px] font-mono text-white/40 leading-relaxed">
          Panel de sincronización con la base de datos del Workbook. Los cambios se reflejan en
          tiempo real en el plan de estudios de 18 semanas distribuidas por las 5 habilidades
          del Marco Común Europeo.
        </p>
      </div>

      {/* Table preview */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="sticky left-0 bg-[#061a1a] px-3 py-2.5 text-[8px] font-mono font-bold uppercase tracking-wider text-white/40 whitespace-nowrap">
                  Sem
                </th>
                {(['speaking', 'listening', 'reading', 'writing', 'grammar'] as SkillId[]).map(
                  (s) => (
                    <th
                      key={s}
                      className="px-3 py-2.5 text-[8px] font-mono font-bold uppercase tracking-wider text-white/40 whitespace-nowrap"
                    >
                      {SKILL_LABELS[s]}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {MOCK_WORKBOOK_ENTRIES.map((entry) => (
                <tr
                  key={entry.week}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="sticky left-0 bg-[#061a1a] px-3 py-2 text-[10px] font-mono font-bold text-white/50 whitespace-nowrap">
                    W{String(entry.week).padStart(2, '0')}
                  </td>
                  <td className="px-3 py-2 text-[9px] font-mono text-white/50">{entry.speaking}</td>
                  <td className="px-3 py-2 text-[9px] font-mono text-white/50">{entry.listening}</td>
                  <td className="px-3 py-2 text-[9px] font-mono text-white/50">{entry.reading}</td>
                  <td className="px-3 py-2 text-[9px] font-mono text-white/50">{entry.writing}</td>
                  <td className="px-3 py-2 text-[9px] font-mono text-white/50">{entry.grammar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add material inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Headphones size={14} className="text-rose-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white/80">
              Nuevo Dictado · Listening Lab
            </span>
          </div>
          <textarea
            value={newDictationInput}
            onChange={(e) => setNewDictationInput(e.target.value)}
            placeholder="Escribe la frase para el banco de dictados..."
            rows={2}
            className="w-full rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2 text-[11px] font-mono text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-[#DEFF9A]/30 transition-colors"
          />
          <button className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400/90 text-[9px] font-black uppercase tracking-wider hover:bg-rose-500/20 transition-colors">
            + Insertar al banco de dictados
          </button>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TestTube size={14} className="text-violet-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white/80">
              Nuevo Reactivo · Test Maker
            </span>
          </div>
          <textarea
            value={newTestInput}
            onChange={(e) => setNewTestInput(e.target.value)}
            placeholder="Redacta la pregunta y las opciones de respuesta..."
            rows={2}
            className="w-full rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2 text-[11px] font-mono text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-[#DEFF9A]/30 transition-colors"
          />
          <button className="px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400/90 text-[9px] font-black uppercase tracking-wider hover:bg-violet-500/20 transition-colors">
            + Insertar al banco de reactivos
          </button>
        </div>
      </div>

      {/* Sync button */}
      <div className="flex justify-center">
        <motion.button
          onClick={onSync}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
            syncing
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
              : 'bg-gradient-to-r from-cyan-500/15 via-[#DEFF9A]/15 to-cyan-500/15 border border-[#DEFF9A]/25 text-white hover:shadow-[0_0_30px_rgba(222,255,154,0.1)]'
          }`}
        >
          <motion.span
            animate={syncing ? { rotate: 360 } : {}}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          >
            <RefreshCw size={16} />
          </motion.span>
          {syncing ? 'SINCRONIZANDO...' : '🔴 SINCRONIZAR BASE DE DATOS (APPS SCRIPT)'}
        </motion.button>
      </div>
    </div>
  );
}

function TuningPanel() {
  const { tolerance, setTolerance } = useAiToolsConfig();
  const skills: SkillId[] = ['speaking', 'listening', 'reading', 'writing', 'grammar'];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Gauge size={16} className="text-cyan-400" />
          <span className="text-[11px] font-black uppercase tracking-wider text-white">
            Política de Tolerancia a Errores
          </span>
        </div>
        <p className="text-[10px] font-mono text-white/40 leading-relaxed">
          Define qué tan estricta será la inteligencia artificial al evaluar el desempeño del
          alumno en cada habilidad. Ajusta el nivel de exigencia por competencia lingüística.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills.map((skill) => (
          <Fragment key={skill}>
            <ToleranceSelector
              skill={skill}
              value={tolerance[skill]}
              onChange={(level) => setTolerance(skill, level)}
            />
          </Fragment>
        ))}
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-[#DEFF9A]/70" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/60">
            Resumen de Políticas Activas
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {skills.map((skill) => {
            const level = tolerance[skill];
            const colorMap: Record<ToleranceLevel, string> = {
              permisivo: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
              balanceado: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
              implacable: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
            };
            return (
              <div
                key={skill}
                className={`px-3 py-2 rounded-xl border text-[8px] font-black uppercase tracking-wider text-center ${colorMap[level]}`}
              >
                {SKILL_LABELS[skill]}: {level}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
