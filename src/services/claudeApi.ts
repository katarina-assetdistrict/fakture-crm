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
