/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthPortal } from './components/AuthPortal';
import { UserRole } from './components/MasterSwitcher';
import { useState, useEffect } from 'react';
import { useAppContext } from './context/AppContext';
import HubAisladoIA from './views/HubAisladoIA';

export default function App() {
  const { setCurrentRole } = useAppContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const lastSession = localStorage.getItem('tecnolingo_session');
    if (lastSession) {
      setIsAuthenticated(true);
    }

    (window as any).tecnolingoLogout = () => {
      localStorage.removeItem('tecnolingo_session');
      setIsAuthenticated(false);
    };
  }, []);

  const handleLogin = (role: UserRole) => {
    localStorage.setItem('tecnolingo_session', role);
    setCurrentRole(role);
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <AuthPortal onLogin={handleLogin} />;
  }

  return <HubAisladoIA />;
}


