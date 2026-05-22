import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingDown, CheckCircle2, Clock, Download, ChevronRight } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useFirma } from '../context/FirmaContext';
import { formatRSD, godineFaktura } from '../utils/format';
import { exportFaktureExcel } from '../utils/export';
import type { StanjeKlijenta } from '../types';

export default function Dashboard() {
  const { selectedFirmaId } = useFirma();
  const { klijenti, fakture: sveFakture, uplate, firme, getPlacenoZaFakturu } = useData();
  const [godina, setGodina] = useState<number | undefined>(undefined);
  const godine = godineFaktura(sveFakture);

  const fakture = useMemo(
    () => sveFakture.filter(f =>
      (!selectedFirmaId || f.firmaId === selectedFirmaId) &&
      (!godina || new Date(f.datum).getFullYear() === godina)
    ),
    [selectedFirmaId, godina, sveFakture]
  );

  const stanja: StanjeKlijenta[] = useMemo(() => klijenti.map(k => {
    const kFakture = fakture.filter(f => f.klijentId === k.id);
    const ukupnoFakturisano = kFakture.reduce((s, f) => s + f.ukupanIznos, 0);
    const ukupnoPlaceno = kFakture.reduce((s, f) => s + getPlacenoZaFakturu(f.id), 0);
    const dug = Math.max(0, ukupnoFakturisano - ukupnoPlaceno);
    const faktureSaDugom = kFakture.filter(f => getPlacenoZaFakturu(f.id) < f.ukupanIznos).length;
    return { klijent: k, ukupnoFakturisano, ukupnoPlaceno, dug, brojFaktura: kFakture.length, faktureSaDugom };
  }).filter(s => s.brojFaktura > 0).sort((a, b) => b.dug - a.dug),
  [fakture, klijenti, uplate]);

  const ukupnoFakturisano = stanja.reduce((s, x) => s + x.ukupnoFakturisano, 0);
  const ukupnoPlaceno = stanja.reduce((s, x) => s + x.ukupnoPlaceno, 0);
  const ukupnoDug = stanja.reduce((s, x) => s + x.dug, 0);

  const handleExport = () => exportFaktureExcel(sveFakture, klijenti, firme, uplate, selectedFirmaId, godina);
  const naslovFirme = selectedFirmaId ? firme.find(f => f.id === selectedFirmaId)?.naziv : 'Sve firme';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">{naslovFirme}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={godina ?? ''} onChange={e => setGodina(e.target.value ? Number(e.target.value) : undefined)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Sve godine</option>
            {godine.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button onClick={handleExport}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Download size={15} /> Export Excel
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Clock size={15} />Ukupno fakturisano</div>
          <div className="text-2xl font-bold text-gray-900">{formatRSD(ukupnoFakturisano)}</div>
          <div className="text-xs text-gray-400 mt-1">{fakture.length} faktura</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-green-600 text-sm mb-1"><CheckCircle2 size={15} />Ukupno naplaćeno</div>
          <div className="text-2xl font-bold text-green-700">{formatRSD(ukupnoPlaceno)}</div>
          <div className="text-xs text-gray-400 mt-1">
            {ukupnoFakturisano > 0 ? Math.round((ukupnoPlaceno / ukupnoFakturisano) * 100) : 0}% od fakturisanog
          </div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-5">
          <div className="flex items-center gap-2 text-red-600 text-sm mb-1"><TrendingDown size={15} />Ukupan dug</div>
          <div className="text-2xl font-bold text-red-700">{formatRSD(ukupnoDug)}</div>
          <div className="text-xs text-red-400 mt-1">{stanja.filter(s => s.dug > 0).length} klijenata duguje</div>
        </div>
      </div>

      {/* Tabela stanja */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Stanje po klijentima</h2>
        </div>
        {stanja.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <EmptyIcon />
            <p className="mt-2 text-sm">Nema podataka za prikaz.</p>
            <Link to="/klijenti" className="mt-3 inline-block text-blue-600 text-sm hover:underline">Dodajte prvog klijenta →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                  {['Klijent', 'Fakturisano', 'Naplaćeno', 'Dug', 'Status', ''].map((h, i) => (
                    <th key={i} className={`px-5 py-3 font-medium ${i > 0 && i < 4 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stanja.map(s => (
                  <tr key={s.klijent.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-900">{s.klijent.naziv}</div>
                      <div className="text-xs text-gray-400">{s.brojFaktura} faktura{s.faktureSaDugom > 0 && `, ${s.faktureSaDugom} neizmirena`}</div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-700">{formatRSD(s.ukupnoFakturisano)}</td>
                    <td className="px-5 py-3.5 text-right text-green-700">{formatRSD(s.ukupnoPlaceno)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-red-700">{formatRSD(s.dug)}</td>
                    <td className="px-5 py-3.5"><StatusBadge dug={s.dug} placeno={s.ukupnoPlaceno} fakturisano={s.ukupnoFakturisano} /></td>
                    <td className="px-5 py-3.5">
                      <Link to={`/klijenti/${s.klijent.id}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                        Detalji <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ dug, placeno, fakturisano }: { dug: number; placeno: number; fakturisano: number }) {
  if (dug === 0 && fakturisano > 0) return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Izmireno</span>;
  if (placeno > 0 && dug > 0) return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Delimično</span>;
  return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Nije plaćeno</span>;
}
function EmptyIcon() {
  return <svg className="mx-auto text-gray-300" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}
