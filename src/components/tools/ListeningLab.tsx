/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAiToolsConfig } from '../AdminCoreDashboard';
import {
  Headphones, 
  ChevronLeft, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Globe2, 
  Wind, 
  Eye,
  EyeOff,
  Type,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Volume2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PHRASES: { text: string; level: string; category: string }[] = [
  // A1
  { text: "Hello, my name is John and I come from a small town in Canada.", level: "A1", category: "Personal" },
  { text: "I like to eat apples and oranges for breakfast every day.", level: "A1", category: "Food" },
  { text: "My favorite color is blue and I have a big red car.", level: "A1", category: "General" },
  { text: "There are four people in my family: my mother, my father, and my sister.", level: "A1", category: "Family" },
  { text: "Where is the nearest supermarket? I need to buy some bread.", level: "A1", category: "Shopping" },
  { text: "I work in a bank from Monday to Friday, from nine to five.", level: "A1", category: "Work" },
  { text: "The weather is very hot today, so I want to go swimming.", level: "A1", category: "Weather" },
  { text: "Can you help me with my homework? It is very difficult.", level: "A1", category: "Education" },
  { text: "I live in a small apartment near the city center.", level: "A1", category: "Housing" },
  { text: "What time do you usually wake up on the weekends?", level: "A1", category: "Routine" },

  // A2
  { text: "Last summer, I went to Italy with my friends and we visited many museums.", level: "A2", category: "Travel" },
  { text: "I am going to cook dinner for my family tonight because it is my birthday.", level: "A2", category: "Plans" },
  { text: "You should wear a coat today because it might rain later this afternoon.", level: "A2", category: "Advice" },
  { text: "I have been learning English for two years and I want to improve my speaking.", level: "A2", category: "Learning" },
  { text: "My brother is taller than me, but I am much faster at running.", level: "A2", category: "Comparison" },
  { text: "We were watching a movie when the lights suddenly went out.", level: "A2", category: "Narrative" },
  { text: "I think that technology is making our lives easier every day.", level: "A2", category: "Opinion" },
  { text: "Could you tell me how to get to the train station from here?", level: "A2", category: "Directions" },
  { text: "I used to play the piano when I was a child, but I stopped five years ago.", level: "A2", category: "Past" },
  { text: "If I have enough money next year, I will buy a new laptop.", level: "A2", category: "Future" },

  // B1
  { text: "Sustainable energy solutions are critical for the future of our planet.", level: "B1", category: "Environment" },
  { text: "Although it was raining heavily, the football match was not cancelled.", level: "B1", category: "Contrast" },
  { text: "I would have called you if I had known you were in town yesterday.", level: "B1", category: "Conditional" },
  { text: "The movie was so boring that many people left before the end.", level: "B1", category: "Review" },
  { text: "I'm looking forward to meeting your family during my visit next month.", level: "B1", category: "Phrasal" },
  { text: "She succeeded in passing the exam despite the fact that she was ill.", level: "B1", category: "Achievement" },
  { text: "They have been living in this neighborhood since they got married ten years ago.", level: "B1", category: "Duration" },
  { text: "I suggest that we take a break now and continue the meeting later.", level: "B1", category: "Business" },
  { text: "The book, which was written in the nineteenth century, is still very popular.", level: "B1", category: "Relative" },
  { text: "I was wondering if you could lend me some money until next Friday.", level: "B1", category: "Request" },

  // B2
  { text: "The global economy is facing unprecedented challenges in the digital era.", level: "B2", category: "Economy" },
  { text: "The architecture of the ancient city was remarkably sophisticated.", level: "B2", category: "History" },
  { text: "By the time we reached the summit, the sun had already begun to set.", level: "B2", category: "Nature" },
  { text: "It is widely believed that physical exercise can significantly reduce stress levels.", level: "B2", category: "Health" },
  { text: "The exhibition features a wide range of contemporary artworks from around the world.", level: "B2", category: "Culture" },
  { text: "He was accused of stealing the documents, but he denied all the allegations.", level: "B2", category: "Law" },
  { text: "I'm not used to waking up so early in the morning for a conference.", level: "B2", category: "Habit" },
  { text: "The government has implemented new policies to tackle rising unemployment rates.", level: "B2", category: "Politics" },
  { text: "In conclusion, the results of the study confirm our initial hypothesis.", level: "B2", category: "Academic" },
  { text: "Hardly had I entered the room when the phone started ringing incessantly.", level: "B2", category: "Emphasis" },

  // C1
  { text: "Artificial intelligence is transforming the way we process information.", level: "C1", category: "Technology" },
  { text: "The intricate relationship between biodiversity and ecosystem stability is well documented.", level: "C1", category: "Science" },
  { text: "Financial markets are notoriously volatile and susceptible to global political shifts.", level: "C1", category: "Finance" },
  { text: "The protagonist's internal struggle is reflected in the bleak landscape of the novel.", level: "C1", category: "Literature" },
  { text: "Genetic engineering remains a highly contentious issue among the scientific community.", level: "C1", category: "Ethic" },
  { text: "The pervasive influence of social media on modern discourse cannot be overstated.", level: "C1", category: "Society" },
  { text: "We must strive to foster an environment that encourages innovation and creativity.", level: "C1", category: "Leadership" },
  { text: "The archaeological findings shed light on the daily lives of prehistoric humans.", level: "C1", category: "Anthropology" },
  { text: "Linguistic diversity is a cornerstone of cultural heritage and must be preserved.", level: "C1", category: "Linguistics" },
  { text: "The implications of this breakthrough are profound and far-reaching for medicine.", level: "C1", category: "Medicine" },

  // C2
  { text: "The ephemeral nature of fame often leads to a sense of profound disillusionment.", level: "C2", category: "Philosophy" },
  { text: "The author weaves a tapestry of complex metaphors throughout the entire manuscript.", level: "C2", category: "Stylistics" },
  { text: "Economists are grappling with the paradox of scarcity in an age of digital abundance.", level: "C2", category: "Theory" },
  { text: "The sublime beauty of the Northern Lights left the spectators in a state of awe.", level: "C2", category: "Aesthetics" },
  { text: "Institutional barriers frequently impede the progress of marginalized communities.", level: "C2", category: "Sociology" },
  { text: "The symphony reached its crescendo with a thunderous applause from the audience.", level: "C2", category: "Music" },
  { text: "Cognitive dissonance occurs when an individual holds two conflicting beliefs simultaneously.", level: "C2", category: "Psychology" },
  { text: "The juxtaposition of traditional and modern elements creates a unique visual identity.", level: "C2", category: "Design" },
  { text: "Metaphysical inquiries into the nature of reality have captivated minds for millennia.", level: "C2", category: "Metaphysics" },
  { text: "The orator's eloquence was such that it swayed even the most skeptical of listeners.", level: "C2", category: "Rhetoric" }
];

export function ListeningLab({ onClose }: { onClose: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [accent, setAccent] = useState('American');
  const [speed, setSpeed] = useState(1);
  const { config } = useAiToolsConfig();
  const [backgroundNoise, setBackgroundNoise] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<string | 'Mixed'>('Mixed');
  const [labPhrases, setLabPhrases] = useState<typeof PHRASES>([]);
  const [currentPhraseIdx, setCurrentPhraseIdx] = useState(0);
  const [userTranscription, setUserTranscription] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ word: string; isCorrect: boolean; expected?: string }[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showFinalResult, setShowFinalResult] = useState(false);

  const startLab = (level: string | 'Mixed') => {
    let pool = [...PHRASES];
    if (level !== 'Mixed') {
      pool = pool.filter(p => p.level === level);
    }
    
    const selected = pool
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);
    
    setLabPhrases(selected);
    setDifficulty(level);
    setIsStarted(true);
    setCurrentPhraseIdx(0);
    setTotalScore(0);
    setScore(null);
    setShowSubtitles(false);
    setShowFinalResult(false);
  };

  const changeDifficulty = (level: string | 'Mixed') => {
    let pool = [...PHRASES];
    if (level !== 'Mixed') {
      pool = pool.filter(p => p.level === level);
    }
    
    const selected = pool
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);
    
    setLabPhrases(selected);
    setDifficulty(level);
    setCurrentPhraseIdx(0);
    setTotalScore(0);
    setScore(null);
    setFeedback([]);
    setUserTranscription('');
    setShowSubtitles(false);
    setShowFinalResult(false);
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  const currentPhrase = labPhrases[currentPhraseIdx];
  const ghostText = useMemo(() => 
    currentPhrase ? currentPhrase.text.split(' ').map(word => "*".repeat(word.length)).join(' ') : "",
    [currentPhrase]
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (audioRef.current && audioRef.current.readyState > 0) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentPhrase.text,
          gender: 'female',
        }),
      });

      if (!res.ok) throw new Error('TTS API error');

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.playbackRate = config.listening.voiceSpeed;
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(false);
        audioRef.current = null;
      };

      audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('[ListeningLab TTS] Error:', error);
      setIsPlaying(false);
    }
  };

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      const targetClean = currentPhrase.text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
      const inputClean = userTranscription.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
      
      const targetWords = targetClean.split(/\s+/);
      const inputWordsRaw = userTranscription.split(/\s+/);
      const targetWordsRaw = currentPhrase.text.split(/\s+/);
      
      let matches = 0;
      const feedbackData = targetWordsRaw.map((word, idx) => {
        const cleanT = word.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
        const cleanI = inputWordsRaw[idx] ? inputWordsRaw[idx].toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"") : "";
        
        const isCorrect = cleanT === cleanI;
        if (isCorrect) matches++;
        
        return {
          word: inputWordsRaw[idx] || "___",
          expected: word,
          isCorrect
        };
      });
      
      const finalScore = Math.floor((matches / targetWords.length) * 100);
      setScore(finalScore);
      setFeedback(feedbackData);
      setTotalScore(prev => prev + finalScore);
      setIsVerifying(false);
      if (finalScore >= 80) setShowSubtitles(true);
    }, 1500);
  };

  const nextPhrase = () => {
    if (currentPhraseIdx < labPhrases.length - 1) {
      setCurrentPhraseIdx((prev) => prev + 1);
      setUserTranscription('');
      setScore(null);
      setFeedback([]);
      setShowSubtitles(false);
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      setShowFinalResult(true);
    }
  };

  const prevPhrase = () => {
    if (currentPhraseIdx > 0) {
      setCurrentPhraseIdx((prev) => prev - 1);
      setUserTranscription('');
      setScore(null);
      setFeedback([]);
      setShowSubtitles(false);
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  };

  if (!isStarted) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] bg-[#061a1a] flex items-center justify-center p-8"
      >
        <div className="max-w-2xl w-full neo-glass rounded-[4rem] p-12 md:p-16 border-white/5 space-y-12 text-center">
            <div className="w-24 h-24 rounded-[2rem] bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 mx-auto shadow-[0_0_50px_rgba(251,146,60,0.2)]">
               <Headphones size={48} />
            </div>
            
            <div className="space-y-4">
               <h1 className="text-4xl font-black text-white uppercase tracking-tight">AI Listening Lab</h1>
               <p className="text-orange-400 text-xs font-black uppercase tracking-[0.3em]">Audio Immersion Matrix</p>
               <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
                  Sumérgete en un entorno de audio de alta fidelidad. Completa 10 dictados para medir tu precisión auditiva.
               </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => (
                 <button 
                  key={lvl}
                  onClick={() => startLab(lvl)}
                  className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 transition-all group"
                 >
                    <span className="block text-white font-black text-xl mb-1">{lvl}</span>
                    <span className="text-[8px] font-black uppercase text-orange-400 tracking-widest">{lvl.startsWith('A') ? 'Basic' : lvl.startsWith('B') ? 'Intermediate' : 'Advanced'}</span>
                 </button>
               ))}
               <button 
                onClick={() => startLab('Mixed')}
                className="col-span-2 md:col-span-3 p-6 rounded-[2rem] bg-orange-500 text-[#061a1a] font-black uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-[0_0_40px_rgba(251,146,60,0.3)]"
               >
                  Inmersión Mixta
               </button>
            </div>

            <button onClick={onClose} className="text-white/20 hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest">
               Cancelar y Salir
            </button>
        </div>
      </motion.div>
    );
  }

  if (showFinalResult) {
    const finalAvg = Math.round(totalScore / labPhrases.length);
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] bg-[#061a1a] flex items-center justify-center p-8"
      >
         <div className="max-w-xl w-full neo-glass rounded-[4rem] p-16 space-y-12 text-center">
            <div className="w-32 h-32 rounded-[2.5rem] bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 mx-auto shadow-[0_0_50px_rgba(251,146,60,0.3)]">
               <CheckCircle2 size={64} />
            </div>
            <div className="space-y-4">
               <h2 className="text-4xl font-black text-white uppercase tracking-tight">Audio Mastery</h2>
               <p className="text-orange-400 text-[10px] font-black uppercase tracking-[0.4em]">Phonetic accuracy complete</p>
            </div>
            
            <div className="grid grid-cols-2 gap-6 text-center">
               <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5">
                  <p className="text-white/20 text-[8px] font-black uppercase tracking-widest mb-1">Average Precision</p>
                  <h4 className="text-4xl font-black text-white">{finalAvg}%</h4>
               </div>
               <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5">
                  <p className="text-white/20 text-[8px] font-black uppercase tracking-widest mb-1">Immersion Level</p>
                  <h4 className="text-4xl font-black text-orange-400">{difficulty}</h4>
               </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setIsStarted(false)}
                className="flex-1 py-6 rounded-3xl bg-white/5 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/10"
              >
                 Nuevo Lab
              </button>
              <button 
                onClick={onClose}
                className="flex-1 py-6 rounded-3xl bg-orange-500 text-[#061a1a] text-[11px] font-black uppercase tracking-widest shadow-[0_0_40px_rgba(251,146,60,0.4)]"
              >
                 Finalizar Sesión
              </button>
            </div>
         </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-[#061a1a] flex flex-col overflow-y-auto"
    >
      {/* Header */}
      <header className="p-6 md:p-8 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row items-center justify-between gap-6">
        <button 
          onClick={onClose}
          className="flex items-center gap-3 text-white/40 hover:text-orange-400 transition-colors self-start"
        >
           <ChevronLeft size={20} />
           <span className="text-[10px] font-black uppercase tracking-widest">Regresar al Lab</span>
        </button>

        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center text-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.1)]">
              <Headphones size={24} />
           </div>
           <div className="text-center md:text-left">
              <h1 className="text-white text-lg font-black uppercase tracking-tight">AI Listening Lab</h1>
              <p className="text-orange-400 text-[8px] font-black uppercase tracking-[0.3em]">Audio Immersion Matrix</p>
           </div>
        </div>



        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="text-white/20 text-[8px] font-black uppercase tracking-widest mb-1">Ejercicio actual</p>
              <p className="text-2xl font-black text-orange-400 tracking-tighter">{currentPhraseIdx + 1} / {labPhrases.length}</p>
           </div>
           <div className="w-12 h-12 rounded-2xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center text-orange-400 font-black italic">
              {difficulty}
           </div>
        </div>
      </header>

      {/* Progress Bar Container */}
      <div className="max-w-7xl mx-auto w-full px-6 md:px-8 mt-8 space-y-4">
         <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((currentPhraseIdx + 1) / labPhrases.length) * 100}%` }}
              className="h-full bg-orange-400 shadow-[0_0_15px_rgba(251,146,60,1)]"
            />
         </div>

         {/* CEFR Level Selector for Mixed / Selectable Dificultad */}
         <div className="neo-glass rounded-2xl p-4 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-400">
                  Seleccionar nivel de práctica / Dificultad:
               </span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
               {['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Mixed'].map((lvl) => (
                 <button
                   key={lvl}
                   onClick={() => changeDifficulty(lvl)}
                   className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                     difficulty === lvl 
                       ? 'bg-orange-400 border-orange-400 text-[#061a1a] font-black shadow-[0_0_20px_rgba(251,146,60,0.3)] scale-105' 
                       : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'
                   }`}
                 >
                    {lvl === 'Mixed' ? 'Inmersión Mixta ✨' : lvl}
                 </button>
               ))}
            </div>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-12">
         
         {/* Player Panel */}
         <div className="space-y-8">
            <div className="neo-glass rounded-[3rem] p-8 md:p-12 border-white/5 flex flex-col items-center text-center space-y-12">
               <div className="w-full flex items-center justify-between">
                  <div className="px-3 py-1.5 rounded-full bg-orange-400/10 border border-orange-400/20 text-orange-400 text-[9px] font-black uppercase tracking-widest">
                     {currentPhrase.category}
                  </div>
                  <div className="flex items-center gap-2 text-white/20">
                     <Globe2 size={14} />
                     <span className="text-[9px] font-black uppercase tracking-widest">Global English</span>
                  </div>
               </div>

               {/* Reactive Waveform */}
               <div className="h-40 w-full flex items-center justify-center gap-1">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ 
                        height: isPlaying ? [10, Math.random() * 100 + 10, 10] : 8,
                        opacity: isPlaying ? 1 : 0.2
                      }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.02 }}
                      className={`w-1.5 rounded-full ${isPlaying ? 'bg-orange-400' : 'bg-white/10'}`}
                    />
                  ))}
               </div>

               <div className="w-full space-y-8">
                  <div className="flex items-center justify-center gap-8">
                     <button onClick={prevPhrase} className="text-white/20 hover:text-white transition-colors"><SkipBack size={32} /></button>
                     <button 
                       onClick={handlePlay}
                       className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                         isPlaying 
                          ? 'bg-transparent border-2 border-orange-400 text-orange-400 shadow-[0_0_30px_rgba(251,146,60,0.2)]' 
                          : 'bg-orange-400 text-[#061a1a] shadow-[0_0_40px_rgba(251,146,60,0.3)] hover:scale-105'
                       }`}
                     >
                        {isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-2" />}
                     </button>
                     <button onClick={nextPhrase} className="text-white/20 hover:text-white transition-colors"><SkipForward size={32} /></button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Speech Rate</p>
                        <div className="flex gap-1">
                           {[0.5, 0.8, 1, 1.2].map(s => (
                             <button 
                               key={s}
                               onClick={() => setSpeed(s)}
                               className={`flex-1 py-1 text-[8px] font-black rounded-lg transition-all ${
                                 speed === s ? 'bg-orange-400 text-[#061a1a]' : 'bg-white/5 text-white/40'
                               }`}
                             >
                                {s}x
                             </button>
                           ))}
                        </div>
                     </div>
                     <button 
                       onClick={() => setBackgroundNoise(!backgroundNoise)}
                       className={`p-4 rounded-2xl border transition-all flex flex-col justify-center gap-2 ${
                         backgroundNoise ? 'bg-sky-400/10 border-sky-400 text-sky-400' : 'bg-white/5 border-white/10 text-white/40'
                       }`}
                     >
                        <div className="flex justify-between items-center w-full">
                           <p className="text-[8px] font-black uppercase tracking-widest">Ambience</p>
                           <Wind size={12} />
                        </div>
                        <p className="text-[10px] font-black uppercase text-left">{backgroundNoise ? 'Distortion Active' : 'Pure Signal'}</p>
                     </button>
                  </div>
               </div>
            </div>

            <div className="p-8 rounded-[3rem] bg-white/[0.02] border border-white/5 relative group">
               <button 
                onClick={() => setShowSubtitles(!showSubtitles)}
                className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors z-10"
               >
                  {showSubtitles ? <EyeOff size={18} /> : <Eye size={18} />}
               </button>
               <h3 className="text-white text-xl font-black uppercase tracking-tight leading-relaxed transition-all duration-500">
                  {showSubtitles ? currentPhrase.text : ghostText}
               </h3>
               <div className="mt-6 flex items-center justify-between">
                  <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.4em]">Visual Reference</p>
                  <div className="flex items-center gap-2 text-orange-400/40">
                     <Volume2 size={12} />
                     <span className="text-[8px] font-black">{currentPhrase.level} Intensity</span>
                  </div>
               </div>
            </div>
         </div>

         {/* Dictation Panel */}
         <div className="space-y-8">
            <div className="h-full neo-glass rounded-[3rem] p-8 md:p-12 border-white/5 flex flex-col space-y-8">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <Type size={18} className="text-orange-400" />
                     <h2 className="text-white text-lg font-black uppercase tracking-tight">AI Dictation Lab</h2>
                  </div>
                  {score !== null && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`px-4 py-2 rounded-2xl font-black text-xl italic ${score >= 80 ? 'text-[#DEFF9A] bg-[#DEFF9A]/10' : 'text-orange-400 bg-orange-400/10'}`}
                    >
                       {score}%
                    </motion.div>
                  )}
               </div>

               <div className="flex-1 flex flex-col space-y-6">
                  {score !== null ? (
                    <div className="flex-1 w-full bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 overflow-y-auto">
                       <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-4">Análisis de Errores Fonéticos</p>
                       <div className="flex flex-wrap gap-2 text-lg">
                          {feedback.map((item, idx) => (
                            <div key={idx} className="flex flex-col items-center">
                               <span className={`${item.isCorrect ? 'text-white' : 'text-orange-400 line-through decoration-red-500/50'} font-medium`}>
                                 {item.word}
                               </span>
                               {!item.isCorrect && (
                                 <motion.span 
                                   initial={{ opacity: 0, y: -5 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   className="text-[10px] font-black text-[#DEFF9A] uppercase tracking-tighter"
                                 >
                                    {item.expected}
                                 </motion.span>
                               )}
                            </div>
                          ))}
                       </div>
                    </div>
                  ) : (
                    <textarea 
                      value={userTranscription}
                      onChange={(e) => setUserTranscription(e.target.value)}
                      placeholder="Escucha la frase y escribe exactamente lo que oyes aquí..."
                      className="flex-1 w-full bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 text-white text-lg font-medium resize-none focus:outline-none focus:border-orange-400/50 transition-colors"
                    />
                  )}

                  <div className="flex gap-4">
                     <button 
                        onClick={() => { setUserTranscription(''); setScore(null); setFeedback([]); }}
                        className="p-6 rounded-3xl bg-white/5 text-white/40 hover:text-white transition-all"
                     >
                        <RotateCcw size={24} />
                     </button>
                     <button 
                       disabled={!userTranscription || isVerifying}
                       onClick={handleVerify}
                       className={`flex-1 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 ${
                         isVerifying 
                           ? 'bg-white/5 text-white/20 cursor-wait' 
                           : 'bg-orange-400 text-[#061a1a] hover:shadow-[0_0_30px_rgba(251,146,60,0.3)] hover:scale-[1.02]'
                       }`}
                     >
                        {isVerifying ? (
                          <>Procesando Audio... <RefreshCw size={16} className="animate-spin" /></>
                        ) : score !== null ? (
                          <>Validar de Nuevo <CheckCircle2 size={18} /></>
                        ) : (
                          <>Validar Transcripción <CheckCircle2 size={18} /></>
                        )}
                     </button>
                  </div>
               </div>

               <div className="p-6 rounded-[2rem] bg-orange-400/5 border border-orange-400/10 flex items-start gap-4">
                  <AlertCircle size={20} className="text-orange-400 shrink-0 mt-1" />
                  <p className="text-[10px] font-medium text-white/40 leading-relaxed italic">
                     El sistema AI analiza tu transcripción comparándola con el espectro de audio original. Ignora signos de puntuación, enfócate en las palabras clave y estructura.
                  </p>
               </div>
            </div>
         </div>
      </div>
    </motion.div>
  );
}
