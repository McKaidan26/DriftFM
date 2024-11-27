import React, { createContext, useContext, useState } from 'react';

interface TTSContextType {
  creditsUsed: number;
  incrementCredits: (characterCount: number) => void;
  resetCreditsCount: () => void;
}

const TTSContext = createContext<TTSContextType | undefined>(undefined);

export function TTSProvider({ children }: { children: React.ReactNode }) {
  const [creditsUsed, setCreditsUsed] = useState(0);

  const incrementCredits = (characterCount: number) => {
    setCreditsUsed(prev => prev + characterCount);
  };

  const resetCreditsCount = () => {
    setCreditsUsed(0);
  };

  return (
    <TTSContext.Provider value={{
      creditsUsed,
      incrementCredits,
      resetCreditsCount,
    }}>
      {children}
    </TTSContext.Provider>
  );
}

export const useTTS = () => {
  const context = useContext(TTSContext);
  if (context === undefined) {
    throw new Error('useTTS must be used within a TTSProvider');
  }
  return context;
}; 