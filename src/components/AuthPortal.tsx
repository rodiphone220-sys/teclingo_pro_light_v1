/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import type { UserSession } from '../App';
import {
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowRight, 
  Chrome, 
  Terminal, 
  Sparkles,
  Zap,
  Globe,
  LogIn,
  UserPlus,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';

interface AuthPortalProps {
  onLogin: (session: UserSession) => void;
}

export function AuthPortal({ onLogin }: AuthPortalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [gisReady, setGisReady] = useState(false);

  const handleCredentialResponse = async (credential: string) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/google-one-tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `Error del servidor (${res.status})`);
      }
      const data = await res.json();
      onLogin({
        email: data.email,
        name: data.name,
        picture: data.picture || null,
        role: data.role || 'ALUMNO',
      });
    } catch (err: any) {
      setAuthError(err.message || 'Error de autenticación');
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    const checkGis = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts) {
        console.log("=== DETECTIVE DE ENTORNOS ===");
        console.log("¿Qué ID lee Vite?:", import.meta.env.VITE_GOOGLE_CLIENT_ID);
        console.log("Llaves que detecta Vite en total:", Object.keys(import.meta.env));
        google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: (response: any) => {
            if (response.credential) {
              handleCredentialResponse(response.credential);
            }
          },
          cancel_on_tap_outside: false,
        });
        setGisReady(true);
        clearInterval(checkGis);
      }
    }, 200);
    return () => clearInterval(checkGis);
  }, []);

  const handleGoogleLogin = () => {
    if (!gisReady) {
      setAuthError('Google Identity Services no disponible. Recarga la página.');
      return;
    }
    setIsAuthenticating(true);
    setAuthError(null);
    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed()) {
        setAuthError('No hay sesión de Google activa en este dispositivo.');
        setIsAuthenticating(false);
      }
      if (notification.isSkippedMoment() || notification.isDismissedMoment()) {
        setIsAuthenticating(false);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError(null);
    setTimeout(() => {
      setIsAuthenticating(false);
      onLogin({
        email: email || 'demo@teclingo.app',
        name: email?.split('@')[0] || 'Demo User',
        picture: null,
        role: 'ALUMNO',
      });
    }, 2000);
  };

  const handleDemoMode = () => {
    setIsAuthenticating(true);
    setAuthError(null);
    setTimeout(() => {
      setIsAuthenticating(false);
      onLogin({
        email: 'visitante@teclingo.app',
        name: 'Visitante',
        picture: null,
        role: 'ALUMNO',
      });
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-[#061a1a] flex flex-col min-h-[100dvh]"
    >
      {/* Background 3D Grid */}
      <div className="absolute inset-0 z-0">
         <div className="absolute inset-0 bg-[linear-gradient(rgba(222,255,154,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(222,255,154,0.05)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#DEFF9A]/05 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto flex-1 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 md:gap-12 px-4 py-6 md:py-12 overflow-y-auto max-h-full">
         {/* Brand Section */}
         <div className="w-full md:w-1/2 flex flex-col justify-center space-y-6 md:space-y-8 shrink-0">
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
               <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-[#DEFF9A]/10 border-2 border-[#DEFF9A]/20 flex items-center justify-center text-[#DEFF9A] shadow-[0_0_30px_rgba(222,255,154,0.2)] shrink-0">
                     <Globe size={24} className="md:size-[32px] animate-spin-slow" />
                  </div>
                  <div className="min-w-0">
                     <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic leading-tight">TECLINGO<span className="text-[#DEFF9A]"> PRO 1.1</span></h1>
                     <p className="text-[#DEFF9A] text-[7px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em]">Identity & Access Terminal</p>
                  </div>
               </div>

               <h2 className="text-white text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight leading-tight">
                  EL INICIO DE TU{' '}
                  <span className="text-white/20">MISIÓN LINGÜÍSTICA.</span>
               </h2>

               <div className="mt-6 md:mt-12 space-y-3 md:space-y-4 hidden sm:block">
                  <div className="flex items-center gap-4 p-3 md:p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                     <Zap size={16} className="md:size-[18px] text-[#DEFF9A] shrink-0" />
                     <div className="min-w-0">
                        <p className="text-white text-[10px] md:text-[11px] font-black uppercase tracking-widest">Velocidad Neuronal</p>
                        <p className="text-white/20 text-[8px] md:text-[9px] font-bold">Procesamiento de lenguaje natural en tiempo real.</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 md:p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                     <Sparkles size={16} className="md:size-[18px] text-cyan-400 shrink-0" />
                     <div className="min-w-0">
                        <p className="text-white text-[10px] md:text-[11px] font-black uppercase tracking-widest">Inmersión Spatial</p>
                        <p className="text-white/20 text-[8px] md:text-[9px] font-bold">Realidad aumentada y simulación fonética.</p>
                     </div>
                  </div>
               </div>
            </motion.div>
         </div>

         {/* Form Section */}
         <motion.div
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           transition={{ delay: 0.4 }}
           className="w-full md:w-1/2 shrink-0"
         >
            <div className="neo-glass border-[#DEFF9A]/20 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-[0_0_80px_rgba(0,0,0,0.5)]">
               {/* Mode Switcher */}
               <div className="flex bg-white/5 p-1.5 rounded-3xl mb-8 md:mb-12 relative overflow-hidden">
                  <motion.div
                    initial={false}
                    animate={{ x: mode === 'login' ? 0 : '100.5%' }}
                    className="absolute inset-y-1.5 left-1.5 w-[48%] bg-[#DEFF9A] rounded-2xl shadow-[0_0_20px_rgba(222,255,154,0.4)]"
                  />
                  <button
                    onClick={() => setMode('login')}
                    className={`relative z-10 flex-1 py-2 md:py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors ${mode === 'login' ? 'text-[#061a1a]' : 'text-white/40'}`}
                  >
                     <div className="flex items-center justify-center gap-2 md:gap-3">
                        <LogIn size={13} className="md:size-[14px]" /> LOGIN
                     </div>
                  </button>
                  <button
                    onClick={() => setMode('register')}
                    className={`relative z-10 flex-1 py-2 md:py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors ${mode === 'register' ? 'text-[#061a1a]' : 'text-white/40'}`}
                  >
                     <div className="flex items-center justify-center gap-2 md:gap-3">
                        <UserPlus size={13} className="md:size-[14px]" /> REGISTRO
                     </div>
                  </button>
               </div>

               {/* Google SSO Button */}
               <button
                 onClick={() => handleGoogleLogin()}
                 disabled={isAuthenticating}
                 className="w-full py-3 md:py-4 rounded-2xl md:rounded-3xl bg-white border border-white flex items-center justify-center gap-3 md:gap-4 text-black text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed transition-transform mb-6 md:mb-8 shadow-xl"
               >
                  {isAuthenticating ? (
                    <Loader2 size={18} className="md:size-[20px] animate-spin" />
                  ) : (
                    <Chrome size={18} className="md:size-[20px]" />
                  )}
                  {isAuthenticating ? 'AUTENTICANDO...' : 'Continuar con Google'}
               </button>

               {authError && (
                 <p className="text-red-400 text-[9px] font-bold uppercase tracking-widest text-center mb-4">{authError}</p>
               )}

               <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-white/20 text-[7px] md:text-[8px] font-black uppercase tracking-widest shrink-0">Ó acceso manual</span>
                  <div className="h-px flex-1 bg-white/10" />
               </div>

               {/* Manual Form */}
               <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                  <div className="space-y-1.5 md:space-y-2">
                     <label className="text-white/40 text-[8px] md:text-[9px] font-black uppercase tracking-widest ml-4">Email Corporativo</label>
                     <div className="relative">
                        <Mail className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 text-[#DEFF9A]/40 md:size-[18px]" size={16} />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="rod.mx@tecnolingo.ai"
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-4 md:py-5 pl-14 md:pl-16 pr-5 md:pr-6 text-white text-xs md:text-sm font-medium focus:outline-none focus:border-[#DEFF9A]/50 focus:ring-1 focus:ring-[#DEFF9A]/20 transition-all placeholder:text-white/10"
                        />
                     </div>
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                     <label className="text-white/40 text-[8px] md:text-[9px] font-black uppercase tracking-widest ml-4">Password</label>
                     <div className="relative">
                        <Lock className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 text-[#DEFF9A]/40 md:size-[18px]" size={16} />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-4 md:py-5 pl-14 md:pl-16 pr-5 md:pr-6 text-white text-xs md:text-sm font-medium focus:outline-none focus:border-[#DEFF9A]/50 focus:ring-1 focus:ring-[#DEFF9A]/20 transition-all placeholder:text-white/10"
                        />
                     </div>
                  </div>

                  <button
                    disabled={isAuthenticating}
                    className="w-full py-5 md:py-6 rounded-2xl md:rounded-3xl bg-[#DEFF9A] text-[#061a1a] text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] shadow-[0_0_40px_rgba(222,255,154,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 md:gap-4 group"
                  >
                     {isAuthenticating ? (
                       <Terminal size={16} className="md:size-[18px] animate-spin" />
                     ) : (
                       <>
                         {mode === 'login' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
                         <ArrowRight size={16} className="md:size-[18px] group-hover:translate-x-2 transition-transform" />
                       </>
                     )}
                  </button>
               </form>

               {/* Demo Toggle */}
               <div className="mt-8 md:mt-12 text-center">
                  <button
                    onClick={handleDemoMode}
                    className="group"
                  >
                     <p className="text-white/20 text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] group-hover:text-cyan-400 transition-colors">¿Eres visitante? <span className="text-[#DEFF9A] group-hover:text-cyan-400 decoration-[#DEFF9A] underline underline-offset-4 md:underline-offset-8">EXPLORAR EN MODO DEMO</span></p>
                  </button>
               </div>
            </div>
         </motion.div>
      </div>

      {/* Footer Legal */}
      <footer className="relative z-10 flex items-center justify-center gap-4 md:gap-8 px-4 pb-4 md:pb-6 text-[6px] md:text-[8px] font-black text-white/10 uppercase tracking-[0.3em] md:tracking-[0.5em] pointer-events-none shrink-0">
         <span>Version: Alpha 0.8.2</span>
         <div className="w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-white/20" />
         <span>© 2026 TECLINGO Protocols</span>
         <div className="w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-white/20" />
         <span>Secure-Core Enabled</span>
      </footer>
    </motion.div>
  );
}
