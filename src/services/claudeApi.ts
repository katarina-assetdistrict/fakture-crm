import type { ImportRow } from '../utils/importParse';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-opus-4-5';

export interface TransakcijaIzvoda {
  datum: string;
  iznos: number;
  svrha: string;
  uplatioc: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve((e.target!.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error('Ne mogu pročitati fajl'));
    reader.readAsDataURL(file);
  });
}

async function callClaude(apiKey: string, prompt: string, pdfBase64: string): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401) throw new Error('Neispravan Anthropic API ključ');
    if (res.status === 400) throw new Error(`Neispravan zahtjev: ${body}`);
    throw new Error(`Claude API greška ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.content[0].text as string;
}

function extractJSON<T>(text: string): T {
  // Try to find a JSON array in the response
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Claude nije vratio validan JSON niz. Pokušajte ponovo.');
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    throw new Error('Greška pri parsiranju JSON-a iz Claude odgovora.');
  }
}

// ── Ekstrakcija faktura ───────────────────────────────────────────────────────

export async function extractFaktureFromPDF(
  apiKey: string,
  pdfBase64: string
): Promise<ImportRow[]> {
  const prompt = `Izvuci podatke o fakturama iz ovog PDF dokumenta.
Vrati SAMO JSON array, bez ikakvog teksta ili objašnjenja:

[{"firma":"...","klijent":"...","broj_fakture":"...","datum":"YYYY-MM-DD","iznos":0,"opis":"..."}]

Pravila:
- firma: naziv firme koja je IZDALA fakturu (pošiljalac/dobavljač)
- klijent: naziv firme koja PRIMA fakturu (kupac)
- broj_fakture: broj/oznaka fakture
- datum: datum u formatu YYYY-MM-DD
- iznos: ukupan iznos za plaćanje kao broj bez valute i bez separatora hiljada (npr. 150000, ne 150.000 ni 150,000)
- opis: kratki opis usluge ili robe

Ako u dokumentu ima više faktura, vrati sve kao niz.`;

  const text = await callClaude(apiKey, prompt, pdfBase64);
  const rows = extractJSON<ImportRow[]>(text);
  return rows.map(r => ({
    firma: String(r.firma ?? '').trim(),
    klijent: String(r.klijent ?? '').trim(),
    broj_fakture: String(r.broj_fakture ?? '').trim(),
    datum: String(r.datum ?? '').trim(),
    iznos: Number(r.iznos) || 0,
    opis: String(r.opis ?? '').trim(),
  }));
}

// ── Ekstrakcija izvoda ────────────────────────────────────────────────────────

export async function extractUplateFromIzvod(
  apiKey: string,
  pdfBase64: string
): Promise<TransakcijaIzvoda[]> {
  const prompt = `Izvuci sve uplate/transakcije iz bankovnog izvoda i vrati SAMO JSON array:
[{"datum":"YYYY-MM-DD","iznos":0,"svrha":"...","uplatioc":"..."}]
Samo prilivne transakcije (uplate koje su stigle na račun).
Iznos kao pozitivan broj bez valute.`;

  const text = await callClaude(apiKey, prompt, pdfBase64);
  const rows = extractJSON<TransakcijaIzvoda[]>(text);
  return rows.map(r => ({
    datum: String(r.datum ?? '').trim(),
    iznos: Number(r.iznos) || 0,
    svrha: String(r.svrha ?? '').trim(),
    uplatioc: String(r.uplatioc ?? '').trim(),
  }));
}
