import { createContext, useContext, useState } from 'react';

interface FirmaContextType {
  selectedFirmaId: string | undefined;
  setSelectedFirmaId: (id: string | undefined) => void;
}

const FirmaContext = createContext<FirmaContextType>({
  selectedFirmaId: undefined,
  setSelectedFirmaId: () => {},
});

export const useFirma = () => useContext(FirmaContext);

export function FirmaProvider({ children }: { children: React.ReactNode }) {
  const [selectedFirmaId, setSelectedFirmaId] = useState<string | undefined>(undefined);
  return (
    <FirmaContext.Provider value={{ selectedFirmaId, setSelectedFirmaId }}>
      {children}
    </FirmaContext.Provider>
  );
}
