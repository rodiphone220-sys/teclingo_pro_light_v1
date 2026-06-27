import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Sparkles, 
  Sliders, 
  Volume2, 
  Eye, 
  EyeOff, 
  Send, 
  Gamepad2, 
  Flame,
  Zap,
  HelpCircle,
  RotateCcw,
  Lock,
  MessageSquare,
  User,
  Activity,
  UserCheck,
  Mic,
  MicOff
} from 'lucide-react';
import { 
  OnboardingData, 
  AutoPercepcion, 
  VELOCITY_PRESETS, 
  SAFEZONE_MOCK_DATA, 
  ChatMessage
} from '../data/safeZoneContext';
import { useAiToolsConfig } from '../components/AdminCoreDashboard';
import {
  JSON_RESPONSE_SUFFIX,
  MCER_BASE,
  MCER_PROMPTS,
  LANG_LOCK,
  type McerLevel,
} from '../config/aiConfig';

const VELOCITY_STEPS = [
  { value: '0.60', label: '0.60x (Búnker Profundo)', speed: 0.60, desc: 'Ultralento, ideal para asimilar fonemas paso a paso.' },
  { value: '0.75', label: '0.75x (Búnker Controlado)', speed: 0.75, desc: 'Ritmo pausado con alta seguridad y cero agobio.' },
  { value: '0.88', label: '0.88x (Modo Chill)', speed: 0.88, desc: 'Ritmo natural relajado para entrenar el oído con calma.' },
  { value: '1.00', label: '1.00x (Native Base - META MÁXIMA)', speed: 1.00, desc: 'Velocidad real nativa estándar • ¡Tu meta definitiva!' }
];

const getVelocityIndex = (vel: string) => {
  if (vel === '0.60') return 0;
  if (vel === '0.75') return 1;
  if (vel === '0.88') return 2;
  return 3; // '1.00' or '1.0'
};

const TOPIC_EN: Record<string, string> = {
  'Viajes': 'Travel', 'Videojuegos': 'Video Games', 'Comida': 'Food', 'Deportes': 'Sports',
  'Música': 'Music', 'Películas/Series': 'Movies/Series', 'Cocina': 'Cooking',
};
const topicToEnglish = (s: string) => TOPIC_EN[s] || s;

const translateText = async (text: string, targetLang = 'es'): Promise<string> => {
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await res.json();
    return data[0]?.map((seg: any[]) => seg[0]).join('') || text;
  } catch {
    return text;
  }
};

function extractQuickResponses(text: string): { cleanText: string; quickResponses: string[] | null } {
  const patterns = [
    /```(?:json)?\s*(\{[\s\S]*?"quick_responses"\s*:\s*\[[\s\S]*?\]\s*[\s\S]*?\})\s*```/,
    /(\{[\s\S]*?"quick_responses"\s*:\s*\[[\s\S]*?\]\s*[\s\S]*?\})[\s\n]*$/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed.quick_responses) && parsed.quick_responses.length > 0) {
          const cleanText = text.replace(match[0], '').replace(/\n+$/, '').trim();
          return { cleanText, quickResponses: parsed.quick_responses.slice(0, 3) };
        }
      } catch {}
    }
  }
  return { cleanText: text, quickResponses: null };
}

const SAFEZONE_SYSTEM_PROMPT = `You are SafePal, an elite, highly adaptive, and incredibly engaging AI English Tutor for Spanish speakers. Your mission is to hold a natural, exciting, and supportive conversation.

STRICT RULES FOR YOUR PERSONALITY & STYLE:
1. NEVER loop or repeat robotic structures (e.g., Avoid 'X is great. Do you like Y?').
2. Keep your responses short, natural, and punchy (1 to 3 sentences max) so the student doesn't feel overwhelmed, but make them conversational, witty, and human.
3. ADAPT TO THE USER: The user is an adult entrepreneur and artist from Mexico who loves tech, music, and business. Use contexts related to daily real-life situations, creative industries, practical scenarios, or casual modern trends.
4. INTERACTIVE FLOW: Instead of just asking standard questions, react genuinely to what the user says. Validate their effort, use light humor, drop useful conversational fillers (e.g., 'Oh, absolutely!', 'That's awesome, you know?', 'By the way...'), and challenge them with open-ended or context-rich choices.
5. SCAFFOLDING: If the user writes short or simple answers (e.g., 'yes I do', 'sometimes'), gently expand the context or suggest a cool way to say it, then move the conversation forward naturally.

PERSONALIZATION: The student enjoys {actividad_preferida}, uses {red_social}, and likes {entretenimiento}. The student's companion type is {companion_type}.`;

export function SafeZoneModule() {
  // Onboarding completed state stored in local storage
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('safezone_onboarded') === 'true';
  });

  // Onboarding Form States
  const [onboarding, setOnboarding] = useState<OnboardingData>(() => {
    const saved = localStorage.getItem('safezone_onboarding_data');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      actividad_preferida: topicToEnglish(parsed.actividad_preferida) || 'Food',
      red_social: parsed.red_social || 'TikTok',
      entretenimiento: topicToEnglish(parsed.entretenimiento) || 'Movies/Series',
      companion_type: parsed.companion_type || 'friend',
      companion_gender: parsed.companion_gender || 'female'
    };
  });

  const [percepcion, setPercepcion] = useState<AutoPercepcion>(() => {
    const saved = localStorage.getItem('safezone_percepcion_data');
    return saved ? JSON.parse(saved) : {
      nivel_escrito_percibido: 45,
      nivel_conversacional_percibido: 20
    };
  });

  const [unleashMode, setUnleashMode] = useState<boolean>(false);

  // Admin AiToolsConfig context for dynamic systemPrompt, temperature, maxTokens, voiceSpeed
  const { config } = useAiToolsConfig();

  // Chat Velocity State
  const [velocity, setVelocity] = useState<string>(() => {
    return localStorage.getItem('safezone_playback_rate') || '1.00';
  });

  // Conversation Mode: 'basic' (SAFE PACE → A1-A2), 'casual' (CASUAL BRIDGE → B1-B2), 'native' (NATIVE MODE → C1-C2)
  const [conversationMode, setConversationMode] = useState<'basic' | 'casual' | 'native'>('basic');

  const MODE_TO_MCER: Record<'basic' | 'casual' | 'native', McerLevel> = {
    basic: 'A1-A2',
    casual: 'B1-B2',
    native: 'C1-C2',
  };

  // Chat message state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('safezone_chat_messages');
    if (saved) return JSON.parse(saved);
    const savedOnboarding = localStorage.getItem('safezone_onboarding_data');
    const data = savedOnboarding ? JSON.parse(savedOnboarding) : {};
    const hobby = topicToEnglish(data.actividad_preferida || 'Food');
    const channel = topicToEnglish(data.entretenimiento || 'Movies/Series');
    return [{
      id: 'welcome',
      sender: 'ai',
      text: `Hi there! I'm Pal. Let's practice English talking about ${hobby} and ${channel}. How are you today?`,
      translation: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }];
  });

  const [inputText, setInputText] = useState<string>('');
  const [revealedTranslations, setRevealedTranslations] = useState<Record<string, boolean>>({});
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-play welcome message on mount (returning user) or after onboarding
  useEffect(() => {
    if (isOnboarded) {
      const welcomeMsg = messages.find(m => m.id === 'welcome');
      if (welcomeMsg) {
        handleSpeakText(welcomeMsg.text, welcomeMsg.id);
        if (!welcomeMsg.translation) {
          translateText(welcomeMsg.text, 'es').then(t => {
            setMessages(prev => prev.map(m => m.id === 'welcome' ? { ...m, translation: t } : m));
          });
        }
      }
    }
  }, [isOnboarded]);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);

  // Voice Gender Selection and Input Pulsing Feedback States
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>(() => {
    return (localStorage.getItem('safezone_voice_gender') as 'male' | 'female') || 'female';
  });
  const [isInputPulsing, setIsInputPulsing] = useState<boolean>(false);

  // Sync Voice Gender
  useEffect(() => {
    localStorage.setItem('safezone_voice_gender', voiceGender);
  }, [voiceGender]);

  // Preload voices asynchronously via onvoiceschanged
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Use a ref to feed the up-to-date handleSendMessage down to transcription event listener
  const handleSendMessageRef = useRef<any>(null);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const startSpeechRecognition = () => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setRecognitionError('not-supported');
      setIsRecording(true);
      setTimeout(() => {
        const fallback = ["I feel so happy to speak English without any pressure!","I would love to enjoy the delicious typical food with friends","This viral trend in my favorite social network looks quite interesting","I want to practice my pronunciation tools and speaking skills today in Greenfield"];
        if (handleSendMessageRef.current) handleSendMessageRef.current(fallback[Math.floor(Math.random() * fallback.length)]);
        setIsRecording(false);
      }, 1500);
      return;
    }
    try {
      const rec = new SpeechRecognitionClass();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => { setIsRecording(true); setRecognitionError(null); };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim() && handleSendMessageRef.current)
          handleSendMessageRef.current(transcript);
      };

      const cleanup = () => {
        setIsRecording(false);
        recognitionRef.current = null;
      };

      const runFallback = () => {
        cleanup();
        const fallback = ["I feel so happy to speak English without any pressure!","I would love to enjoy the delicious typical food with friends","This viral trend in my favorite social network looks quite interesting","I want to practice my pronunciation tools and speaking skills today in Greenfield"];
        setTimeout(() => {
          if (handleSendMessageRef.current) handleSendMessageRef.current(fallback[Math.floor(Math.random() * fallback.length)]);
        }, 100);
      };

      rec.onerror = (event: any) => {
        console.warn("Speech Recognition error: ", event.error);
        setRecognitionError(event.error);
        cleanup();
        const duration = Date.now() - recordingStartTimeRef.current;
        if (event.error === 'aborted' && duration < 1500 || event.error === 'not-allowed' || event.error === 'no-speech' || event.error === 'audio-capture') {
          runFallback();
        }
      };

      rec.onend = () => { cleanup(); };

      recordingStartTimeRef.current = Date.now();
      rec.start();
      recognitionRef.current = rec;
    } catch (e) {
      console.warn("SafeZoneModule: SpeechRecognition constructor failed:", e);
      setRecognitionError('not-supported');
      setIsRecording(true);
      setTimeout(() => {
        const fallback = ["I feel so happy to speak English without any pressure!","I would love to enjoy the delicious typical food with friends","This viral trend in my favorite social network looks quite interesting","I want to practice my pronunciation tools and speaking skills today in Greenfield"];
        if (handleSendMessageRef.current) handleSendMessageRef.current(fallback[Math.floor(Math.random() * fallback.length)]);
        setIsRecording(false);
      }, 1500);
    }
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      recordingStartTimeRef.current = 0;
      try { recognitionRef.current?.stop(); } catch (e) { console.log("Error al detener micro:", e); }
      setIsRecording(false);
      recognitionRef.current = null;
    } else {
      startSpeechRecognition();
    }
  };

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Sync state with localstorage
  useEffect(() => {
    localStorage.setItem('safezone_onboarded', String(isOnboarded));
  }, [isOnboarded]);

  useEffect(() => {
    localStorage.setItem('safezone_onboarding_data', JSON.stringify(onboarding));
  }, [onboarding]);

  useEffect(() => {
    localStorage.setItem('safezone_percepcion_data', JSON.stringify(percepcion));
  }, [percepcion]);

  useEffect(() => {
    localStorage.setItem('safezone_playback_rate', velocity);
  }, [velocity]);

  useEffect(() => {
    localStorage.setItem('safezone_chat_messages', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [messages, onboarding, velocity, percepcion]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      setTimeout(() => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  };

  // TTS via Google Translate (gratuito, sin API key)
  const handleSpeakText = async (text: string, messageId: string, overrideSpeed?: number) => {
    if (speakingMessageId === messageId && overrideSpeed === undefined) {
      audioRef.current?.pause();
      audioRef.current = null;
      setSpeakingMessageId(null);
      return;
    }

    const currentSpeed = overrideSpeed !== undefined ? overrideSpeed : parseFloat(velocity);

    setSpeakingMessageId(messageId);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, gender: voiceGender }),
      });

      if (!res.ok) throw new Error('TTS API error');

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.playbackRate = currentSpeed;
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setSpeakingMessageId(null);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setSpeakingMessageId(null);
      };

      audio.play();
    } catch (error) {
      console.error('[SafeZone TTS] Error reproducing audio:', error);
      audioRef.current = null;
      setSpeakingMessageId(null);
    }
  };

  // Actualiza playbackRate en tiempo real si la velocidad cambia mientras el audio se reproduce
  useEffect(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.playbackRate = parseFloat(velocity);
    }
  }, [velocity]);

  // Toggle Translation
  const toggleTranslation = (id: string) => {
    setRevealedTranslations(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Onboarding Question Choices
  const weekendActivities = ['Travel', 'Video Games', 'Food', 'Sports'];
  const socialNetworks = ['TikTok', 'Instagram', 'YouTube', 'X/Reddit'];
  const entertainmentTypes = ['Music', 'Movies/Series', 'Podcast Geek', 'Cooking'];

  const handleFinishOnboarding = () => {
    setIsOnboarded(true);
    const welcomeMsg: ChatMessage = {
      id: 'welcome',
      sender: 'ai',
      text: `Hi there! I'm Pal. Let's practice English talking about ${onboarding.actividad_preferida} and ${onboarding.entretenimiento}. How are you today?`,
      translation: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcomeMsg]);
  };

  // Reset Onboarding/Demo
  const handleResetData = () => {
    if (window.confirm('¿Quieres reiniciar tu configuración de SafeZone AI y reiniciar la simulación?')) {
      localStorage.removeItem('safezone_onboarded');
      localStorage.removeItem('safezone_onboarding_data');
      localStorage.removeItem('safezone_percepcion_data');
      localStorage.removeItem('safezone_chat_messages');
      setIsOnboarded(false);
      setMessages([{
        id: 'welcome',
        sender: 'ai',
        text: `Hi there! I'm Pal. Let's practice English talking about ${onboarding.actividad_preferida} and ${onboarding.entretenimiento}. How are you today?`,
        translation: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setRevealedTranslations({});
    }
  };

  // Generate Simulated AI reply based on user message and onboarding variables
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Intentar con Groq real via backend
    try {
      const mcerLevel = MODE_TO_MCER[conversationMode];

      let systemPrompt = (MCER_PROMPTS.safezone[mcerLevel] + LANG_LOCK)
        .replace('{actividad_preferida}', topicToEnglish(onboarding.actividad_preferida))
        .replace('{red_social}', onboarding.red_social)
        .replace('{entretenimiento}', topicToEnglish(onboarding.entretenimiento))
        .replace('{companion_type}', onboarding.companion_type || 'friend');

      if (unleashMode) {
        systemPrompt += '\n\nINSTRUCCIÓN ADICIONAL: El usuario ha activado el Modo Unleash en vivo. Abandona los temas cotidianos y cómodos; desafía inmediatamente al estudiante elevando la complejidad léxica, usando temas globales, debates o estructuras gramaticales avanzadas.';
      }

      if (config.safezone.enableJsonResponses) {
        systemPrompt += JSON_RESPONSE_SUFFIX;
      }

      const history = messages
        .filter(m => !m.isMilestone)
        .map(m => ({
          role: m.sender === 'ai' ? 'assistant' : 'user',
          parts: [{ text: m.text }]
        }));

      const currentSpeed = parseFloat(velocity);
      const { temperature, maxTokens } = MCER_BASE[mcerLevel];

      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history,
          systemPrompt,
          currentSpeed,
          temperature,
          maxTokens,
          hobby: onboarding.actividad_preferida,
          socialNetwork: onboarding.red_social,
          channel: onboarding.entretenimiento,
          escritoPercibido: percepcion.nivel_escrito_percibido,
          temorConversacional: percepcion.nivel_conversacional_percibido,
        })
      });

      if (!res.ok) throw new Error('API response not ok');

      const data = await res.json();
      const content = data.content || '';

      if (content) {
        const { cleanText, quickResponses } = extractQuickResponses(content);
        const msgId = (Date.now() + 1).toString();
        const aiMsg: ChatMessage = {
          id: msgId,
          sender: 'ai',
          text: cleanText || content,
          translation: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          quickResponses: quickResponses || undefined,
        };
        setMessages(prev => [...prev, aiMsg]);
        setIsTyping(false);
        handleSpeakText(cleanText || content, msgId);
        // Fetch Spanish translation in background
        translateText(cleanText || content, 'es').then(translation => {
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, translation } : m));
        });
        return;
      }
    } catch {
      console.warn('[SafeZone] Groq API falló, usando fallback local.');
    }

    // Fallback offline: lógica de templates local
    setTimeout(() => {
      let replyText = "";
      let replyTranslation = "";
      const textLower = textToSend.toLowerCase();
      const isFriend = onboarding.companion_type === 'friend';

      if (textLower.includes('slow') || textLower.includes('despacio') || textLower.includes('velocity')) {
        replyText = "Let's speak very slowly now, friend.";
        replyTranslation = "¡Hablemos muy despacio ahora, amigo!";
      } else if (textLower.includes('what is your name') || textLower.includes("what's your name") || textLower.includes('whats your name') || textLower.includes('your name') || textLower.includes('cómo te llamas') || textLower.includes('como te llamas')) {
        if (isFriend) {
          replyText = "Haha, did you forget my name, buddy? It's your childhood friend! Since we're in the SafeZone, I'm your personalized AI Companion, you can call me Buddy AI. How have you been?";
          replyTranslation = "Jaja, ¿te olvidaste de mi nombre, amigo mío? ¡Soy tu amigo de la infancia! Como estamos en SafeZone, soy tu compañero de IA personalizado, puedes llamarme Amigo AI. ¿Cómo has estado?";
        } else {
          replyText = "I am your SafeZone AI Helper! You can call me SafePal. I'm here to match your vibes and help you practice English without any stress. What's your name?";
          replyTranslation = "¡Soy tu asistente de SafeZone AI! Puedes llamarme SafePal. Estoy aquí para adaptarme a tu ritmo y ayudarte a practicar inglés sin estrés. ¿Cuál es tu nombre?";
        }
      } else if (textLower.includes('my name is') || textLower.includes('me llamo') || textLower.includes('soy ') || textLower.includes('rodrigo')) {
        const matches = textToSend.match(/(?:my name is|me llamo|soy|i am)\s+([a-zA-Záéíóúñ]+)/i);
        const nameDetected = matches ? matches[1] : "Rodrigo";
        const capitalizedName = nameDetected.charAt(0).toUpperCase() + nameDetected.slice(1);
        
        if (isFriend) {
          replyText = `Oh, of course I know your name is ${capitalizedName}! We've been friends forever, buddy. What are you up to today?`;
          replyTranslation = `¡Oh, claro que sé que tu nombre es ${capitalizedName}! Hemos sido amigos de toda la vida. ¿Qué estás haciendo hoy?`;
        } else {
          replyText = `It is wonderful to meet you, ${capitalizedName}! That is a fantastic name. I'm so happy to chat with you in this SafeZone. What would you like to talk about next?`;
          replyTranslation = `¡Es maravilloso conocerte, ${capitalizedName}! Es un nombre fantástico. Estoy muy feliz de conversar contigo en esta SafeZone. ¿De qué te gustaría hablar después?`;
        }
      } else if (textLower.includes('how are you') || textLower.includes('how you doing') || textLower.includes('how is it going') || textLower.includes('cómo estás') || textLower.includes('como estas') || textLower.includes('feel today')) {
        if (isFriend) {
          replyText = "I'm doing awesome, buddy! Just excited to hang out with you and chat. How are you feeling today in SafeZone?";
          replyTranslation = "¡Me va genial, amigo! Muy emocionado de pasar el rato contigo y platicar. ¿Cómo te sientes hoy en SafeZone?";
        } else {
          replyText = "I am doing wonderful, thank you for asking! I am ready to practice English at your preferred speed. How has your day been so far?";
          replyTranslation = "¡Estoy de maravilla, gracias por preguntar! Estoy listo para practicar inglés a tu velocidad preferida. ¿Cómo ha estado tu día hasta ahora?";
        }
      } else if (textLower.includes('pizza') || textLower.includes('food') || textLower.includes('comida') || textLower.includes('alitas')) {
        replyText = isFriend 
          ? "Oh in our childhood we ate so much good food! Tell me your absolute favorite food right now." 
          : "Delicious! Tell me your favorite food.";
        replyTranslation = isFriend 
          ? "¡Oh, en nuestra infancia comimos tanta comida deliciosa! Cuéntame cuál es tu comida favorita absoluta ahora mismo." 
          : "¡Delicioso! Cuéntame tu comida favorita.";
      } else if (textLower.includes('tiktok') || textLower.includes('video') || textLower.includes('social')) {
        replyText = isFriend 
          ? "Haha, yes! Do you spend too much time on TikTok like we used to spend on old games?" 
          : "Awesome! Do you watch TikTok everyday?";
        replyTranslation = isFriend 
          ? "¡Jaja, sí! ¿Pasas demasiado tiempo en TikTok como solíamos pasar en los juegos antiguos?" 
          : "¡Asombroso! ¿Ves TikTok todos os días?";
      } else if (textLower.includes('movie') || textLower.includes('película') || textLower.includes('terror') || textLower.includes('serie')) {
        replyText = isFriend 
          ? "Remember the movies we watched back then? What is your favorite movie of all time?" 
          : "Cool! What is your favorite movie?";
        replyTranslation = isFriend 
          ? "¿Te acuerdas de las películas que veíamos en ese entonces? ¿Cuál es tu película favorita de todos los tiempos?" 
          : "¡Genial! ¿Cuál es tu película favorita?";
      } else if (textLower.trim() === 'hi' || textLower.trim() === 'hello' || textLower.trim() === 'hey' || textLower.trim() === 'hola') {
        if (isFriend) {
          replyText = "Hey, buddy! So glad you reached out! How's everything going?";
          replyTranslation = "¡Hola, amigo! ¡Qué gusto que te reportes! ¿Cómo va todo?";
        } else {
          replyText = "Hello! A warm welcome to your SafeZone. I'm excited to talk to you. What is on your mind today?";
          replyTranslation = "¡Hola! Te doy una cálida bienvenida a tu SafeZone. Estoy emocionado de hablar contigo. ¿Qué tienes en mente hoy?";
        }
      } else {
        // General sympathetic English learning replies based on companion type
        const randomReplies = isFriend ? [
          {
            t: "That's awesome, buddy! Tell me more about it.",
            tr: "¡Eso es asombroso, amigo! Cuéntame más al respecto."
          },
          {
            t: "I totally agree with you! You are doing great speaking English.",
            tr: "¡Estoy totalmente de acuerdo contigo! Te está yendo súper bien hablando inglés."
          },
          {
            t: "No worries at all! Just express yourself, we have known each other forever.",
            tr: "¡No te preocupes para nada! Solo exprésate, nos conocemos de toda la vida."
          }
        ] : [
          {
            t: "Excellent! Please tell me more, friend.",
            tr: "¡Excelente! Por favor cuéntame más, amigo."
          },
          {
            t: "I agree! You write English well.",
            tr: "¡De acuerdo! Escribes bien en inglés."
          },
          {
            t: "Wonderful! Keep speaking without any fears.",
            tr: "¡Maravilloso! Sigue hablando sin ningún temor."
          }
        ];
        const selected = randomReplies[Math.floor(Math.random() * randomReplies.length)];
        replyText = selected.t;
        replyTranslation = selected.tr;
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: replyText,
        translation: replyTranslation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="w-full text-white space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#10b981]/15 rounded-xl border border-[#10b981]/20 text-[#10b981]">
              <Shield size={20} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight font-sans">
                SafeZone AI <span className="text-[10px] font-mono tracking-wider bg-[#10b981]/10 text-[#10b981] px-2 py-0.5 rounded border border-[#10b981]/20">ACTIVE LAB</span>
              </h2>
              <p className="text-xs text-white/50 font-medium">Búnker de confianza lingüística y control de velocidad conversacional sin ansiedad</p>
            </div>
          </div>
        </div>
        
        {isOnboarded && (
          <button
            onClick={handleResetData}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-white/60 hover:text-[#10b981] hover:bg-[#10b981]/5 hover:border-[#10b981]/10 transition-all uppercase tracking-wider"
          >
            <RotateCcw size={11} /> Reiniciar Simulación
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isOnboarded ? (
          /* ONBOARDING FLOW */
          <motion.div
            key="onboarding"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-xl mx-auto rounded-3xl border border-white/5 bg-[#0b0f19]/90 p-6 md:p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden"
          >
            {/* Ambient subtle glow background */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#10b981]/5 rounded-full filter blur-[60px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center gap-3 pb-6 border-b border-white/5 mb-6">
              <Sparkles size={14} className="text-[#10b981]" />
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#10b981]">
                  Configuración Inicial
                </span>
                <p className="text-[9px] font-mono text-white/40 font-medium mt-0.5">
                  Personaliza tu experiencia segura de IA
                </p>
              </div>
            </div>

            {/* Scrollable sections */}
            <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-7">
              {/* SECTION 1: INTERESTS */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-mono font-black uppercase tracking-wider text-white/50 flex items-center gap-2">
                  <Gamepad2 size={13} className="text-[#10b981]" /> Intereses y Preferencias
                </h3>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/60">¿Tus planes de fin de semana preferidos?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {weekendActivities.map(act => (
                      <button
                        key={act}
                        type="button"
                        onClick={() => setOnboarding(prev => ({ ...prev, actividad_preferida: act }))}
                        className={`p-3.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                          onboarding.actividad_preferida === act
                            ? 'bg-[#10b981]/15 border-[#10b981]/40 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/10 hover:bg-white/[0.04]'
                        }`}
                      >
                        {act}
                        {onboarding.actividad_preferida === act && <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/60">¿Cuál red social abres primero al despertar?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {socialNetworks.map(social => (
                      <button
                        key={social}
                        type="button"
                        onClick={() => setOnboarding(prev => ({ ...prev, red_social: social }))}
                        className={`p-3.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                          onboarding.red_social === social
                            ? 'bg-[#10b981]/15 border-[#10b981]/40 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/10 hover:bg-white/[0.04]'
                        }`}
                      >
                        {social}
                        {onboarding.red_social === social && <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/60">¿Tu entretenimiento digital preferido?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {entertainmentTypes.map(ent => (
                      <button
                        key={ent}
                        type="button"
                        onClick={() => setOnboarding(prev => ({ ...prev, entretenimiento: ent }))}
                        className={`p-3.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                          onboarding.entretenimiento === ent
                            ? 'bg-[#10b981]/15 border-[#10b981]/40 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/10 hover:bg-white/[0.04]'
                        }`}
                      >
                        {ent}
                        {onboarding.entretenimiento === ent && <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

              {/* SECTION 2: COMPANION */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-mono font-black uppercase tracking-wider text-white/50 flex items-center gap-2">
                  <UserCheck size={13} className="text-[#10b981]" /> Acompañante Conversacional
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOnboarding(prev => ({ ...prev, companion_type: 'friend' }))}
                    className={`p-4 rounded-2xl border text-xs font-bold transition-all text-left flex flex-col gap-2 ${
                      onboarding.companion_type === 'friend'
                        ? 'bg-[#10b981]/15 border-[#10b981]/40 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                        : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/10 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <User size={18} className={onboarding.companion_type === 'friend' ? 'text-[#10b981]' : 'text-white/40'} />
                      {onboarding.companion_type === 'friend' && <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-white">Amigo de la Infancia</p>
                      <p className="text-[9.5px] font-normal text-white/40 normal-case mt-0.5">Tono cálido, bromas amistosas y recuerdos de la infancia.</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboarding(prev => ({ ...prev, companion_type: 'stranger' }))}
                    className={`p-4 rounded-2xl border text-xs font-bold transition-all text-left flex flex-col gap-2 ${
                      onboarding.companion_type === 'stranger'
                        ? 'bg-[#10b981]/15 border-[#10b981]/40 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                        : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/10 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <HelpCircle size={18} className={onboarding.companion_type === 'stranger' ? 'text-[#10b981]' : 'text-white/40'} />
                      {onboarding.companion_type === 'stranger' && <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-white">Un Desconocido</p>
                      <p className="text-[9.5px] font-normal text-white/40 normal-case mt-0.5">Tono educado y respetuoso, preguntas casuales tipo rompehielos.</p>
                    </div>
                  </button>
                </div>
              </div>



              {/* SECTION 4: SLIDERS */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-mono font-black uppercase tracking-wider text-white/50 flex items-center gap-2">
                  <Sliders size={13} className="text-[#10b981]" /> Autopercepción de Dominio
                </h3>
                <p className="text-[10px] text-white/50 leading-relaxed -mt-2">
                  Estos rangos nos ayudan a calibrar la tolerancia a errores de la IA dentro de SafeZone.
                </p>
                <div className="space-y-4">
                  <div className="space-y-2.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10.5px] font-bold text-white/80">Nivel de Escritura Autopercibido</span>
                      <span className="text-xs font-mono font-black text-[#10b981]">{percepcion.nivel_escrito_percibido}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={percepcion.nivel_escrito_percibido}
                      onChange={(e) => setPercepcion(prev => ({ ...prev, nivel_escrito_percibido: parseInt(e.target.value) }))}
                      className="w-full accent-[#10b981] h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-white/30 uppercase tracking-widest pt-1">
                      <span>Principiante</span>
                      <span>Fluido</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10.5px] font-bold text-white/80">Nivel de Conversación Autopercibido</span>
                      <span className="text-xs font-mono font-black text-[#10b981]">{percepcion.nivel_conversacional_percibido}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={percepcion.nivel_conversacional_percibido}
                      onChange={(e) => setPercepcion(prev => ({ ...prev, nivel_conversacional_percibido: parseInt(e.target.value) }))}
                      className="w-full accent-[#10b981] h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-white/30 uppercase tracking-widest pt-1">
                      <span>Inicial</span>
                      <span>Avanzado</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="pt-6 border-t border-white/5 mt-6">
              <button
                onClick={handleFinishOnboarding}
                className="w-full py-3.5 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#10b981] hover:to-[#059669] text-black rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_10px_20px_rgba(16,185,129,0.2)]"
              >
                INICIAR EXPERIENCIA SEGURA
              </button>
            </div>
          </motion.div>
        ) : (
          /* CONVERSATIONAL CHAT SCREEN */
          <motion.div
            key="chat-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6"
          >
            {/* Left side: Chat Box & Sliders */}
            <div className="rounded-3xl border border-white/5 bg-[#0b0f19]/90 flex flex-col h-[650px] shadow-2xl relative overflow-hidden">
              
              {/* Velocity Cockpit Header Slider */}
              <div className="bg-black/60 p-4 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print shrink-0 relative z-[15]">
                <div className="space-y-0.5 text-left">
                  <span className="text-[8px] font-mono font-black text-[#10b981] tracking-[0.2em] uppercase block">Controles de Tráfico Seguro</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Sliders size={12} className="text-[#10b981]" /> Velocity Cockpit (Aceleración de Voz)
                  </h4>
                </div>
                
                <div className="flex-1 w-full max-w-sm space-y-1.5">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="1"
                      value={getVelocityIndex(velocity)}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value);
                        setVelocity(VELOCITY_STEPS[idx].value);
                      }}
                      className="flex-1 h-1.5 rounded-lg cursor-pointer focus:outline-none appearance-none"
                      style={{
                        background: `linear-gradient(to right, #10b981 ${(getVelocityIndex(velocity) / 3) * 100}%, rgba(255,255,255,0.1) ${(getVelocityIndex(velocity) / 3) * 100}%)`
                      }}
                    />
                    
                    <span className="px-3 py-1.5 rounded-xl text-[9.5px] font-mono font-black uppercase tracking-wider border shrink-0 min-w-[130px] text-center bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]">
                      {VELOCITY_STEPS[getVelocityIndex(velocity)].value}x
                    </span>
                  </div>
                  
                  {/* Textos de referencia (Ticks) debajo del slider — clic para saltar */}
                  <div className="flex justify-between items-center text-[7.5px] font-mono text-white/40 tracking-tight px-1 uppercase">
                    <button type="button" onClick={() => setVelocity(VELOCITY_STEPS[0].value)} className={`transition-colors hover:text-white/70 ${getVelocityIndex(velocity) === 0 ? "text-[#10b981] font-black" : ""}`}>[ 0.60x ]</button>
                    <button type="button" onClick={() => setVelocity(VELOCITY_STEPS[1].value)} className={`transition-colors hover:text-white/70 ${getVelocityIndex(velocity) === 1 ? "text-[#10b981] font-black" : ""}`}>[ 0.75x ]</button>
                    <button type="button" onClick={() => setVelocity(VELOCITY_STEPS[2].value)} className={`transition-colors hover:text-white/70 ${getVelocityIndex(velocity) === 2 ? "text-[#10b981] font-black" : ""}`}>[ 0.88x ]</button>
                    <button type="button" onClick={() => setVelocity(VELOCITY_STEPS[3].value)} className={`transition-colors hover:text-white/70 ${getVelocityIndex(velocity) === 3 ? "text-emerald-400 font-extrabold animate-pulse" : ""}`}>[ 1.00x ]</button>
                  </div>
                </div>
              </div>

              {/* Conversation Mode Selector (independent from Velocity Cockpit) */}
              <div className="px-4 pb-3 flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={() => {
                    if (conversationMode === 'basic') return;
                    setConversationMode('basic');
                    setMessages(prev => [...prev, {
                      id: 'milestone-' + Date.now(),
                      sender: 'ai',
                      text: '',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      isMilestone: true,
                      milestoneType: 'basic',
                    }]);
                  }}
                  className={`px-3 py-2 rounded-xl text-[9px] font-mono font-black uppercase tracking-wider border transition-all duration-300 ${
                    conversationMode === 'basic'
                      ? 'bg-orange-500/20 border-orange-400/50 text-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.3)]'
                      : 'bg-white/5 border-white/10 text-white/30 hover:border-white/20'
                  }`}
                >
                  Safe Pace
                </button>
                <button
                  onClick={() => {
                    if (conversationMode === 'casual') return;
                    setConversationMode('casual');
                    setMessages(prev => [...prev, {
                      id: 'milestone-' + Date.now(),
                      sender: 'ai',
                      text: '',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      isMilestone: true,
                      milestoneType: 'casual',
                    }]);
                  }}
                  className={`px-3 py-2 rounded-xl text-[9px] font-mono font-black uppercase tracking-wider border transition-all duration-300 ${
                    conversationMode === 'casual'
                      ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                      : 'bg-white/5 border-white/10 text-white/30 hover:border-white/20'
                  }`}
                >
                  🌐 Casual Bridge
                </button>
                <button
                  onClick={() => {
                    if (conversationMode === 'native') return;
                    setConversationMode('native');
                    setMessages(prev => [...prev, {
                      id: 'milestone-' + Date.now(),
                      sender: 'ai',
                      text: '',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      isMilestone: true,
                      milestoneType: 'native',
                    }]);
                  }}
                  className={`px-3 py-2 rounded-xl text-[9px] font-mono font-black uppercase tracking-wider border transition-all duration-300 ${
                    conversationMode === 'native'
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                      : 'bg-white/5 border-white/10 text-white/30 hover:border-white/20'
                  }`}
                >
                  🇺🇸 Native Mode
                </button>
                <span className="text-[8px] font-mono text-white/30 tracking-tight ml-1">
                  {conversationMode === 'basic' ? 'Word limits active' : conversationMode === 'casual' ? 'Stepping up naturally' : 'Full conversational freedom'}
                </span>
              </div>

              {/* Unleash Mode — Live Toggle */}
              <div className="px-4 pb-2 shrink-0">
                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition-all duration-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <Zap
                      size={12}
                      className={`shrink-0 transition-colors duration-300 ${
                        unleashMode ? 'text-[#DEFF9A]' : 'text-white/20'
                      }`}
                    />
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider transition-colors duration-300 ${
                        unleashMode ? 'text-[#DEFF9A]' : 'text-white/30'
                      }`}
                    >
                      UNLEASH
                    </span>
                    {unleashMode && (
                      <span className="text-[7px] font-mono text-[#DEFF9A]/60 tracking-wide truncate">
                        Modo libre activo — La IA ha elevado el nivel de vocabulario y discusión
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setUnleashMode(!unleashMode)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ${
                      unleashMode ? 'bg-gradient-to-r from-cyan-500 to-[#DEFF9A]' : 'bg-white/10'
                    }`}
                    role="switch"
                    aria-checked={unleashMode}
                    title={unleashMode ? 'Desactivar Modo Unleash' : 'Activar Modo Unleash'}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                        unleashMode ? 'translate-x-[18px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Chat scrolling log */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto max-h-[38vh] md:max-h-none p-5 space-y-4 custom-scrollbar bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.03),transparent)]"
              >
                {messages.map((msg) => {
                  if (msg.isMilestone) {
                    const milestoneConfig: Record<string, { color: string; label: string; glow: string }> = {
                      basic: { color: '#FF7A00', label: 'LEVEL UP: SAFE PACE (A1-A2) 🎯', glow: 'rgba(255,122,0,0.15)' },
                      casual: { color: '#FFD600', label: 'LEVEL UP: CASUAL BRIDGE (B1-B2) ⚡', glow: 'rgba(255,214,0,0.15)' },
                      native: { color: '#00E5A3', label: 'LEVEL UP: NATIVE MODE (C1-C2) 🚀', glow: 'rgba(0,229,163,0.15)' },
                    };
                    const mc = milestoneConfig[msg.milestoneType || 'basic'];
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 18, mass: 1 }}
                        className="relative flex flex-col items-center justify-center py-6"
                      >
                        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        <div
                          className="relative z-10 flex items-center gap-3 px-5 py-2.5 rounded-2xl border backdrop-blur-xl text-[10px] font-black uppercase tracking-wider"
                          style={{
                            backgroundColor: `${mc.color}10`,
                            borderColor: `${mc.color}30`,
                            color: mc.color,
                            boxShadow: `0 0 24px ${mc.glow}`,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{
                              backgroundColor: mc.color,
                              boxShadow: `0 0 12px ${mc.color}`,
                            }}
                          />
                          {mc.label}
                        </div>
                      </motion.div>
                    );
                  }
                  return (
                  <div 
                    key={msg.id}
                    className={`flex items-start gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    {/* Character Avatar perfectly aligned with first text line */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border text-[10px] font-black mt-1 ${
                      msg.sender === 'user' 
                        ? 'bg-[#10b981]/20 border-[#10b981]/30 text-[#10b981]' 
                        : 'bg-white/5 border-white/10 text-white/80'
                    }`}>
                      {msg.sender === 'user' ? <User size={13} /> : <Shield size={13} />}
                    </div>

                    <div className="space-y-1.5 text-left">
                      <div className={`p-4 rounded-2xl text-xs leading-relaxed space-y-2 relative group transition-all duration-300 ${
                        msg.sender === 'user'
                          ? 'bg-[#10b981]/15 border border-[#10b981]/30 text-white rounded-tr-none'
                          : 'bg-white/5 border border-white/5 text-white/90 rounded-tl-none'
                      }`}>
                        <p className="font-medium text-left">{msg.text}</p>
                        
                        {/* Toggle-able Spanish Help Underneath */}
                        {msg.sender === 'ai' && msg.translation && (
                          <div className={`pt-2 border-t border-white/5 transition-all duration-300 text-left ${
                            revealedTranslations[msg.id] ? 'block opacity-100' : 'hidden opacity-0'
                          }`}>
                            <p className="text-[10.5px] italic text-white/40 leading-relaxed text-left">
                              {msg.translation}
                            </p>
                          </div>
                        )}

                        {/* Speech Synth control for AI message */}
                        {msg.sender === 'ai' && (
                          <div className="flex flex-col sm:flex-row gap-2 mt-3 w-full text-left">
                            <button
                              type="button"
                              onClick={() => handleSpeakText(msg.text, msg.id)}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-[#10b981]/15 hover:text-[#10b981] border border-white/5 text-[9.5px] font-mono font-bold transition-all text-white/75 min-h-[40px]"
                            >
                              {speakingMessageId === msg.id ? (
                                <Activity size={11} className="animate-pulse text-[#10b981]" />
                              ) : (
                                <Volume2 size={11} />
                              )}
                              {speakingMessageId === msg.id ? 'Sonando...' : `Escuchar (${velocity}x)`}
                            </button>
                            
                            {/* Discrete Panic translation trigger */}
                            <button
                              type="button"
                              onClick={() => toggleTranslation(msg.id)}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-amber-400/15 hover:text-amber-400 border border-white/5 text-[9.5px] font-mono font-bold transition-all text-white/70 min-h-[40px]"
                              title="Auxilio de Traducción"
                            >
                              {revealedTranslations[msg.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                              {revealedTranslations[msg.id] ? 'Ocultar traducción' : 'Botón de Auxilio (Traducir)'}
                            </button>
                          </div>
                        )}

                        {/* Quick Response suggestions */}
                        {msg.sender === 'ai' && msg.quickResponses && msg.quickResponses.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/[0.04]">
                            {msg.quickResponses.map((qr, idx) => (
                              <motion.button
                                key={idx}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.08, duration: 0.25 }}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => {
                                  setInputText(qr);
                                  setTimeout(() => handleSendMessage(qr), 50);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-cyan-500/20 hover:border-cyan-400/40 text-[10px] font-medium text-white/60 hover:text-white transition-all"
                              >
                                {qr}
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <span className="text-[8px] font-mono text-white/30 block text-left">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                  );
                })}

                {isTyping && (
                  <div className="flex items-start gap-3 max-w-[85%] mr-auto">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border bg-white/5 border-white/10 text-white/80 mt-1">
                      <Shield size={13} />
                    </div>
                    <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-tl-none">
                      <div className="flex gap-1.5 items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pill Floating Buttons (Quick responses based on Onboarding) */}
              <div className="px-5 py-2.5 bg-black/40 border-t border-white/5 flex flex-wrap gap-2 justify-start items-center shrink-0 max-h-[85px] overflow-y-auto no-print">
                <span className="text-[8.5px] font-mono font-black text-white/30 uppercase tracking-wider block mr-1">Auxilios Rápidos:</span>
                <button
                  type="button"
                  onClick={() => {
                    const currentIdx = getVelocityIndex(velocity);
                    const lowerIdx = Math.max(0, currentIdx - 1);
                    const speedValue = VELOCITY_STEPS[lowerIdx].value;
                    setVelocity(speedValue);
                    localStorage.setItem('safezone_playback_rate', speedValue);
                    
                    const lastAiMsg = [...messages].reverse().find(m => m.sender === 'ai');
                    if (lastAiMsg) {
                      handleSpeakText(lastAiMsg.text, lastAiMsg.id, VELOCITY_STEPS[lowerIdx].speed);
                    }
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/5 text-[9px] font-bold text-white/60 hover:text-[#10b981] hover:border-[#10b981]/20 hover:bg-[#10b981]/10 transition-all cursor-pointer"
                >
                  🐢 Slower please
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputText("I want to talk about my favorite food: ");
                    setIsInputPulsing(true);
                    setTimeout(() => setIsInputPulsing(false), 1500);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/5 text-[9px] font-bold text-white/60 hover:text-[#10b981] hover:border-[#10b981]/20 hover:bg-[#10b981]/10 transition-all cursor-pointer"
                >
                  🍔 Topic: {onboarding.actividad_preferida}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputText(`My favorite social network is ${onboarding.red_social}: `);
                    setIsInputPulsing(true);
                    setTimeout(() => setIsInputPulsing(false), 1500);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/5 text-[9px] font-bold text-white/60 hover:text-[#10b981] hover:border-[#10b981]/20 hover:bg-[#10b981]/10 transition-all cursor-pointer"
                >
                  📱 Social: {onboarding.red_social}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputText("My favorite movie is ");
                    setIsInputPulsing(true);
                    setTimeout(() => setIsInputPulsing(false), 1500);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/5 text-[9px] font-bold text-white/60 hover:text-[#10b981] hover:border-[#10b981]/20 hover:bg-[#10b981]/10 transition-all cursor-pointer"
                >
                  🎬 Play: {onboarding.entretenimiento}
                </button>
              </div>

              {/* Chat Text Bar Form Input with Hybrid (Keyboard + Microphone) */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputText);
                }}
                className="sticky bottom-0 bg-[#0b0f19] z-10 p-3.5 border-t border-white/5 flex gap-2.5 items-center shrink-0 no-print"
              >
                {/* Voice Gender Selector Button */}
                <button
                  type="button"
                  onClick={() => setVoiceGender(prev => prev === 'female' ? 'male' : 'female')}
                  className="px-3 h-12 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-mono text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shrink-0 select-none cursor-pointer"
                  title="Acoplar género de voz de IA (TTS)"
                >
                  <span>Beta</span>
                  <span className="text-[12px]">{voiceGender === 'female' ? '👩' : '👨'}</span>
                </button>

                {/* Microphone trigger (walkie-talkie mode) */}
                <button
                  type="button"
                  onClick={handleToggleRecord}
                  title="Grabar respuestas por voz en inglés"
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer relative ${
                    isRecording 
                      ? 'bg-[#10b981] text-black shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-[#10b981]' 
                      : 'bg-[#1f2937] border border-white/10 text-white/60 hover:text-white hover:border-[#10b981]/40 hover:bg-white/[0.07]'
                  }`}
                >
                  {isRecording && (
                    <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  {isRecording ? <Mic size={18} className="relative z-10 text-black animate-pulse" /> : <Mic size={18} />}
                </button>

                {/* Central active keyboard text input */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isRecording ? "Listening to your voice... Speak in English!" : "Escribe en inglés con absoluta confianza (sin presiones)..."}
                  className={`flex-1 bg-white/[0.03] border rounded-2xl px-4 py-3 text-xs focus:outline-none focus:bg-white/[0.05] transition-all min-h-[48px] ${
                    isInputPulsing 
                      ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse text-emerald-300 font-bold' 
                      : 'border-white/10'
                  }`}
                />

                {/* Classic text submission button */}
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="w-12 h-[48px] bg-[#10b981] hover:bg-[#059669] text-black rounded-2xl transition-all disabled:opacity-30 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Send size={15} strokeWidth={2.5} />
                </button>
              </form>
            </div>

            {/* Right side: Sidebar parameters detailing Onboarding Passport */}
            <div className="space-y-6">
              {/* Onboarding Summary Badge card */}
              <div className="rounded-3xl border border-white/5 bg-[#0b0f19]/90 p-5 shadow-lg space-y-4">
                <span className="text-[8px] font-mono font-black text-[#10b981] tracking-[0.2em] uppercase block">PASAPORTE ACTIVO</span>
                <h4 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2 pb-3 border-b border-white/5">
                  <UserCheck size={12} className="text-[#10b981]" /> Filtro de Conversación
                </h4>

                <div className="space-y-3.5 pt-1.5">
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest font-black block">Hobby Preferido:</span>
                    <p className="text-xs font-bold text-white uppercase">{onboarding.actividad_preferida}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest font-black block">Red Social activa:</span>
                    <p className="text-xs font-bold text-[#10b981] uppercase">{onboarding.red_social}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest font-black block">Canal de Ocio:</span>
                    <p className="text-xs font-bold text-white uppercase">{onboarding.entretenimiento}</p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest font-black block">Acompañante AI:</span>
                    <p className="text-xs font-bold text-white uppercase">
                      {onboarding.companion_type === 'friend' ? 'Amigo de Infancia 👩👨' : 'Un Desconocido 👤'}
                    </p>
                    <span className="text-[9.5px] font-mono text-[#10b981] font-bold block">
                      Género: {onboarding.companion_gender === 'female' ? 'Femenino 👩' : onboarding.companion_gender === 'male' ? 'Masculino 👨' : 'No Binario ✨'}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-3">
                  <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest font-black block">Sintonía de Autocontrol:</span>
                  
                  <div className="flex justify-between items-center text-[11px] font-sans">
                    <span className="text-white/60">Escrito Percibido</span>
                    <span className="font-mono text-[#10b981] font-bold">{percepcion.nivel_escrito_percibido}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1">
                    <div className="bg-[#10b981] h-1 rounded-full transition-all" style={{ width: `${percepcion.nivel_escrito_percibido}%` }} />
                  </div>

                  <div className="flex justify-between items-center text-[11px] font-sans pt-1">
                    <span className="text-white/60">Temor Conversacional</span>
                    <span className="font-mono text-[#10b981] font-bold">{100 - percepcion.nivel_conversacional_percibido}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1">
                    <div className="bg-[#10b981] h-1 rounded-full transition-all" style={{ width: `${100 - percepcion.nivel_conversacional_percibido}%` }} />
                  </div>
                </div>
              </div>

              {/* Emotional Security Shield info */}
              <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#10b981]/5 to-transparent p-5 space-y-3">
                <div className="flex items-center gap-2 text-[#10b981] pb-2 border-b border-white/5">
                  <Shield size={14} />
                  <span className="text-[9.5px] font-mono font-black uppercase tracking-wider">Compromiso SafeZone</span>
                </div>
                
                <p className="text-[10px] text-white/60 leading-relaxed text-left font-sans">
                  Las pláticas y simulaciones realizadas en este módulo son **estrictamente privadas**. 
                </p>
                <p className="text-[10px] text-white/50 leading-relaxed text-left font-sans">
                  El docente solo recibe estadísticas agrupadas sobre tu incremento en la seguridad y el uso reducido del botón de auxilio semanal para evaluar tu avance de confianza lingüística.
                </p>

                <div className="pt-2 flex items-center gap-1.5 text-[#10b981] text-[9px] font-mono font-black uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
                  Métricas Agrupadas Activas
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
