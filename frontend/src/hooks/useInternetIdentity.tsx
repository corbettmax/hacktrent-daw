import React, { createContext, useContext, useState } from 'react';

// Minimal Internet Identity stub for local dev.
// Provides an `identity` object with a `getPrincipal()` method and basic login/clear helpers.

type Identity = {
  getPrincipal: () => { toString: () => string };
};

type ContextShape = {
  identity: Identity | null;
  isLoggingIn: boolean;
  login: () => Promise<void>;
  clear: () => void;
};

const IdentityContext = createContext<ContextShape | undefined>(undefined);

export const InternetIdentityProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const login = async () => {
    setIsLoggingIn(true);
    // For local dev we create a mock principal-like object
    await new Promise((r) => setTimeout(r, 200));
    setIdentity({ getPrincipal: () => ({ toString: () => 'mock-principal' }) });
    setIsLoggingIn(false);
  };

  const clear = () => setIdentity(null);

  return (
    <IdentityContext.Provider value={{ identity, isLoggingIn, login, clear }}>
      {children}
    </IdentityContext.Provider>
  );
};

export function useInternetIdentity() {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error('useInternetIdentity must be used within InternetIdentityProvider');
  return ctx;
}
