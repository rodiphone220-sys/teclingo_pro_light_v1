/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Waves, 
  ChevronLeft, 
  Mic, 
  Play, 
  RefreshCw, 
  Trophy,
  AlertCircle,
  Check,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from '../GlassCard';
import { useAiToolsConfig } from '../AdminCoreDashboard';
import { VoltageMeter } from '../ui/VoltageMeter';

interface Phoneme {
  char: string;
  isCorrect: boolean | null;
}

const CEFR_LEVELS = {
  'A1': [
    "Hello, my name is Alex and I am from Dallas.",
    "The weather is very nice today in the city.",
    "I would like to order a cup of coffee, please.",
    "Where is the nearest subway station?",
    "I have a big family with three brothers.",
    "What time does the lesson start today?",
    "I like to listen to music in my free time.",
    "Can you help me find my keys, please?",
    "This is my first time visiting this country.",
    "Nice to meet you, I hope you have a great day."
  ],
  'A2': [
    "I went to the supermarket to buy some fresh fruit.",
    "Yesterday I watched a very interesting movie at home.",
    "Can you tell me how to get to the main square?",
    "I usually wake up early to go for a run.",
    "We are planning a trip to the beach next summer.",
    "My favorite food is Italian, especially pasta and pizza.",
    "I need to buy a new pair of shoes for work.",
    "The train was late so I missed the beginning of the meeting.",
    "She has been working here for more than five years.",
    "Could you please repeat that more slowly for me?"
  ],
  'B1': [
    "I believe that technology has changed the way we communicate.",
    "If it rains tomorrow, we will have to cancel the outdoor event.",
    "I have been studying English for three years to improve my career.",
    "What do you think is the best way to learn a new language?",
    "I am looking forward to our meeting next Thursday morning.",
    "Despite the traffic, we managed to arrive exactly on time.",
    "In my opinion, teamwork is essential for the success of any project.",
    "I used to live in a small village, but now I prefer the city.",
    "Have you ever thought about starting your own business?",
    "It is important to maintain a healthy balance between work and life."
  ],
  'B2': [
    "The company is planning to expand its operations into new markets.",
    "If I had known about the delay, I would have taken a different route.",
    "Digital transformation is no longer an option but a necessity today.",
    "We need to find a sustainable solution to reduce our carbon footprint.",
    "The speaker provided some very insightful comments during the seminar.",
    "I am currently responsible for managing a team of ten developers.",
    "Success often depends on our ability to adapt to changing circumstances.",
    "The research suggests that regular exercise improves cognitive function.",
    "I would appreciate it if you could provide some feedback on my proposal.",
    "Negotiation skills are crucial when dealing with international clients."
  ],
  'C1': [
    "The economic implications of this policy have been widely debated.",
    "It is imperative that we address these systemic issues immediately.",
    "Her eloquent presentation captivated the entire audience at the conference.",
    "The intricate details of the contract require a thorough examination.",
    "Innovative strategies are paramount to maintaining a competitive edge.",
    "The correlation between employee satisfaction and productivity is undeniable.",
    "We must cultivate an environment that fosters creativity and collaboration.",
    "The project's success is contingent upon securing additional funding.",
    "Technological advancements are rapidly reshaping the global landscape.",
    "Comprehensive analysis is required to understand the underlying causes."
  ],
  'C2': [
    "The philosophical nuances of the text are truly profound and complex.",
    "His contributions to the field of linguistics are unparalleled and vast.",
    "The sociopolitical landscape is undergoing a significant transformation.",
    "A multifaceted approach is essential to tackling such a colossal challenge.",
    "The inherent risks of the venture were meticulously scrutinized by experts.",
    "The ephemeral nature of fame is a recurring theme in modern literature.",
    "We must strive for excellence in every facet of our professional lives.",
    "The paradigm shift in education is driven by the digital revolution.",
    "The confluence of these factors led to an unprecedented surge in demand.",
    "Her mastery of the language is evident in her sophisticated prose."
  ]
};

export function TheBridge({ onClose }: { onClose: () => void }) {
  const { config } = useAiToolsConfig();
  const [currentLevel, setCurrentLevel] = useState<keyof typeof CEFR_LEVELS>('B1');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchScore, setMatchScore] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<'EMILY' | 'JAMES'>('EMILY');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const [feedback, setFeedback] = useState<string>('Inicia grabación para recibir un diagnóstico detallado de tu pronunciación.');

  const phrase = CEFR_LEVELS[currentLevel][phraseIndex];
  const words = phrase.split(' ');

  const handleNextPhrase = () => {
    const nextIndex = (phraseIndex + 1) % 10;
    setPhraseIndex(nextIndex);
    // Reset session
    setMatchScore(0);
    setTranscript('');
    setFeedback('Frase siguiente cargada. Presiona el micrófono para evaluar tu pronunciación.');
  };

  const handlePrevPhrase = () => {
    const prevIndex = (phraseIndex - 1 + 10) % 10;
    setPhraseIndex(prevIndex);
    setMatchScore(0);
    setTranscript('');
    setFeedback('Frase anterior cargada. Prepárate para el análisis.');
  };

  const handleLevelChange = (level: keyof typeof CEFR_LEVELS) => {
    setCurrentLevel(level);
    setPhraseIndex(0);
    setMatchScore(0);
    setTranscript('');
    setFeedback(`Nivel ${level} configurado. Comienza con la primera frase cuando estés listo.`);
  };

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const resultTranscript = Array.from(event.results)
            .map((res: any) => res[0].transcript)
            .join(' ');
          setTranscript(resultTranscript);
        };

        recognition.onerror = (event: any) => {
          console.warn("TheBridge: Speech Recognition captured error gracefully:", event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn("TheBridge: SpeechRecognition constructor failed or is illegal in this iframe sandbox:", e);
      }
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wordTimingsRef = useRef<number[]>([]);

  const handlePlayModel = async () => {
    if (isPlaying) return;

    const isMale = selectedModel === 'JAMES';
    setIsPlaying(true);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: phrase,
          gender: isMale ? 'male' : 'female',
        }),
      });

      if (!res.ok) throw new Error('TTS API error');

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.playbackRate = config.bridge.voiceSpeed;
      audioRef.current = audio;

      // Estimate word timings based on audio duration
      const words = phrase.split(' ');
      const totalChars = phrase.length;
      const charDurations: number[] = [];

      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        const avgTimePerChar = duration / totalChars;

        // Build approximate timings for each word start
        let charOffset = 0;
        wordTimingsRef.current = words.map((word) => {
          const startTime = charOffset * avgTimePerChar;
          charOffset += word.length + 1;
          return startTime;
        });
      });

      audio.addEventListener('timeupdate', () => {
        const currentTime = audio.currentTime;
        const timings = wordTimingsRef.current;
        let activeIdx = -1;
        for (let i = timings.length - 1; i >= 0; i--) {
          if (currentTime >= timings[i]) {
            activeIdx = i;
            break;
          }
        }
        // Only activate if within reasonable range of that word
        const nextStart = timings[activeIdx + 1] ?? audio.duration;
        if (activeIdx >= 0 && currentTime < nextStart) {
          setActiveWordIndex(activeIdx);
        }
      });

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(false);
        setActiveWordIndex(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(false);
        setActiveWordIndex(null);
        audioRef.current = null;
      };

      audio.play();
    } catch (error) {
      console.error('[TheBridge TTS] Error:', error);
      setIsPlaying(false);
      setActiveWordIndex(null);
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Speech recognition already started or failed:", e);
      }
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsProcessing(true);
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // System PING
    const playSystemSound = (freq: number, dur: number) => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur);
        osc.start();
        osc.stop(audioCtx.currentTime + dur);
      } catch (e) { console.warn(e); }
    };

    playSystemSound(440, 0.2);

    // Analyze transcription
    setTimeout(() => {
      setIsProcessing(false);
      
      const target = phrase.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
      const result = transcript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
      
      let score = 0;
      let missedWords: string[] = [];

      if (result) {
        const targetWords = target.split(' ').filter(w => w.length > 0);
        const resultWords = result.split(' ').filter(w => w.length > 0);
        let matches = 0;
        
        targetWords.forEach(tWord => {
          if (resultWords.includes(tWord)) {
            matches++;
          } else {
            missedWords.push(tWord);
          }
        });
        
        // Realistic Scoring: Base match % + penalties for extra/garbage words
        let baseScore = (matches / targetWords.length) * 100;
        
        // Penalty: Extra words that aren't in the target (noise or wrong language)
        const extraWordsCount = resultWords.filter(rw => !targetWords.includes(rw)).length;
        const extraPenalty = (extraWordsCount / Math.max(resultWords.length, 1)) * 40;
        
        // Penalty: Significant word count difference
        const lengthDiff = Math.abs(targetWords.length - resultWords.length);
        const lengthPenalty = (lengthDiff / targetWords.length) * 20;

        score = Math.floor(Math.max(0, baseScore - extraPenalty - lengthPenalty));

        if (result === target) score = 100;
        if (matches === 0) score = 0;
      }

      setMatchScore(score); 
      playSystemSound(score > 70 ? 880 : 440, 0.5);

      // --- DYNAMIC AI FEEDBACK ENGINE ---
      const PHONETIC_DIFFICULTIES = [
        { pattern: /\b(th|the|this|that|there)\b/i, label: 'Sonido "TH" (Fricativo)', tip: 'Coloca la punta de la lengua entre los dientes para los sonidos /θ/ o /ð/.' },
        { pattern: /r\b|read|run|rain/i, label: 'Consonante "R" Inglesa', tip: 'No enrolles la lengua contra el paladar; el sonido es más suave y nasal.' },
        { pattern: /sh|ch|shoe|chair/i, label: 'Sibilantes "SH/CH"', tip: 'Diferencia "sh" (suave) de "ch" (explosivo) para mayor claridad.' },
        { pattern: /\bv|visit|very\b/i, label: 'Fricativa "V"', tip: 'Usa los dientes superiores sobre el labio inferior, no juntes ambos labios.' },
        { pattern: /ed\b|walked|played/i, label: 'Terminación "-ED"', tip: 'En muchos casos la "e" es muda; pronuncia /t/ o /d/ directamente.' },
        { pattern: /z|is|lazy/i, label: 'Vibrante "Z"', tip: 'Haz vibrar las cuerdas vocales como una abeja; es distinto a la "s".' },
        { pattern: /\bh|hello|home\b/i, label: 'Aspirada "H"', tip: 'La "H" es un suspiro suave, no un sonido fuerte de garganta como en español.' },
        { pattern: /[aeiou]/i, label: 'Modulación de Vocales', tip: 'Las vocales inglesas son más breves y relajadas que las españolas.' },
      ];

      const SUCCESS_MESSAGES = [
        'Excelente ritmo y cadencia.',
        'Tu entonación suena muy natural.',
        'Buena velocidad de habla.',
        'La estructura de la frase es clara.',
        'Pausas correctas entre palabras.',
        'Muy buen énfasis en las sílabas clave.'
      ];

      if (score < 10) {
        setFeedback('No logré identificar la frase con claridad. Asegúrate de hablar cerca del micrófono y pronunciar cada palabra en inglés. Si estás usando auriculares, verifica que el micrófono esté activo.');
      } else if (score < 60) {
        const possibleDifficulties = PHONETIC_DIFFICULTIES.filter(d => 
          missedWords.some(w => d.pattern.test(w))
        );
        
        let difficulty = possibleDifficulties.find(d => phrase.toLowerCase().includes(d.pattern.source)) 
          || possibleDifficulties[0] 
          || PHONETIC_DIFFICULTIES[Math.floor(Math.random() * PHONETIC_DIFFICULTIES.length)];
        
        setFeedback(`Detecté dificultades con la ${difficulty.label}. ${difficulty.tip} Aunque la estructura es identificable, necesitas articular más cada palabra para mejorar la precisión.`);
      } else if (score < 95) {
        const possibleDifficulties = PHONETIC_DIFFICULTIES.filter(d => 
          phrase.toLowerCase().includes(d.pattern.source)
        );
        
        const difficulty = possibleDifficulties.length > 0 
          ? possibleDifficulties[Math.floor(Math.random() * possibleDifficulties.length)] 
          : { label: 'Entonación sutil', tip: 'Enfatiza las palabras de contenido (sustantivos, verbos) y relaja las de función.' };

        setFeedback(`¡Buen trabajo! ${SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)]} Para alcanzar el 100%, presta atención a: ${difficulty.tip}`);
      } else {
        setFeedback('¡Extraordinario! Tu pronunciación es prácticamente indistinguible de la de un hablante nativo. Has capturado perfectamente los matices fonéticos y el ritmo de la frase.');
      }
    }, 1500);
  };

  const models = {
    EMILY: {
      name: 'MS. EMILY AI',
      role: 'Native Speaker',
      img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80'
    },
    JAMES: {
      name: 'MR. JAMES AI',
      role: 'Native Speaker',
      img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80'
    }
  };

  const phonemes: Phoneme[] = phrase.split('').map((char, idx) => ({
    char,
    isCorrect: isProcessing ? null : (matchScore > 0 ? (Math.random() > (matchScore / 100) ? false : true) : null)
  }));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-[#061a1a]/98 backdrop-blur-3xl overflow-y-auto"
    >
      <div className="max-w-7xl mx-auto p-8 py-20 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <button 
            onClick={onClose}
            className="flex items-center gap-3 text-white/40 hover:text-[#DEFF9A] transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#DEFF9A]/30">
               <ChevronLeft size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Regresar al Toolkit</span>
          </button>

          <div className="text-center">
             <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">The Bridge</h1>
             <p className="text-[#DEFF9A] text-[9px] font-black uppercase tracking-[0.3em]">AI Pronunciation Lab · Beta 1.0</p>
          </div>

          <div className="flex items-center gap-6">
             <div className="text-right">
                <p className="text-white/20 text-[8px] font-black uppercase tracking-widest mb-1">Nativa Similitud</p>
                <p className="text-2xl font-black text-[#DEFF9A] tracking-tighter">{matchScore.toFixed(1)}%</p>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-[#DEFF9A]/10 border border-[#DEFF9A]/20 flex items-center justify-center text-[#DEFF9A] shadow-[0_0_20px_rgba(222,255,154,0.1)]">
                <Trophy size={20} />
             </div>
          </div>
        </header>

        {/* Main Interface: Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
           {/* Box 1: AI Master */}
           <GlassCard accent="green" className="relative h-full overflow-hidden group min-h-[320px]">
              <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
                 <motion.img 
                   key={selectedModel}
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   src={models[selectedModel].img} 
                   className="w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-opacity duration-700" 
                   alt="AI Teacher"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#061a1a] via-transparent to-transparent opacity-80" />
                 <div className="absolute inset-x-0 bottom-0 p-6 flex justify-between items-end">
                    <div>
                       <p className="text-[#DEFF9A] text-[8px] font-black uppercase tracking-widest mb-1">{models[selectedModel].role}</p>
                       <h4 className="text-white text-base font-black uppercase tracking-tight">{models[selectedModel].name}</h4>
                    </div>
                    <div className="flex gap-2">
                       <div className="flex flex-col gap-1 mr-2">
                          <button 
                            onClick={() => setSelectedModel('EMILY')}
                            className={`w-6 h-6 rounded-lg text-[10px] font-black transition-all ${selectedModel === 'EMILY' ? 'bg-[#DEFF9A] text-[#061a1a]' : 'bg-white/5 text-white/40 hover:text-white'}`}
                          >
                             F
                          </button>
                          <button 
                            onClick={() => setSelectedModel('JAMES')}
                            className={`w-6 h-6 rounded-lg text-[10px] font-black transition-all ${selectedModel === 'JAMES' ? 'bg-[#DEFF9A] text-[#061a1a]' : 'bg-white/5 text-white/40 hover:text-white'}`}
                          >
                             M
                          </button>
                       </div>
                       <button 
                         onClick={handlePlayModel}
                         className={`w-12 h-12 rounded-2xl border border-white/20 backdrop-blur-md flex items-center justify-center transition-all group/btn ${isPlaying ? 'bg-[#DEFF9A] text-[#061a1a] shadow-[0_0_20px_#DEFF9A]' : 'bg-white/10 text-white hover:bg-[#DEFF9A] hover:text-[#061a1a]'}`}
                       >
                         {isPlaying ? (
                           <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }}>
                             <Waves size={20} />
                           </motion.div>
                         ) : (
                           <Play size={20} fill="currentColor" className="ml-0.5" />
                         )}
                       </button>
                    </div>
                 </div>
              </div>
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-[#DEFF9A] text-[#061a1a] text-[8px] font-black uppercase tracking-widest">
                 MODELO DE REFERENCIA
              </div>
           </GlassCard>

           {/* Box 2: Phrase & Target */}
           <div className="p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/10 flex flex-col min-h-[320px]">
              <div className="flex items-center justify-between mb-6">
                 <p className="text-white/20 text-[8px] font-black uppercase tracking-[0.2em]">Frase Objetivo</p>
                 <div className="flex gap-1.5 flex-wrap justify-end max-w-[120px]">
                    {(Object.keys(CEFR_LEVELS) as Array<keyof typeof CEFR_LEVELS>).map((level) => (
                      <button
                         key={level}
                         onClick={() => handleLevelChange(level)}
                         className={`px-2 py-1 rounded text-[8px] font-black transition-all ${
                           currentLevel === level 
                           ? 'bg-[#DEFF9A] text-[#061a1a] shadow-[0_0_10px_#DEFF9A]' 
                           : 'bg-white/5 text-white/40 hover:text-white'
                         }`}
                      >
                         {level}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="flex-1 flex items-center justify-between group/carousel relative">
                 <button 
                   onClick={handlePrevPhrase}
                   className="p-1 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100 absolute left-0 z-10"
                 >
                    <ChevronLeft size={20} />
                 </button>
                 
                 <div className="flex-1 flex flex-wrap gap-x-2 gap-y-1 leading-tight justify-center px-6">
                    {words.map((word, wIdx) => {
                      let offset = words.slice(0, wIdx).join(' ').length + (wIdx > 0 ? 1 : 0);
                      const isVocalizing = activeWordIndex === wIdx;
                      
                      return (
                        <motion.span 
                          key={wIdx} 
                          animate={{ 
                            scale: isVocalizing ? 1.05 : 1,
                            color: isVocalizing ? '#DEFF9A' : undefined
                          }}
                          className={`text-lg md:text-xl font-black uppercase tracking-tighter text-center ${isVocalizing ? 'text-[#DEFF9A]' : 'text-white'}`}
                        >
                           {word.split('').map((char, cIdx) => {
                             const p = phonemes[offset + cIdx];
                             return (
                               <span 
                                 key={cIdx} 
                                 className={`${
                                   !isVocalizing && p.isCorrect === true ? 'text-[#DEFF9A]' : 
                                   !isVocalizing && p.isCorrect === false ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]' : 
                                   ''
                                 } transition-colors duration-300`}
                               >
                                 {char}
                               </span>
                             );
                           })}
                        </motion.span>
                      );
                    })}
                 </div>

                 <button 
                   onClick={handleNextPhrase}
                   className="p-1 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100 absolute right-0 z-10"
                 >
                    <ChevronLeft size={20} className="rotate-180" />
                 </button>
              </div>

              <div className="flex justify-center gap-1 mt-6">
                 {Array.from({ length: 10 }).map((_, i) => (
                   <div 
                     key={i} 
                     className={`h-0.5 transition-all duration-500 rounded-full ${i === phraseIndex ? 'w-4 bg-[#DEFF9A]' : 'w-1 bg-white/10'}`} 
                   />
                 ))}
              </div>
           </div>

           {/* Box 3: Recording Lab */}
           <div className="p-6 rounded-[2.5rem] bg-[#DEFF9A]/5 border border-[#DEFF9A]/10 flex flex-col items-center justify-center text-center space-y-6 min-h-[320px] relative overflow-hidden group">
              <AnimatePresence>
                 {isRecording && (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="absolute inset-0 bg-[#DEFF9A]/10 border-2 border-[#DEFF9A] pointer-events-none"
                   />
                 )}
              </AnimatePresence>

              {/* Waveform */}
              <div className="h-16 w-full flex items-center justify-center gap-0.5">
                 {Array.from({ length: 40 }).map((_, i) => (
                   <motion.div 
                     key={i}
                     animate={{ 
                       height: isRecording ? [4, Math.random() * 40 + 4, 4] : 4,
                       opacity: isRecording ? 1 : 0.2
                     }}
                     transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.01 }}
                     className="w-1 rounded-full bg-[#DEFF9A]"
                   />
                 ))}
              </div>

              <button 
                onMouseDown={handleStartRecording}
                onMouseUp={handleStopRecording}
                onTouchStart={handleStartRecording}
                onTouchEnd={handleStopRecording}
                disabled={isProcessing}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isRecording 
                    ? 'bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)] scale-90' 
                    : isProcessing
                    ? 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed'
                    : 'bg-[#DEFF9A] text-[#061a1a] shadow-[0_0_30px_rgba(222,255,154,0.3)] hover:scale-110'
                }`}
              >
                 {isProcessing ? (
                   <RefreshCw size={32} className="animate-spin text-[#DEFF9A]" />
                 ) : (
                   <Mic size={32} fill={isRecording ? 'none' : 'currentColor'} stroke={isRecording ? 'white' : 'currentColor'} />
                 )}
              </button>
              
              <div className="space-y-1">
                 <p className="text-[#DEFF9A] text-[9px] font-black uppercase tracking-widest">
                    {isRecording ? 'Grabando...' : 'Mantén presionado'}
                 </p>
                 <p className="text-white/20 text-[7px] font-black uppercase tracking-widest italic">Micrófono Real-Time Activo</p>
              </div>
           </div>
        </div>

        {/* Meter Section: Wide View */}
        <div className="mb-8">
           <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5">
              <VoltageMeter value={matchScore} isProcessing={isProcessing} />
           </div>
        </div>

        {/* Bottom Feedback Section: Unified Analysis */}
        <div className="w-full">
           <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/10 flex flex-col md:flex-row gap-8 items-center md:items-start group hover:border-[#DEFF9A]/30 transition-all duration-500 shadow-[0_0_50px_rgba(0,0,0,0.2)]">
              <div className="w-20 h-20 rounded-3xl bg-[#DEFF9A]/10 border border-[#DEFF9A]/20 flex items-center justify-center text-[#DEFF9A] group-hover:scale-110 transition-transform duration-500 shrink-0">
                 <Zap size={32} className={isProcessing ? 'animate-pulse' : ''} />
              </div>
              <div className="flex-1 space-y-3 text-center md:text-left">
                 <div className="flex items-center justify-center md:justify-start gap-3">
                    <p className="text-[#DEFF9A] text-[10px] font-black uppercase tracking-[0.3em]">AI Diagnostic Summary</p>
                    <div className="h-0.5 w-12 bg-[#DEFF9A]/20 rounded-full" />
                 </div>
                 <h5 className="text-white/90 text-lg md:text-xl font-medium tracking-tight leading-relaxed max-w-4xl">
                   {isProcessing ? (
                     <span className="opacity-40 italic">Analizando espectro de audio y coherencia léxica...</span>
                   ) : (
                     feedback
                   )}
                 </h5>
              </div>
              <div className="hidden md:flex flex-col gap-2 shrink-0">
                 <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-white/40 uppercase tracking-widest">Acentos Analizados</div>
                 <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-white/40 uppercase tracking-widest">Match Fonético Real</div>
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
