import type { Klijent, Faktura, Uplata } from '../types';

const KLJUCEVI = {
  klijenti: 'crm_klijenti',
  fakture: 'crm_fakture',
  uplate: 'crm_uplate',
};

function ucitaj<T>(kljuc: string): T[] {
  try {
    const data = localStorage.getItem(kljuc);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function sacuvaj<T>(kljuc: string, data: T[]): void {
  localStorage.setItem(kljuc, JSON.stringify(data));
}

// Klijenti
export const getKlijenti = (): Klijent[] => ucitaj<Klijent>(KLJUCEVI.klijenti);
export const saveKlijenti = (k: Klijent[]) => sacuvaj(KLJUCEVI.klijenti, k);

export const addKlijent = (k: Klijent) => {
  const lista = getKlijenti();
  lista.push(k);
  saveKlijenti(lista);
};

export const updateKlijent = (k: Klijent) => {
  const lista = getKlijenti().map(x => x.id === k.id ? k : x);
  saveKlijenti(lista);
};

export const deleteKlijent = (id: string) => {
  saveKlijenti(getKlijenti().filter(x => x.id !== id));
  saveFakture(getFakture().filter(f => {
    if (f.klijentId === id) {
      saveUplate(getUplate().filter(u => u.fakturaId !== f.id));
      return false;
    }
    return true;
  }));
};

// Fakture
export const getFakture = (): Faktura[] => ucitaj<Faktura>(KLJUCEVI.fakture);
export const saveFakture = (f: Faktura[]) => sacuvaj(KLJUCEVI.fakture, f);

export const addFaktura = (f: Faktura) => {
  const lista = getFakture();
  lista.push(f);
  saveFakture(lista);
};

export const updateFaktura = (f: Faktura) => {
  saveFakture(getFakture().map(x => x.id === f.id ? f : x));
};

export const deleteFaktura = (id: string) => {
  saveFakture(getFakture().filter(x => x.id !== id));
  saveUplate(getUplate().filter(u => u.fakturaId !== id));
};

// Uplate
export const getUplate = (): Uplata[] => ucitaj<Uplata>(KLJUCEVI.uplate);
export const saveUplate = (u: Uplata[]) => sacuvaj(KLJUCEVI.uplate, u);

export const addUplata = (u: Uplata) => {
  const lista = getUplate();
  lista.push(u);
  saveUplate(lista);
};

export const deleteUplata = (id: string) => {
  saveUplate(getUplate().filter(x => x.id !== id));
};

// Helpers
export const getUplateZaFakturu = (fakturaId: string): Uplata[] =>
  getUplate().filter(u => u.fakturaId === fakturaId);

export const getFaktureZaKlijenta = (klijentId: string): Faktura[] =>
  getFakture().filter(f => f.klijentId === klijentId);

export const getPlacenoZaFakturu = (fakturaId: string): number =>
  getUplateZaFakturu(fakturaId).reduce((s, u) => s + u.iznos, 0);

export const getDugZaFakturu = (fakturaId: string, ukupanIznos: number): number => {
  const placeno = getPlacenoZaFakturu(fakturaId);
  return Math.max(0, ukupanIznos - placeno);
};
