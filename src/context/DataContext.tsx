import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Firma, Klijent, Faktura, Uplata } from '../types';
import { SheetsApi } from '../services/sheetsApi';
import { useAuth } from './AuthContext';
import { genId, danas } from '../utils/format';

interface DataContextValue {
  loading: boolean;
  error: string | null;
  firme: Firma[];
  klijenti: Klijent[];
  fakture: Faktura[];
  uplate: Uplata[];

  addKlijent: (k: Omit<Klijent, 'id' | 'kreiran'>) => Promise<void>;
  updateKlijent: (k: Klijent) => Promise<void>;
  deleteKlijent: (id: string) => Promise<void>;

  addFaktura: (f: Omit<Faktura, 'id' | 'kreirana'>) => Promise<void>;
  deleteFaktura: (id: string) => Promise<void>;

  addUplata: (u: Omit<Uplata, 'id' | 'kreirana'>) => Promise<void>;
  deleteUplata: (id: string) => Promise<void>;

  // Pure helpers (derived from in-memory data)
  getUplateZaFakturu: (fakturaId: string) => Uplata[];
  getPlacenoZaFakturu: (fakturaId: string) => number;
  getFaktureZaKlijenta: (klijentId: string, firmaId?: string) => Faktura[];
}

const DataContext = createContext<DataContextValue>({} as DataContextValue);
export const useData = () => useContext(DataContext);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { token, spreadsheetId, setSpreadsheetId, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firme, setFirme] = useState<Firma[]>([]);
  const [klijenti, setKlijenti] = useState<Klijent[]>([]);
  const [fakture, setFakture] = useState<Faktura[]>([]);
  const [uplate, setUplate] = useState<Uplata[]>([]);
  const apiRef = useRef<SheetsApi | null>(null);

  // Initialize: on login, create or load spreadsheet
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        let sheetId = spreadsheetId;

        if (!sheetId) {
          sheetId = await SheetsApi.createNew(token);
          setSpreadsheetId(sheetId);
        }

        const api = new SheetsApi(token, sheetId);
        apiRef.current = api;

        const data = await api.loadAll();
        setFirme(data.firme);
        setKlijenti(data.klijenti);
        setFakture(data.fakture);
        setUplate(data.uplate);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Greška pri učitavanju podataka';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [isAuthenticated, token]);

  const api = () => {
    if (!apiRef.current) throw new Error('API nije inicijalizovan');
    return apiRef.current;
  };

  // ── Klijenti ───────────────────────────────────────────────────────────────

  const addKlijent = useCallback(async (data: Omit<Klijent, 'id' | 'kreiran'>) => {
    const k: Klijent = { ...data, id: genId(), kreiran: danas() };
    const next = [...klijenti, k];
    setKlijenti(next);
    await api().saveKlijenti(next);
  }, [klijenti]);

  const updateKlijent = useCallback(async (k: Klijent) => {
    const next = klijenti.map(x => x.id === k.id ? k : x);
    setKlijenti(next);
    await api().saveKlijenti(next);
  }, [klijenti]);

  const deleteKlijent = useCallback(async (id: string) => {
    const faktureToDelete = new Set(fakture.filter(f => f.klijentId === id).map(f => f.id));
    const nextK = klijenti.filter(k => k.id !== id);
    const nextF = fakture.filter(f => f.klijentId !== id);
    const nextU = uplate.filter(u => !faktureToDelete.has(u.fakturaId));
    setKlijenti(nextK); setFakture(nextF); setUplate(nextU);
    await Promise.all([api().saveKlijenti(nextK), api().saveFakture(nextF), api().saveUplate(nextU)]);
  }, [klijenti, fakture, uplate]);

  // ── Fakture ────────────────────────────────────────────────────────────────

  const addFaktura = useCallback(async (data: Omit<Faktura, 'id' | 'kreirana'>) => {
    const f: Faktura = { ...data, id: genId(), kreirana: danas() };
    const next = [...fakture, f];
    setFakture(next);
    await api().saveFakture(next);
  }, [fakture]);

  const deleteFaktura = useCallback(async (id: string) => {
    const nextF = fakture.filter(f => f.id !== id);
    const nextU = uplate.filter(u => u.fakturaId !== id);
    setFakture(nextF); setUplate(nextU);
    await Promise.all([api().saveFakture(nextF), api().saveUplate(nextU)]);
  }, [fakture, uplate]);

  // ── Uplate ─────────────────────────────────────────────────────────────────

  const addUplata = useCallback(async (data: Omit<Uplata, 'id' | 'kreirana'>) => {
    const u: Uplata = { ...data, id: genId(), kreirana: danas() };
    const next = [...uplate, u];
    setUplate(next);
    await api().saveUplate(next);
  }, [uplate]);

  const deleteUplata = useCallback(async (id: string) => {
    const next = uplate.filter(u => u.id !== id);
    setUplate(next);
    await api().saveUplate(next);
  }, [uplate]);

  // ── Pure helpers ───────────────────────────────────────────────────────────

  const getUplateZaFakturu = useCallback((fakturaId: string) =>
    uplate.filter(u => u.fakturaId === fakturaId), [uplate]);

  const getPlacenoZaFakturu = useCallback((fakturaId: string) =>
    uplate.filter(u => u.fakturaId === fakturaId).reduce((s, u) => s + u.iznos, 0), [uplate]);

  const getFaktureZaKlijenta = useCallback((klijentId: string, firmaId?: string) =>
    fakture.filter(f => f.klijentId === klijentId && (!firmaId || f.firmaId === firmaId)), [fakture]);

  return (
    <DataContext.Provider value={{
      loading, error, firme, klijenti, fakture, uplate,
      addKlijent, updateKlijent, deleteKlijent,
      addFaktura, deleteFaktura,
      addUplata, deleteUplata,
      getUplateZaFakturu, getPlacenoZaFakturu, getFaktureZaKlijenta,
    }}>
      {children}
    </DataContext.Provider>
  );
}
