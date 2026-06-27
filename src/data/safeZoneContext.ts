export interface OnboardingData {
  actividad_preferida: string;
  red_social: string;
  entretenimiento: string;
  companion_type?: 'friend' | 'stranger';
  companion_gender?: 'female' | 'male' | 'nonbinary';
}

export interface AutoPercepcion {
  nivel_escrito_percibido: number;
  nivel_conversacional_percibido: number;
}

export interface VelocityPresets {
  label: string;
  speed: number;
  description: string;
  bgColor: string;
}

export interface SafeZoneData {
  usuario: string;
  intereses_cotidianos: OnboardingData;
  auto_percepcion: AutoPercepcion;
  metricas_evolucion: {
    uso_boton_panico_semana_1: string;
    uso_boton_panico_semana_4: string;
  };
}

export const VELOCITY_PRESETS: Record<string, VelocityPresets> = {
  '0.60': {
    label: '0.60x (Búnker Profundo)',
    speed: 0.60,
    description: 'Ultralento, ideal para asimilar fonemas paso a paso con máxima calma.',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  },
  '0.75': {
    label: '0.75x (Búnker Controlado)',
    speed: 0.75,
    description: 'Súper pausado, ideal para procesar cada fonema con calma y seguridad.',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  },
  '0.88': {
    label: '0.88x (Modo Chill)',
    speed: 0.88,
    description: 'Ritmo natural relajado para entrenar el oído con calma.',
    bgColor: 'bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]',
  },
  '1.0': {
    label: '1.00x (Native Base - META MÁXIMA)',
    speed: 1.0,
    description: 'Velocidad real nativa estándar • ¡Tu meta definitiva!',
    bgColor: 'bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]',
  },
  '1.00': {
    label: '1.00x (Native Base - META MÁXIMA)',
    speed: 1.0,
    description: 'Velocidad real nativa estándar • ¡Tu meta definitiva!',
    bgColor: 'bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]',
  },
};

export const SAFEZONE_MOCK_DATA: SafeZoneData = {
  usuario: 'Estudiante de Prueba - ITSP Pánuco',
  intereses_cotidianos: {
    actividad_preferida: 'Probar alitas y restaurantes',
    red_social: 'TikTok',
    entretenimiento: 'Películas de terror',
  },
  auto_percepcion: {
    nivel_escrito_percibido: 45,
    nivel_conversacional_percibido: 20,
  },
  metricas_evolucion: {
    uso_boton_panico_semana_1: '85%',
    uso_boton_panico_semana_4: '20%',
  },
};

// Simple chat history structure for the simulation
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  translation?: string;
  timestamp: string;
  quickResponses?: string[];
  isMilestone?: boolean;
  milestoneType?: 'basic' | 'casual' | 'native';
}

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    sender: 'ai',
    text: "Hey, there! Welcome to your SafeZone. Since you enjoy movies and trying wings, how about we talk about that?",
    translation: "¡Hola! Bienvenido a tu SafeZone (Zona Segura). Ya que te gustan las películas y salir a comer alitas, ¿qué tal si hablamos sobre eso?",
    timestamp: '08:00 AM'
  },
  {
    id: '2',
    sender: 'user',
    text: "Hello! Yes, is a good idea. I like chicken wings very much.",
    timestamp: '08:01 AM'
  },
  {
    id: '3',
    sender: 'ai',
    text: "Awesome choice! Chicken wings are delicious, especially with spicy buffalo or sweet BBQ sauce. Which flavor is your absolute favorite?",
    translation: "¡Excelente elección! Las alitas de pollo son deliciosas, especialmente con salsa búfalo picante o BBQ dulce. ¿Cuál es tu sabor preferido por completo?",
    timestamp: '08:02 AM'
  }
];
