import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Firma, Klijent, Faktura, Uplata, Izvod } from '../types';
import { SheetsApi } from '../services/sheetsApi';
import { useAuth } from './AuthContext';
import { genId, danas } from '../utils/format';
import type { ImportRow } from '../utils/importParse';
import { normalizeFirma } from '../utils/importParse';

interface DataContextValue {
  loading: boolean;
  error: string | null;
  firme: Firma[];
  klijenti: Klijent[];
  fakture: Faktura[];
  uplate: Uplata[];
  izvodi: Izvod[];

  addKlijent: (k: Omit<Klijent, 'id' | 'kreiran'>) => Promise<void>;
  updateKlijent: (k: Klijent) => Promise<void>;
  deleteKlijent: (id: string) => Promise<void>;

  addFaktura: (f: Omit<Faktura, 'id' | 'kreirana'>) => Promise<void>;
  updateFaktura: (f: Faktura) => Promise<void>;
  deleteFaktura: (id: string) => Promise<void>;

  addUplata: (u: Omit<Uplata, 'id' | 'kreirana'>) => Promise<void>;
  deleteUplata: (id: string) => Promise<void>;

  addIzvod: (i: Omit<Izvod, 'id' | 'kreiran'>) => Promise<void>;

  batchImportFakture: (rows: ImportRow[]) => Promise<{ imported: number; skipped: string[] }>;

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
  const [izvodi, setIzvodi] = useState<Izvod[]>([]);
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
        setIzvodi(data.izvodi);
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

  const updateFaktura = useCallback(async (f: Faktura) => {
    const next = fakture.map(x => x.id === f.id ? f : x);
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

  // ── Izvodi ─────────────────────────────────────────────────────────────────

  const addIzvod = useCallback(async (data: Omit<Izvod, 'id' | 'kreiran'>) => {
    const i: Izvod = { ...data, id: genId(), kreiran: danas() };
    const next = [...izvodi, i];
    setIzvodi(next);
    await api().saveIzvodi(next);
  }, [izvodi]);

  // ── Batch import ──────────────────────────────────────────────────────────

  const batchImportFakture = useCallback(async (rows: ImportRow[]) => {
    const addDays = (dateStr: string, days: number) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    const nextKlijenti = [...klijenti];
    const nextFakture = [...fakture];
    const skipped: string[] = [];
    let imported = 0;

    for (const row of rows) {
      const firma = firme.find(f => normalizeFirma(f.naziv) === normalizeFirma(row.firma));
      if (!firma) {
        skipped.push(`${row.broj_fakture}: firma "${row.firma}" nije pronađena`);
        continue;
      }

      let klijent = nextKlijenti.find(k => normalizeFirma(k.naziv) === normalizeFirma(row.klijent));
      if (!klijent) {
        klijent = { id: genId(), naziv: row.klijent, adresa: '', pib: '', mb: '', email: '', telefon: '', kreiran: danas() };
        nextKlijenti.push(klijent);
      }

      const datumDospeca = (() => { try { return addDays(row.datum, 30); } catch { return row.datum; } })();
      const f: Faktura = {
        id: genId(),
        firmaId: firma.id,
        klijentId: klijent.id,
        broj: row.broj_fakture,
        datum: row.datum,
        datumDospeca,
        stavke: [{ id: genId(), opis: row.opis || 'Usluga', kolicina: 1, cenaPoJedinici: row.iznos, ukupno: row.iznos }],
        ukupanIznos: row.iznos,
        napomena: '',
        kreirana: danas(),
      };
      nextFakture.push(f);
      imported++;
    }

    setKlijenti(nextKlijenti);
    setFakture(nextFakture);
    await Promise.all([api().saveKlijenti(nextKlijenti), api().saveFakture(nextFakture)]);
    return { imported, skipped };
  }, [klijenti, fakture, firme]);

  // ── Pure helpers ───────────────────────────────────────────────────────────

  const getUplateZaFakturu = useCallback((fakturaId: string) =>
    uplate.filter(u => u.fakturaId === fakturaId), [uplate]);

  const getPlacenoZaFakturu = useCallback((fakturaId: string) =>
    uplate.filter(u => u.fakturaId === fakturaId).reduce((s, u) => s + u.iznos, 0), [uplate]);

  const getFaktureZaKlijenta = useCallback((klijentId: string, firmaId?: string) =>
    fakture.filter(f => f.klijentId === klijentId && (!firmaId || f.firmaId === firmaId)), [fakture]);

  return (
    <DataContext.Provider value={{
      loading, error, firme, klijenti, fakture, uplate, izvodi,
      addKlijent, updateKlijent, deleteKlijent,
      addFaktura, updateFaktura, deleteFaktura,
      addUplata, deleteUplata,
      addIzvod,
      batchImportFakture,
      getUplateZaFakturu, getPlacenoZaFakturu, getFaktureZaKlijenta,
    }}>
      {children}
    </DataContext.Provider>
  );
}
