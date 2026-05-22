export interface Firma {
  id: string;
  naziv: string;
  kreirana: string;
}

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
  firmaId: string;
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
  firmaId: string;
  iznos: number;
  datum: string;
  napomena: string;
  kreirana: string;
}

export interface Izvod {
  id: string;
  firmaId: string;
  firmaIme: string;
  datumIzvoda: string;
  nazivFajla: string;
  ukupnoPrilivno: number;
  brojTransakcija: number;
  kreiran: string;
}

export interface StanjeKlijenta {
  klijent: Klijent;
  ukupnoFakturisano: number;
  ukupnoPlaceno: number;
  dug: number;
  brojFaktura: number;
  faktureSaDugom: number;
}
