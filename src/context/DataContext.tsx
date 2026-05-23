import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Firma, Klijent, Faktura, Uplata, Izvod } from '../types';
import {
  subscribeFirme, subscribeKlijenti, subscribeFakture, subscribeUplate, subscribeIzvodi,
  upsertKlijent, upsertFaktura, upsertUplata, upsertIzvod,
  deleteKlijentDoc, deleteFakturaDoc, deleteUplataDoc,
  batchDelete, batchUpsert, seedFirme,
} from '../services/firestoreApi';
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

  getUplateZaFakturu: (fakturaId: string) => Uplata[];
  getPlacenoZaFakturu: (fakturaId: string) => number;
  getFaktureZaKlijenta: (klijentId: string, firmaId?: string) => Faktura[];
}

const DataContext = createContext<DataContextValue>({} as DataContextValue);
export const useData = () => useContext(DataContext);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { uid } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firme, setFirme] = useState<Firma[]>([]);
  const [klijenti, setKlijenti] = useState<Klijent[]>([]);
  const [fakture, setFakture] = useState<Faktura[]>([]);
  const [uplate, setUplate] = useState<Uplata[]>([]);
  const [izvodi, setIzvodi] = useState<Izvod[]>([]);

  // Track how many collections have received their first snapshot
  const [loaded, setLoaded] = useState(0);
  const TOTAL_COLLECTIONS = 5;

  useEffect(() => {
    if (!uid) return;

    setLoading(true);
    setError(null);
    setLoaded(0);

    const onFirst = () => setLoaded(n => n + 1);

    let firmeFirst = true;
    const unsubFirme = subscribeFirme(uid, (data) => {
      // Seed default firme for brand-new users
      if (firmeFirst && data.length === 0) {
        seedFirme(uid).catch(e => setError(String(e)));
      }
      firmeFirst = false;
      setFirme(data);
      onFirst();
    });

    let klijentiFirst = true;
    const unsubKlijenti = subscribeKlijenti(uid, (data) => {
      if (klijentiFirst) { klijentiFirst = false; onFirst(); }
      setKlijenti(data);
    });

    let faktureFirst = true;
    const unsubFakture = subscribeFakture(uid, (data) => {
      if (faktureFirst) { faktureFirst = false; onFirst(); }
      setFakture(data);
    });

    let uplateFirst = true;
    const unsubUplate = subscribeUplate(uid, (data) => {
      if (uplateFirst) { uplateFirst = false; onFirst(); }
      setUplate(data);
    });

    let izvodiFirst = true;
    const unsubIzvodi = subscribeIzvodi(uid, (data) => {
      if (izvodiFirst) { izvodiFirst = false; onFirst(); }
      setIzvodi(data);
    });

    return () => {
      unsubFirme(); unsubKlijenti(); unsubFakture(); unsubUplate(); unsubIzvodi();
    };
  }, [uid]);

  // Set loading=false once all collections have their first snapshot
  useEffect(() => {
    if (loaded >= TOTAL_COLLECTIONS) setLoading(false);
  }, [loaded]);

  const withError = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Greška pri snimanju podataka';
      setError(`Greška: ${msg}`);
      throw e;
    }
  };

  // ── Klijenti ───────────────────────────────────────────────────────────────

  const addKlijent = useCallback(async (data: Omit<Klijent, 'id' | 'kreiran'>) => {
    const k: Klijent = { ...data, id: genId(), kreiran: danas() };
    await withError(() => upsertKlijent(uid!, k));
  }, [uid]);

  const updateKlijent = useCallback(async (k: Klijent) => {
    await withError(() => upsertKlijent(uid!, k));
  }, [uid]);

  const deleteKlijent = useCallback(async (id: string) => {
    const faktureToDelete = fakture.filter(f => f.klijentId === id).map(f => f.id);
    const uplateToDelete = uplate.filter(u => faktureToDelete.includes(u.fakturaId)).map(u => u.id);
    await withError(async () => {
      await Promise.all([
        deleteKlijentDoc(uid!, id),
        batchDelete(uid!, 'fakture', faktureToDelete),
        batchDelete(uid!, 'uplate', uplateToDelete),
      ]);
    });
  }, [uid, fakture, uplate]);

  // ── Fakture ────────────────────────────────────────────────────────────────

  const addFaktura = useCallback(async (data: Omit<Faktura, 'id' | 'kreirana'>) => {
    const f: Faktura = { ...data, id: genId(), kreirana: danas() };
    await withError(() => upsertFaktura(uid!, f));
  }, [uid]);

  const updateFaktura = useCallback(async (f: Faktura) => {
    await withError(() => upsertFaktura(uid!, f));
  }, [uid]);

  const deleteFaktura = useCallback(async (id: string) => {
    const uplateToDelete = uplate.filter(u => u.fakturaId === id).map(u => u.id);
    await withError(async () => {
      await Promise.all([
        deleteFakturaDoc(uid!, id),
        batchDelete(uid!, 'uplate', uplateToDelete),
      ]);
    });
  }, [uid, uplate]);

  // ── Uplate ─────────────────────────────────────────────────────────────────

  const addUplata = useCallback(async (data: Omit<Uplata, 'id' | 'kreirana'>) => {
    const u: Uplata = { ...data, id: genId(), kreirana: danas() };
    await withError(() => upsertUplata(uid!, u));
  }, [uid]);

  const deleteUplata = useCallback(async (id: string) => {
    await withError(() => deleteUplataDoc(uid!, id));
  }, [uid]);

  // ── Izvodi ─────────────────────────────────────────────────────────────────

  const addIzvod = useCallback(async (data: Omit<Izvod, 'id' | 'kreiran'>) => {
    const i: Izvod = { ...data, id: genId(), kreiran: danas() };
    await withError(() => upsertIzvod(uid!, i));
  }, [uid]);

  // ── Batch import ───────────────────────────────────────────────────────────

  const batchImportFakture = useCallback(async (rows: ImportRow[]) => {
    const addDays = (dateStr: string, days: number) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    const newKlijenti: Klijent[] = [];
    const newFakture: Faktura[] = [];
    const skipped: string[] = [];
    let imported = 0;

    const allKlijenti = [...klijenti];

    for (const row of rows) {
      const firma = firme.find(f => normalizeFirma(f.naziv) === normalizeFirma(row.firma));
      if (!firma) {
        skipped.push(`${row.broj_fakture}: firma "${row.firma}" nije pronađena`);
        continue;
      }

      let klijent = allKlijenti.find(k => normalizeFirma(k.naziv) === normalizeFirma(row.klijent));
      if (!klijent) {
        klijent = { id: genId(), naziv: row.klijent, adresa: '', pib: '', mb: '', email: '', telefon: '', kreiran: danas() };
        allKlijenti.push(klijent);
        newKlijenti.push(klijent);
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
      newFakture.push(f);
      imported++;
    }

    await withError(async () => {
      await Promise.all([
        batchUpsert(uid!, 'klijenti', newKlijenti),
        batchUpsert(uid!, 'fakture', newFakture),
      ]);
    });

    return { imported, skipped };
  }, [uid, klijenti, fakture, firme]);

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
