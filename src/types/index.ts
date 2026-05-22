export interface Klijent {
  id: string;
  naziv: string;
  adresa: string;
  pib: string;
  mb: string;
  email: string;
  telefon: string;
  kreiran: string;
}

export interface StavkaFakture {
  id: string;
  opis: string;
  kolicina: number;
  cenaPoJedinici: number;
  ukupno: number;
}

export interface Faktura {
  id: string;
  klijentId: string;
  broj: string;
  datum: string;
  datumDospeca: string;
  stavke: StavkaFakture[];
  ukupanIznos: number;
  napomena?: string;
  kreirana: string;
}

export interface Uplata {
  id: string;
  fakturaId: string;
  iznos: number;
  datum: string;
  napomena: string;
  kreirana: string;
}

export interface StanjeKlijenta {
  klijent: Klijent;
  ukupnoFakturisano: number;
  ukupnoPlaceno: number;
  dug: number;
  brojFaktura: number;
  faktureSaDugom: number;
}
