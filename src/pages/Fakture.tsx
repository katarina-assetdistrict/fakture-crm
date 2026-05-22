import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, CheckCircle2, AlertCircle, ChevronRight, Download } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useFirma } from '../context/FirmaContext';
import { formatRSD, formatDatum, godineFaktura } from '../utils/format';
import { exportFaktureExcel } from '../utils/export';

export default function Fakture() {
  const { selectedFirmaId } = useFirma();
  const { fakture: sveFakture, klijenti, uplate, firme, getPlacenoZaFakturu } = useData();
  const [pretraga, setPretraga] = useState('');
  const [godina, setGodina] = useState<number | undefined>(undefined);
  const [klijentFilter, setKlijentFilter] = useState('');
  const [lokalnaFirma, setLokalnaFirma] = useState(selectedFirmaId ?? '');
  const godine = godineFaktura(sveFakture);
  const aktivnaFirma = lokalnaFirma || selectedFirmaId;

  const fakture = sveFakture
    .filter(f => {
      const k = klijenti.find(k => k.id === f.klijentId);
      return (
        (f.broj.toLowerCase().includes(pretraga.toLowerCase()) || k?.naziv.toLowerCase().includes(pretraga.toLowerCase())) &&
        (!godina || new Date(f.datum).getFullYear() === godina) &&
        (!klijentFilter || f.klijentId === klijentFilter) &&
        (!aktivnaFirma || f.firmaId === aktivnaFirma)
      );
    })
    .sort((a, b) => b.datum.localeCompare(a.datum));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fakture</h1>
          <p className="text-gray-500 text-sm mt-0.5">{sveFakture.length} faktura ukupno</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportFaktureExcel(sveFakture, klijenti, firme, uplate, aktivnaFirma || undefined, godina)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <Download size={14} /> Excel
          </button>
          <Link to="/fakture/nova"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nova faktura
          </Link>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input value={pretraga} onChange={e => setPretraga(e.target.value)}
            placeholder="Pretraži po broju fakture ili klijentu..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={lokalnaFirma} onChange={e => setLokalnaFirma(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Sve firme</option>
          {firme.map(f => <option key={f.id} value={f.id}>{f.naziv}</option>)}
        </select>
        <select value={klijentFilter} onChange={e => setKlijentFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Svi klijenti</option>
          {klijenti.map(k => <option key={k.id} value={k.id}>{k.naziv}</option>)}
        </select>
        <select value={godina ?? ''} onChange={e => setGodina(e.target.value ? Number(e.target.value) : undefined)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Sve godine</option>
          {godine.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {fakture.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {pretraga || godina || klijentFilter || aktivnaFirma ? 'Nema rezultata.' : 'Nema faktura. Dodajte prvu fakturu.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                  {['Faktura', 'Firma', 'Klijent', 'Datum', 'Dospeće', 'Iznos', 'Plaćeno', 'Dug', 'Status', ''].map((h, i) => (
                    <th key={i} className={`px-4 py-3 font-medium ${['Iznos', 'Plaćeno', 'Dug'].includes(h) ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fakture.map(f => {
                  const klijent = klijenti.find(k => k.id === f.klijentId);
                  const firma = firme.find(fi => fi.id === f.firmaId);
                  const placeno = getPlacenoZaFakturu(f.id);
                  const dug = Math.max(0, f.ukupanIznos - placeno);
                  const prosloRok = new Date(f.datumDospeca) < new Date() && dug > 0;
                  return (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {dug === 0 ? <CheckCircle2 className="text-green-500 flex-shrink-0" size={14} /> : <AlertCircle className={`flex-shrink-0 ${prosloRok ? 'text-red-500' : 'text-amber-500'}`} size={14} />}
                          <span className="font-medium text-gray-900">{f.broj}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">{firma?.naziv || '—'}</span></td>
                      <td className="px-4 py-3.5 text-gray-700">{klijent?.naziv || '—'}</td>
                      <td className="px-4 py-3.5 text-gray-600">{formatDatum(f.datum)}</td>
                      <td className={`px-4 py-3.5 ${prosloRok ? 'text-red-600 font-medium' : 'text-gray-600'}`}>{formatDatum(f.datumDospeca)}{prosloRok && <span className="text-xs ml-1">(isteklo)</span>}</td>
                      <td className="px-4 py-3.5 text-right font-medium text-gray-900">{formatRSD(f.ukupanIznos)}</td>
                      <td className="px-4 py-3.5 text-right text-green-700">{formatRSD(placeno)}</td>
                      <td className="px-4 py-3.5 text-right text-red-700 font-semibold">{dug > 0 ? formatRSD(dug) : '—'}</td>
                      <td className="px-4 py-3.5">
                        {dug === 0 ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Plaćeno</span>
                          : placeno > 0 ? <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">Delimično</span>
                          : <span className={`px-2 py-1 rounded-full text-xs ${prosloRok ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{prosloRok ? 'Isteklo' : 'Neplaćeno'}</span>}
                      </td>
                      <td className="px-4 py-3.5"><Link to={`/fakture/${f.id}`} className="text-blue-600 hover:text-blue-800"><ChevronRight size={16} /></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
