import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import type { ImportRow } from '../utils/importParse';

const MODEL = 'claude-opus-4-5';

export interface TransakcijaIzvoda {
  datum: string;
  iznos: number;
  svrha: string;
  uplatioc: string;
}

export interface IzvodData {
  firma: string | null;
  datum_izvoda: string;
  transakcije: TransakcijaIzvoda[];
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

function makeClient(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

async function callClaude(apiKey: string, prompt: string, pdfBase64: string): Promise<string> {
  const client = makeClient(apiKey);

  const message: MessageParam = {
    role: 'user',
    content: [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
      },
      { type: 'text', text: prompt },
    ] as MessageParam['content'],
  };

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [message],
  });

  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Neočekivani tip odgovora od Claude');
  return block.text;
}

function extractJSON<T>(text: string): T {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Claude nije vratio validan JSON niz. Pokušajte ponovo.');
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    throw new Error('Greška pri parsiranju JSON-a iz Claude odgovora.');
  }
}

function extractJSONObject<T>(text: string): T {
  // Try whole text first (Claude sometimes returns pure JSON)
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    try { return JSON.parse(trimmed) as T; } catch { /* fall through */ }
  }
  // Walk the string to find the outermost { ... } block
  const start = text.indexOf('{');
  if (start === -1) throw new Error('Claude nije vratio validan JSON objekat. Pokušajte ponovo.');
  let depth = 0, end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error('Claude nije vratio validan JSON objekat. Pokušajte ponovo.');
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
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
- iznos: ukupan iznos za plaćanje kao broj bez valute i bez separatora hiljada (npr. 150000)
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

export async function extractIzvodData(
  apiKey: string,
  pdfBase64: string
): Promise<IzvodData> {
  const prompt = `Analiziraj ovaj bankarski izvod. Izvuci SVE prilivne transakcije (uplate na račun, pozitivni iznosi).
Ako nema prilivnih transakcija, vrati prazan niz za "transakcije".
Vrati SAMO JSON objekat, bez ikakvog drugog teksta:
{"firma":"naziv firme čiji je račun ili null","datum_izvoda":"YYYY-MM-DD","transakcije":[{"datum":"YYYY-MM-DD","iznos":0,"svrha":"...","uplatioc":"..."}]}
Iznosi kao pozitivni brojevi bez valute i separatora hiljada.`;

  const text = await callClaude(apiKey, prompt, pdfBase64);
  const raw = extractJSONObject<{ firma?: string | null; datum_izvoda?: string; transakcije?: unknown[] }>(text);

  return {
    firma: raw.firma ? String(raw.firma).trim() : null,
    datum_izvoda: String(raw.datum_izvoda ?? '').trim(),
    transakcije: (raw.transakcije ?? []).map((r: unknown) => {
      const t = r as Record<string, unknown>;
      return {
        datum: String(t.datum ?? '').trim(),
        iznos: Number(t.iznos) || 0,
        svrha: String(t.svrha ?? '').trim(),
        uplatioc: String(t.uplatioc ?? '').trim(),
      };
    }),
  };
}

// ── Legacy: direct uplata extraction (kept for backward compat) ───────────────

export async function extractUplateFromIzvod(
  apiKey: string,
  pdfBase64: string
): Promise<TransakcijaIzvoda[]> {
  const data = await extractIzvodData(apiKey, pdfBase64);
  return data.transakcije;
}
