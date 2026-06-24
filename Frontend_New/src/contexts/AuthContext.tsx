import React, { createContext, useContext, useState } from 'react';

// Credentials obfuscated — admin / 1234
const _V = { u: 'YWRtaW4=', p: 'MTIzNA==' };

interface AuthCtx {
  isAuthenticated: boolean;
  login: (u: string, p: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
  isAuthenticated: false,
  login: () => false,
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try { return sessionStorage.getItem('_edp_auth') === '1'; } catch { return false; }
  });

  const login = (u: string, p: string): boolean => {
    if (btoa(u.trim().toLowerCase()) === _V.u && btoa(p) === _V.p) {
      try { sessionStorage.setItem('_edp_auth', '1'); } catch {}
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    try { sessionStorage.removeItem('_edp_auth'); } catch {}
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
