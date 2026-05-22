import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronRight, CalendarDays } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useFirma } from '../context/FirmaContext';
import { formatRSD, formatDatum } from '../utils/format';

export default function Uplate() {
  const { selectedFirmaId } = useFirma();
  const { uplate, fakture, klijenti, firme } = useData();

  const [filterOd, setFilterOd] = useState('');
  const [filterDo, setFilterDo] = useState('');

  const prikazaneUplate = [...uplate]
    .filter(u => !selectedFirmaId || u.firmaId === selectedFirmaId)
    .filter(u => !filterOd || u.datum >= filterOd)
    .filter(u => !filterDo || u.datum <= filterDo)
    .sort((a, b) => b.datum.localeCompare(a.datum));

  const ukupnoNaplaceno = prikazaneUplate.reduce((s, u) => s + u.iznos, 0);
  const hasFilters = filterOd || filterDo;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Uplate</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {prikazaneUplate.length} uplata · ukupno {formatRSD(ukupnoNaplaceno)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-5 bg-white rounded-xl border border-gray-200 px-4 py-3">
        <CalendarDays size={15} className="text-gray-400 mb-2 flex-shrink-0" />
        <div>
          <label className="text-xs text-gray-500 block mb-1">Od datuma</label>
          <input
            type="date" value={filterOd}
            onChange={e => setFilterOd(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Do datuma</label>
          <input
            type="date" value={filterDo}
            onChange={e => setFilterDo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {hasFilters && (
          <button
            onClick={() => { setFilterOd(''); setFilterDo(''); }}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 pb-0.5 transition-colors"
          >
            <X size={13} /> Resetuj
          </button>
        )}
        {hasFilters && (
          <span className="ml-auto text-xs text-blue-600 font-medium pb-0.5">
            Prikazano: {prikazaneUplate.length} od {uplate.filter(u => !selectedFirmaId || u.firmaId === selectedFirmaId).length}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        {prikazaneUplate.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {hasFilters
              ? 'Nema uplata za izabrani period.'
              : 'Nema evidentiranih uplata. Uvezite bankarski izvod u sekciji "Izvodi".'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Datum</th>
                  <th className="px-4 py-3 font-medium">Firma</th>
                  <th className="px-4 py-3 font-medium">Klijent</th>
                  <th className="px-4 py-3 font-medium">Faktura</th>
                  <th className="px-4 py-3 font-medium text-right">Iznos</th>
                  <th className="px-4 py-3 font-medium">Napomena</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {prikazaneUplate.map(u => {
                  const faktura = fakture.find(f => f.id === u.fakturaId);
                  const klijent = klijenti.find(k => k.id === faktura?.klijentId);
                  const firma = firme.find(f => f.id === u.firmaId);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600">{formatDatum(u.datum)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                          {firma?.naziv || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{klijent?.naziv || '—'}</td>
                      <td className="px-4 py-3">
                        {faktura
                          ? <Link to={`/fakture/${faktura.id}`} className="text-blue-600 hover:underline font-mono text-xs">{faktura.broj}</Link>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">{formatRSD(u.iznos)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs italic max-w-52 truncate">{u.napomena || '—'}</td>
                      <td className="px-4 py-3">
                        {faktura && (
                          <Link to={`/fakture/${faktura.id}`} className="text-gray-400 hover:text-blue-600">
                            <ChevronRight size={14} />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Ukupno naplaćeno:</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">{formatRSD(ukupnoNaplaceno)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
