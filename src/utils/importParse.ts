export interface ImportRow {
  firma: string;
  klijent: string;
  broj_fakture: string;
  datum: string;
  iznos: number;
  opis: string;
}

export type ParseResult =
  | { ok: true; rows: ImportRow[] }
  | { ok: false; error: string };

export function parseImportFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const rows = file.name.toLowerCase().endsWith('.csv')
          ? parseCSV(text)
          : parseJSON(text);
        resolve({ ok: true, rows });
      } catch (err) {
        resolve({ ok: false, error: err instanceof Error ? err.message : 'Greška pri parsiranju fajla' });
      }
    };
    reader.onerror = () => resolve({ ok: false, error: 'Ne mogu pročitati fajl' });
    reader.readAsText(file, 'UTF-8');
  });
}

function parseJSON(text: string): ImportRow[] {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('JSON mora biti niz objekata [ {...}, ... ]');
  return data.map((row, i) => validateRow(row, i + 1));
}

function parseCSV(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV mora imati header red i barem jedan red podataka');
  const headers = csvSplit(lines[0]).map(h => h.trim());
  return lines.slice(1).map((line, i) => {
    const vals = csvSplit(line);
    const get = (key: string) => vals[headers.indexOf(key)]?.trim() ?? '';
    return validateRow({
      firma: get('firma'),
      klijent: get('klijent'),
      broj_fakture: get('broj_fakture'),
      datum: get('datum'),
      iznos: get('iznos'),
      opis: get('opis'),
    }, i + 2);
  });
}

function validateRow(row: Record<string, unknown>, lineNum: number): ImportRow {
  const required = ['firma', 'klijent', 'broj_fakture', 'datum', 'iznos'] as const;
  for (const key of required) {
    const val = row[key];
    if (val === undefined || val === null || val === '') {
      throw new Error(`Red ${lineNum}: nedostaje polje '${key}'`);
    }
  }
  const iznos = Number(row.iznos);
  if (isNaN(iznos)) throw new Error(`Red ${lineNum}: 'iznos' mora biti broj (dobijeno: '${row.iznos}')`);
  return {
    firma: String(row.firma).trim(),
    klijent: String(row.klijent).trim(),
    broj_fakture: String(row.broj_fakture).trim(),
    datum: String(row.datum).trim(),
    iznos,
    opis: String(row.opis ?? '').trim(),
  };
}

function csvSplit(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}
