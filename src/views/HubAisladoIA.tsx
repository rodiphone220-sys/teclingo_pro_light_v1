import { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Waves,
  TestTube,
  Bot,
  Headphones,
  SpellCheck,
  ArrowLeft,
  Zap,
  Sparkles,
  KeyRound,
  X,
} from 'lucide-react';
import AdminCoreDashboard, { AiToolsConfigProvider } from '../components/AdminCoreDashboard';
import { SafeZoneModule } from '../components/SafeZoneModule';
import { TheBridge } from '../components/tools/TheBridge';
import { TestMaker } from '../components/tools/TestMaker';
import { AITutor } from '../components/tools/AITutor';
import { ListeningLab } from '../components/tools/ListeningLab';
import { GrammarFixer } from '../components/tools/GrammarFixer';

type ToolId =
  | 'safezone'
  | 'bridge'
  | 'testmaker'
  | 'tutor'
  | 'listening'
  | 'grammar';

interface ToolCard {
  id: ToolId;
  title: string;
  tagline: string;
  description: string;
  icon: any;
  gradient: string;
  borderAccent: string;
  buttonLabel: string;
}

const TOOLS: ToolCard[] = [
  {
    id: 'safezone',
    title: 'SafeZone Chat',
    tagline: 'ENTORNO SEGURO',
    description:
      'Práctica conversacional libre de juicios con IA emocional. Velocidad adaptable, traducciones al instante y acompañante personalizado.',
    icon: Shield,
    gradient: 'from-emerald-500/15 via-emerald-400/5 to-transparent',
    borderAccent: 'border-emerald-500/30 hover:border-emerald-400/50',
    buttonLabel: 'INGRESAR AL CHAT',
  },
  {
    id: 'bridge',
    title: 'The Bridge',
    tagline: 'INMERSIÓN & PRONUNCIACIÓN',
    description:
      'Laboratorio de pronunciación con IA. Reconocimiento de voz, fonética palabra por palabra y retroalimentación en tiempo real.',
    icon: Waves,
    gradient: 'from-cyan-500/15 via-cyan-400/5 to-transparent',
    borderAccent: 'border-cyan-500/30 hover:border-cyan-400/50',
    buttonLabel: 'VAMOS AHORA',
  },
  {
    id: 'testmaker',
    title: 'Test Maker',
    tagline: 'EVALUACIÓN ADAPTATIVA',
    description:
      'Exámenes interactivos con temporizador, diagnóstico CEFR automático y 60 preguntas distribuidas en 6 niveles de dominio.',
    icon: TestTube,
    gradient: 'from-violet-500/15 via-violet-400/5 to-transparent',
    borderAccent: 'border-violet-500/30 hover:border-violet-400/50',
    buttonLabel: 'VAMOS AHORA',
  },
  {
    id: 'tutor',
    title: 'AI Tutor',
    tagline: 'APOYO PEDAGÓGICO 24/7',
    description:
      'Tutor inteligente con biblioteca gramatical MCER integrada. Consulta reglas, estructuras y ejemplos en tiempo real.',
    icon: Bot,
    gradient: 'from-amber-500/15 via-amber-400/5 to-transparent',
    borderAccent: 'border-amber-500/30 hover:border-amber-400/50',
    buttonLabel: 'VAMOS AHORA',
  },
  {
    id: 'listening',
    title: 'Listening Lab',
    tagline: 'ENTRENAMIENTO AUDITIVO',
    description:
      'Laboratorio de escucha con dictado, análisis palabra por palabra y 60 frases en niveles A1 a C2 con audio TTS.',
    icon: Headphones,
    gradient: 'from-rose-500/15 via-rose-400/5 to-transparent',
    borderAccent: 'border-rose-500/30 hover:border-rose-400/50',
    buttonLabel: 'VAMOS AHORA',
  },
  {
    id: 'grammar',
    title: 'Grammar Fixer',
    tagline: 'CORRECTOR GRAMATICAL',
    description:
      'Analizador gramatical con puntuación, nivel CEFR y sugerencias de estilo. Incluye modo experto y retos de traducción.',
    icon: SpellCheck,
    gradient: 'from-lime-500/15 via-lime-400/5 to-transparent',
    borderAccent: 'border-lime-500/30 hover:border-lime-400/50',
    buttonLabel: 'VAMOS AHORA',
  },
];

type TabId = 'interaction' | 'technical' | 'lab';

interface TabConfig {
  id: TabId;
  label: string;
  icon: string;
  description: string;
  toolIds: ToolId[];
}

const TABS: TabConfig[] = [
  {
    id: 'interaction',
    label: 'INTERACCIÓN',
    icon: '🎙️',
    description: 'Enfoque: Fluidez auditiva y verbal en tiempo real',
    toolIds: ['bridge', 'listening'],
  },
  {
    id: 'technical',
    label: 'DOMINIO TÉCNICO',
    icon: '📝',
    description: 'Enfoque: Precisión gramatical y estructura escrita',
    toolIds: ['grammar', 'testmaker'],
  },
  {
    id: 'lab',
    label: 'LABORATORIO EXCLUSIVO',
    icon: '🤖',
    description: 'Enfoque: Conversación inmersiva y tutoría adaptativa',
    toolIds: ['safezone', 'tutor'],
  },
];

export default function HubAisladoIA() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('interaction');
  const [clickCount, setClickCount] = useState(0);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const ADMIN_PASSCODE = 'Axel2021';

  const handleClose = () => setActiveTool(null);

  const handleLogoClick = () => {
    const next = clickCount + 1;
    if (next >= 5) {
      setClickCount(0);
      setShowAdminAuthModal(true);
    } else {
      setClickCount(next);
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSCODE) {
      setShowAdminAuthModal(false);
      setAdminPassword('');
      setAuthError('');
      setShowAdminDashboard(true);
    } else {
      setAuthError('Código de acceso incorrecto. Intente nuevamente.');
    }
  };

  const handleCloseAdminDashboard = () => {
    setShowAdminDashboard(false);
  };

  const currentTab = TABS.find((t) => t.id === activeTab)!;
  const filteredTools = TOOLS.filter((tool) =>
    currentTab.toolIds.includes(tool.id),
  );

  const renderActiveTool = () => {
    if (!activeTool) return null;

    if (activeTool === 'safezone') {
      return (
        <motion.div
          key="safezone-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-[#061a1a] overflow-y-auto"
        >
          <button
            onClick={handleClose}
            className="fixed top-4 left-4 z-[300] flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-all"
          >
            <ArrowLeft size={16} />
            Volver al Hub
          </button>
          <SafeZoneModule />
        </motion.div>
      );
    }

    switch (activeTool) {
      case 'bridge':
        return <Fragment key="bridge"><TheBridge onClose={handleClose} /></Fragment>;
      case 'testmaker':
        return <Fragment key="testmaker"><TestMaker onClose={handleClose} /></Fragment>;
      case 'tutor':
        return <Fragment key="tutor"><AITutor onClose={handleClose} /></Fragment>;
      case 'listening':
        return <Fragment key="listening"><ListeningLab onClose={handleClose} /></Fragment>;
      case 'grammar':
        return <Fragment key="grammar"><GrammarFixer onClose={handleClose} /></Fragment>;
      default:
        return null;
    }
  };

  return (
    <AiToolsConfigProvider>
      {showAdminDashboard ? (
        <AdminCoreDashboard onClose={handleCloseAdminDashboard} />
      ) : (
        <div className="min-h-screen bg-[#061a1a] text-white font-sans selection:bg-[#DEFF9A] selection:text-black">
          <div className="relative">
            {/* Background decorative elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#DEFF9A]/[0.02] blur-[120px]" />
              <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.02] blur-[100px]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-emerald-500/[0.01] blur-[150px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 pt-8 pb-6 px-6 md:px-12">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={handleLogoClick}
                      className="w-10 h-10 rounded-2xl bg-[#DEFF9A]/10 border border-[#DEFF9A]/20 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                    >
                      <Zap size={20} className="text-[#DEFF9A]" fill="currentColor" />
                    </div>
                    <div>
                      <h1 className="text-lg font-black tracking-tight uppercase">
                        TECLINGO <span className="text-[#DEFF9A]">AI HUB</span>
                      </h1>
                      <p className="text-[8px] font-mono font-bold text-white/30 tracking-[0.3em] uppercase">
                        Entorno Aislado de Herramientas de Inteligencia Artificial
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#DEFF9A]/50">
                    <Sparkles size={12} />
                    <span>6 herramientas activas</span>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            </header>

            {/* Main content */}
            <main className="relative z-10 px-6 md:px-12 pb-24">
              <div className="max-w-7xl mx-auto">
                {/* Tab Navigation — Glassmorphism bar */}
                <div className="flex justify-center mb-6">
                  <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl">
                    {TABS.map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`relative px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                            isActive
                              ? 'bg-gradient-to-r from-cyan-400/15 via-[#DEFF9A]/15 to-cyan-400/15 border border-[#DEFF9A]/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                              : 'text-white/35 border border-transparent hover:text-white/60 hover:bg-white/[0.03]'
                          }`}
                        >
                          <span className="mr-1.5">{tab.icon}</span>
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dynamic category description */}
                <motion.p
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center text-[11px] font-mono font-bold text-white/25 tracking-[0.2em] uppercase mb-8"
                >
                  {currentTab.description}
                </motion.p>

                {/* Tool Grid with AnimatePresence */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto"
                  >
                    {filteredTools.map((tool, index) => {
                      const Icon = tool.icon;
                      return (
                        <motion.div
                          key={tool.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.08, duration: 0.4 }}
                          className={`group relative rounded-3xl border ${tool.borderAccent} bg-gradient-to-br ${tool.gradient} backdrop-blur-sm p-6 md:p-7 transition-all duration-500 hover:shadow-[0_0_40px_-12px_rgba(255,255,255,0.08)]`}
                        >
                          {/* Glow hover effect */}
                          <div className="absolute inset-0 rounded-3xl bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                          <div className="relative z-10 flex flex-col h-full">
                            {/* Icon */}
                            <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                              <Icon size={20} className="text-white/80" />
                            </div>

                            {/* Tagline */}
                            <span className="text-[10px] font-mono font-black text-white/30 tracking-[0.25em] uppercase mb-2">
                              {tool.tagline}
                            </span>

                            {/* Title */}
                            <h2 className="text-lg font-black tracking-tight text-white mb-2">
                              {tool.title}
                            </h2>

                            {/* Description */}
                            <p className="text-[12px] leading-relaxed text-white/40 font-medium mb-6 flex-1">
                              {tool.description}
                            </p>

                            {/* Button */}
                            <motion.button
                              onClick={() => setActiveTool(tool.id)}
                              whileHover={{ scale: 1.02 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                              className="relative w-full py-3 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.01] border border-white/[0.08] hover:border-[#DEFF9A]/35 text-[11px] font-black uppercase tracking-widest text-white/45 hover:text-white transition-all duration-300 overflow-hidden"
                            >
                              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/0 via-[#DEFF9A]/0 to-cyan-400/0 hover:from-cyan-400/15 hover:via-[#DEFF9A]/20 hover:to-cyan-400/15 transition-all duration-500" />
                              <span className="relative z-10">{tool.buttonLabel}</span>
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>

                {/* Footer */}
                <div className="mt-12 text-center">
                  <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mb-6" />
                  <p className="text-[9px] font-mono font-bold text-white/20 tracking-[0.3em] uppercase">
                    Tecnolingo AI Hub v2.4 · Protocolo de Aislamiento Académico
                  </p>
                </div>
              </div>
            </main>

            {/* Tool Overlays */}
            <AnimatePresence mode="wait">
              {activeTool && renderActiveTool()}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Admin Auth Modal */}
      <AnimatePresence>
        {showAdminAuthModal && (
          <motion.div
            key="admin-auth-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-sm rounded-3xl bg-[#061a1a] border border-[#DEFF9A]/20 p-8 shadow-[0_0_60px_-20px_rgba(222,255,154,0.15)]"
            >
              {/* Close button */}
              <button
                onClick={() => { setShowAdminAuthModal(false); setAuthError(''); setAdminPassword(''); }}
                className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <X size={16} />
              </button>

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-[#DEFF9A]/10 border border-[#DEFF9A]/20 flex items-center justify-center mb-5 mx-auto">
                <KeyRound size={24} className="text-[#DEFF9A]" />
              </div>

              <h2 className="text-sm font-black tracking-tight uppercase text-center mb-1">
                Acceso al Panel de <span className="text-[#DEFF9A]">Control de IA</span>
              </h2>
              <p className="text-[10px] font-mono font-bold text-white/30 tracking-[0.2em] uppercase text-center mb-6">
                Ingrese el código de autorización
              </p>

              <div className="space-y-4">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => { setAdminPassword(e.target.value); setAuthError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdminLogin(); }}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-mono tracking-widest placeholder:text-white/20 focus:outline-none focus:border-[#DEFF9A]/40 focus:ring-1 focus:ring-[#DEFF9A]/20 transition-all"
                />

                {authError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] font-bold text-red-400/80 text-center"
                  >
                    {authError}
                  </motion.p>
                )}

                <button
                  onClick={handleAdminLogin}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#DEFF9A]/20 to-[#DEFF9A]/10 border border-[#DEFF9A]/30 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#DEFF9A]/20 transition-all"
                >
                  Verificar Acceso
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AiToolsConfigProvider>
  );
}
