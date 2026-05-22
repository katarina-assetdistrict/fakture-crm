import * as XLSX from 'xlsx';
import type { Firma, Klijent, Faktura, Uplata } from '../types';
import { getPlacenoZaFakturu, getDugZaFakturu } from './storage';
import { formatDatum } from './format';

export const exportFaktureExcel = (
  fakture: Faktura[],
  klijenti: Klijent[],
  firme: Firma[],
  uplate: Uplata[],
  firmaId?: string,
  godina?: number
) => {
  const wb = XLSX.utils.book_new();

  const filtrirane = fakture.filter(f => {
    const matchFirma = !firmaId || f.firmaId === firmaId;
    const matchGodina = !godina || new Date(f.datum).getFullYear() === godina;
    return matchFirma && matchGodina;
  });

  // Sheet 1: Fakture
  const redoviFaktura = filtrirane.map(f => {
    const klijent = klijenti.find(k => k.id === f.klijentId);
    const firma = firme.find(fi => fi.id === f.firmaId);
    const placeno = getPlacenoZaFakturu(f.id);
    const dug = getDugZaFakturu(f.id, f.ukupanIznos);
    return {
      'Firma': firma?.naziv || '',
      'Broj fakture': f.broj,
      'Klijent': klijent?.naziv || '',
      'Datum': formatDatum(f.datum),
      'Datum dospeća': formatDatum(f.datumDospeca),
      'Ukupan iznos (RSD)': f.ukupanIznos,
      'Plaćeno (RSD)': placeno,
      'Dug (RSD)': dug,
      'Status': dug === 0 ? 'Plaćeno' : placeno > 0 ? 'Delimično plaćeno' : 'Neplaćeno',
      'Napomena': f.napomena || '',
    };
  });

  const ws1 = XLSX.utils.json_to_sheet(redoviFaktura);
  ws1['!cols'] = [20, 14, 25, 12, 14, 18, 16, 14, 18, 30].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws1, 'Fakture');

  // Sheet 2: Uplate
  const filtUplateIds = new Set(filtrirane.map(f => f.id));
  const filtUplate = uplate.filter(u => filtUplateIds.has(u.fakturaId));

  const redoviUplata = filtUplate.map(u => {
    const faktura = fakture.find(f => f.id === u.fakturaId);
    const klijent = klijenti.find(k => k.id === faktura?.klijentId);
    const firma = firme.find(fi => fi.id === u.firmaId);
    return {
      'Firma': firma?.naziv || '',
      'Broj fakture': faktura?.broj || '',
      'Klijent': klijent?.naziv || '',
      'Iznos uplate (RSD)': u.iznos,
      'Datum uplate': formatDatum(u.datum),
      'Napomena': u.napomena,
    };
  });

  const ws2 = XLSX.utils.json_to_sheet(redoviUplata);
  ws2['!cols'] = [20, 14, 25, 18, 14, 40].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Uplate');

  // Sheet 3: Stanje po klijentima
  type StanjeEntry = { fakturisano: number; placeno: number; firme: Set<string> };
  const stanjeMap = new Map<string, StanjeEntry>();

  filtrirane.forEach(f => {
    const placeno = getPlacenoZaFakturu(f.id);
    const firma = firme.find(fi => fi.id === f.firmaId);
    const existing = stanjeMap.get(f.klijentId) || { fakturisano: 0, placeno: 0, firme: new Set<string>() };
    existing.fakturisano += f.ukupanIznos;
    existing.placeno += placeno;
    if (firma) existing.firme.add(firma.naziv);
    stanjeMap.set(f.klijentId, existing);
  });

  const redoviStanja = klijenti
    .filter(k => stanjeMap.has(k.id))
    .map(k => {
      const s = stanjeMap.get(k.id)!;
      return {
        'Klijent': k.naziv,
        'PIB': k.pib,
        'MB': k.mb,
        'Firme': Array.from(s.firme).join(', '),
        'Ukupno fakturisano (RSD)': s.fakturisano,
        'Ukupno plaćeno (RSD)': s.placeno,
        'Ukupan dug (RSD)': s.fakturisano - s.placeno,
      };
    });

  const ws3 = XLSX.utils.json_to_sheet(redoviStanja);
  ws3['!cols'] = [25, 12, 12, 30, 22, 20, 18].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws3, 'Stanje po klijentima');

  const naziv = `CRM_Fakture${firmaId ? `_${firme.find(f => f.id === firmaId)?.naziv}` : ''}${godina ? `_${godina}` : ''}.xlsx`;
  XLSX.writeFile(wb, naziv);
};
