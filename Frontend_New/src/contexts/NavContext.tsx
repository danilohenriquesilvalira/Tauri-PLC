import React, { createContext, useContext, useState, useCallback } from 'react';

interface NavContextType {
  paramAction: (() => void) | null;
  setParamAction: (fn: (() => void) | null) => void;
}

const NavContext = createContext<NavContextType>({
  paramAction: null,
  setParamAction: () => {},
});

export const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [paramAction, setParamActionRaw] = useState<(() => void) | null>(null);

  const setParamAction = useCallback((fn: (() => void) | null) => {
    // Wrap to avoid React treating fn as a state updater
    setParamActionRaw(fn !== null ? () => fn : null);
  }, []);

  return (
    <NavContext.Provider value={{ paramAction, setParamAction }}>
      {children}
    </NavContext.Provider>
  );
};

export const useNav = () => useContext(NavContext);
