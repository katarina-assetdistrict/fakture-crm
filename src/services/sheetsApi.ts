import type { Firma, Klijent, Faktura, Uplata, Izvod } from '../types';

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

const DEFAULT_FIRME: Firma[] = [
  { id: 'firma-best-app', naziv: 'Best App d.o.o.', kreirana: '2024-01-01' },
  { id: 'firma-best-digital', naziv: 'Best Digital', kreirana: '2024-01-01' },
];

// ── Serialization ────────────────────────────────────────────────────────────

const HEADERS = {
  Firme:    ['id', 'naziv', 'kreirana'],
  Klijenti: ['id', 'naziv', 'adresa', 'pib', 'mb', 'email', 'telefon', 'kreiran'],
  Fakture:  ['id', 'firmaId', 'klijentId', 'broj', 'datum', 'datumDospeca', 'stavkeJson', 'ukupanIznos', 'napomena', 'kreirana'],
  Uplate:   ['id', 'fakturaId', 'firmaId', 'iznos', 'datum', 'napomena', 'kreirana'],
  Izvodi:   ['id', 'firmaId', 'firmaIme', 'datumIzvoda', 'nazivFajla', 'ukupnoPrilivno', 'brojTransakcija', 'kreiran'],
};

const toRow = {
  firma:    (f: Firma): string[]  => [f.id, f.naziv, f.kreirana],
  klijent:  (k: Klijent): string[] => [k.id, k.naziv, k.adresa, k.pib, k.mb, k.email, k.telefon, k.kreiran],
  faktura:  (f: Faktura): string[] => [f.id, f.firmaId, f.klijentId, f.broj, f.datum, f.datumDospeca, JSON.stringify(f.stavke), String(f.ukupanIznos), f.napomena ?? '', f.kreirana],
  uplata:   (u: Uplata): string[]  => [u.id, u.fakturaId, u.firmaId, String(u.iznos), u.datum, u.napomena, u.kreirana],
  izvod:    (i: Izvod): string[]   => [i.id, i.firmaId, i.firmaIme, i.datumIzvoda, i.nazivFajla, String(i.ukupnoPrilivno), String(i.brojTransakcija), i.kreiran],
};

const fromRow = {
  firma:   (r: string[]): Firma    => ({ id: r[0], naziv: r[1], kreirana: r[2] }),
  klijent: (r: string[]): Klijent  => ({ id: r[0], naziv: r[1], adresa: r[2]||'', pib: r[3]||'', mb: r[4]||'', email: r[5]||'', telefon: r[6]||'', kreiran: r[7]||'' }),
  faktura: (r: string[]): Faktura  => ({ id: r[0], firmaId: r[1], klijentId: r[2], broj: r[3], datum: r[4], datumDospeca: r[5]||'', stavke: JSON.parse(r[6]||'[]'), ukupanIznos: Number(r[7])||0, napomena: r[8]||'', kreirana: r[9]||'' }),
  uplata:  (r: string[]): Uplata   => ({ id: r[0], fakturaId: r[1], firmaId: r[2], iznos: Number(r[3])||0, datum: r[4], napomena: r[5]||'', kreirana: r[6]||'' }),
  izvod:   (r: string[]): Izvod    => ({ id: r[0], firmaId: r[1]||'', firmaIme: r[2]||'', datumIzvoda: r[3]||'', nazivFajla: r[4]||'', ukupnoPrilivno: Number(r[5])||0, brojTransakcija: Number(r[6])||0, kreiran: r[7]||'' }),
};

// ── API Class ─────────────────────────────────────────────────────────────────

export class SheetsApi {
  private token: string;
  private spreadsheetId: string;

  constructor(token: string, spreadsheetId: string) {
    this.token = token;
    this.spreadsheetId = spreadsheetId;
  }

  private get h() {
    return { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' };
  }

  private async check(res: Response) {
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Sheets API ${res.status}: ${body}`);
    }
    return res;
  }

  // Create a brand new spreadsheet, write headers + seed data, return the ID
  static async createNew(token: string): Promise<string> {
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const res = await fetch(BASE, {
      method: 'POST', headers: h,
      body: JSON.stringify({
        properties: { title: 'FaktCRM' },
        sheets: Object.keys(HEADERS).map(title => ({ properties: { title } })),
      }),
    });
    if (!res.ok) throw new Error(`Ne mogu da kreiram spreadsheet: ${res.status}`);
    const data = await res.json();
    const id = data.spreadsheetId as string;

    // Write headers + seed firme
    const api = new SheetsApi(token, id);
    await api.writeRaw('Firme',    [HEADERS.Firme,    ...DEFAULT_FIRME.map(toRow.firma)]);
    await api.writeRaw('Klijenti', [HEADERS.Klijenti]);
    await api.writeRaw('Fakture',  [HEADERS.Fakture]);
    await api.writeRaw('Uplate',   [HEADERS.Uplate]);
    await api.writeRaw('Izvodi',   [HEADERS.Izvodi]);
    return id;
  }

  private async writeRaw(sheet: string, rows: string[][]): Promise<void> {
    await fetch(`${BASE}/${this.spreadsheetId}/values/${encodeURIComponent(sheet)}:clear`, {
      method: 'POST', headers: this.h,
    });
    if (rows.length === 0) return;
    await this.check(await fetch(
      `${BASE}/${this.spreadsheetId}/values/${encodeURIComponent(sheet)}!A1?valueInputOption=RAW`,
      { method: 'PUT', headers: this.h, body: JSON.stringify({ values: rows }) }
    ));
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  private async readSheet(sheet: string): Promise<string[][]> {
    const res = await this.check(await fetch(
      `${BASE}/${this.spreadsheetId}/values/${encodeURIComponent(sheet)}`,
      { headers: this.h }
    ));
    const data = await res.json();
    const rows: string[][] = data.values || [];
    return rows.slice(1); // skip header row
  }

  // Like readSheet but returns [] gracefully if the sheet doesn't exist yet
  private async readSheetOptional(sheet: string): Promise<string[][]> {
    const res = await fetch(
      `${BASE}/${this.spreadsheetId}/values/${encodeURIComponent(sheet)}`,
      { headers: this.h }
    );
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    if (!res.ok) return []; // sheet doesn't exist — that's fine
    const data = await res.json();
    const rows: string[][] = data.values || [];
    return rows.slice(1);
  }

  async loadAll() {
    const [firmeRows, klijentiRows, faktureRows, uplateRows, izvodiRows] = await Promise.all([
      this.readSheet('Firme'),
      this.readSheet('Klijenti'),
      this.readSheet('Fakture'),
      this.readSheet('Uplate'),
      this.readSheetOptional('Izvodi'),
    ]);
    return {
      firme:    firmeRows.filter(r => r[0]).map(fromRow.firma),
      klijenti: klijentiRows.filter(r => r[0]).map(fromRow.klijent),
      fakture:  faktureRows.filter(r => r[0]).map(fromRow.faktura),
      uplate:   uplateRows.filter(r => r[0]).map(fromRow.uplata),
      izvodi:   izvodiRows.filter(r => r[0]).map(fromRow.izvod),
    };
  }

  // ── Write (full-sheet rewrite) ──────────────────────────────────────────────

  async saveFirme(firme: Firma[])       { await this.writeRaw('Firme',    [HEADERS.Firme,    ...firme.map(toRow.firma)]); }
  async saveKlijenti(k: Klijent[])      { await this.writeRaw('Klijenti', [HEADERS.Klijenti, ...k.map(toRow.klijent)]); }
  async saveFakture(f: Faktura[])       { await this.writeRaw('Fakture',  [HEADERS.Fakture,  ...f.map(toRow.faktura)]); }
  async saveUplate(u: Uplata[])         { await this.writeRaw('Uplate',   [HEADERS.Uplate,   ...u.map(toRow.uplata)]); }

  async saveIzvodi(izvodi: Izvod[]): Promise<void> {
    try {
      await this.writeRaw('Izvodi', [HEADERS.Izvodi, ...izvodi.map(toRow.izvod)]);
    } catch {
      // Sheet doesn't exist yet (old spreadsheet) — create it and retry
      await fetch(`${BASE}/${this.spreadsheetId}:batchUpdate`, {
        method: 'POST', headers: this.h,
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: 'Izvodi' } } }] }),
      });
      await this.writeRaw('Izvodi', [HEADERS.Izvodi, ...izvodi.map(toRow.izvod)]);
    }
  }
}
