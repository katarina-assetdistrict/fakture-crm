import * as XLSX from 'xlsx';
import type { Firma, Klijent, Faktura, Uplata } from '../types';
import { formatDatum } from './format';

function calcPlaceno(uplate: Uplata[], fakturaId: string) {
  return uplate.filter(u => u.fakturaId === fakturaId).reduce((s, u) => s + u.iznos, 0);
}

export const exportFaktureExcel = (
  fakture: Faktura[],
  klijenti: Klijent[],
  firme: Firma[],
  uplate: Uplata[],
  firmaId?: string,
  godina?: number
) => {
  const wb = XLSX.utils.book_new();

  const filtrirane = fakture.filter(f =>
    (!firmaId || f.firmaId === firmaId) &&
    (!godina || new Date(f.datum).getFullYear() === godina)
  );

  // Sheet 1: Fakture
  const ws1 = XLSX.utils.json_to_sheet(filtrirane.map(f => {
    const placeno = calcPlaceno(uplate, f.id);
    const dug = Math.max(0, f.ukupanIznos - placeno);
    return {
      'Firma': firme.find(fi => fi.id === f.firmaId)?.naziv || '',
      'Broj fakture': f.broj,
      'Klijent': klijenti.find(k => k.id === f.klijentId)?.naziv || '',
      'Datum': formatDatum(f.datum),
      'Datum dospeća': formatDatum(f.datumDospeca),
      'Ukupan iznos (RSD)': f.ukupanIznos,
      'Plaćeno (RSD)': placeno,
      'Dug (RSD)': dug,
      'Status': dug === 0 ? 'Plaćeno' : placeno > 0 ? 'Delimično plaćeno' : 'Neplaćeno',
      'Napomena': f.napomena || '',
    };
  }));
  ws1['!cols'] = [20, 14, 25, 12, 14, 18, 16, 14, 18, 30].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws1, 'Fakture');

  // Sheet 2: Uplate
  const filtIds = new Set(filtrirane.map(f => f.id));
  const ws2 = XLSX.utils.json_to_sheet(uplate.filter(u => filtIds.has(u.fakturaId)).map(u => {
    const f = fakture.find(f => f.id === u.fakturaId);
    return {
      'Firma': firme.find(fi => fi.id === u.firmaId)?.naziv || '',
      'Broj fakture': f?.broj || '',
      'Klijent': klijenti.find(k => k.id === f?.klijentId)?.naziv || '',
      'Iznos uplate (RSD)': u.iznos,
      'Datum uplate': formatDatum(u.datum),
      'Napomena': u.napomena,
    };
  }));
  ws2['!cols'] = [20, 14, 25, 18, 14, 40].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Uplate');

  // Sheet 3: Stanje po klijentima
  type Entry = { fakturisano: number; placeno: number; firmeSet: Set<string> };
  const map = new Map<string, Entry>();
  filtrirane.forEach(f => {
    const pl = calcPlaceno(uplate, f.id);
    const fi = firme.find(fi => fi.id === f.firmaId);
    const e = map.get(f.klijentId) || { fakturisano: 0, placeno: 0, firmeSet: new Set<string>() };
    e.fakturisano += f.ukupanIznos; e.placeno += pl;
    if (fi) e.firmeSet.add(fi.naziv);
    map.set(f.klijentId, e);
  });
  const ws3 = XLSX.utils.json_to_sheet(klijenti.filter(k => map.has(k.id)).map(k => {
    const e = map.get(k.id)!;
    return {
      'Klijent': k.naziv, 'PIB': k.pib, 'MB': k.mb,
      'Firme': Array.from(e.firmeSet).join(', '),
      'Ukupno fakturisano (RSD)': e.fakturisano,
      'Ukupno plaćeno (RSD)': e.placeno,
      'Ukupan dug (RSD)': e.fakturisano - e.placeno,
    };
  }));
  ws3['!cols'] = [25, 12, 12, 30, 22, 20, 18].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws3, 'Stanje po klijentima');

  const firmanaziv = firmaId ? `_${firme.find(f => f.id === firmaId)?.naziv}` : '';
  XLSX.writeFile(wb, `CRM_Fakture${firmanaziv}${godina ? `_${godina}` : ''}.xlsx`);
};
