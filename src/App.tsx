/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthPortal } from './components/AuthPortal';
import { UserRole } from './components/MasterSwitcher';
import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from './context/AppContext';
import HubAisladoIA from './views/HubAisladoIA';

export interface UserSession {
  email: string;
  name: string;
  picture: string | null;
  role: UserRole;
}

export default function App() {
  const { setCurrentRole } = useAppContext();
  const [user, setUser] = useState<UserSession | null>(null);

  const logout = useCallback(async () => {
    const email = user?.email;
    localStorage.removeItem('tecnolingo_session');
    localStorage.removeItem('tecnolingo_user');
    setUser(null);
    setCurrentRole('DIRECTOR');
    if (email) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
      } catch { /* silent */ }
    }
  }, [user?.email, setCurrentRole]);

  useEffect(() => {
    const saved = localStorage.getItem('tecnolingo_user');
    if (saved) {
      try {
        const parsed: UserSession = JSON.parse(saved);
        setUser(parsed);
        setCurrentRole(parsed.role);
      } catch {
        localStorage.removeItem('tecnolingo_user');
      }
    }

    (window as any).tecnolingoLogout = logout;
  }, [logout, setCurrentRole]);

  const handleLogin = (session: UserSession) => {
    localStorage.setItem('tecnolingo_user', JSON.stringify(session));
    localStorage.setItem('tecnolingo_session', session.role);
    setCurrentRole(session.role);
    setUser(session);
  };

  if (!user) {
    return <AuthPortal onLogin={handleLogin} />;
  }

  return <HubAisladoIA />;
}


