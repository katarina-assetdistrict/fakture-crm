import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, CheckCircle2, AlertCircle, ChevronRight, Building2 } from 'lucide-react';
import { getKlijenti, getFaktureZaKlijenta, getPlacenoZaFakturu, getUplateZaFakturu, getFirme } from '../utils/storage';
import { formatRSD, formatDatum } from '../utils/format';
import { useFirma } from '../context/FirmaContext';

export default function KlijentDetalji() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedFirmaId } = useFirma();
  const [godina, setGodina] = useState<number | undefined>(undefined);
  const [firmaFilter, setFirmaFilter] = useState(selectedFirmaId ?? '');

  const klijent = getKlijenti().find(k => k.id === id);
  if (!klijent) return <div className="p-8 text-gray-500">Klijent nije pronađen.</div>;

  const firme = getFirme();
  const sveFakture = getFaktureZaKlijenta(id!);
  const godine = Array.from(new Set(sveFakture.map(f => new Date(f.datum).getFullYear()))).sort((a, b) => b - a);

  const fakture = sveFakture.filter(f => {
    const matchFirma = !firmaFilter || f.firmaId === firmaFilter;
    const matchGodina = !godina || new Date(f.datum).getFullYear() === godina;
    return matchFirma && matchGodina;
  });

  const ukupnoFakturisano = fakture.reduce((s, f) => s + f.ukupanIznos, 0);
  const ukupnoPlaceno = fakture.reduce((s, f) => s + getPlacenoZaFakturu(f.id), 0);
  const ukupnoDug = ukupnoFakturisano - ukupnoPlaceno;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-5">
        <ArrowLeft size={15} /> Nazad
      </button>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xl">
            {klijent.naziv.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{klijent.naziv}</h1>
            <div className="text-sm text-gray-400 flex gap-3 mt-0.5">
              {klijent.pib && <span>PIB: {klijent.pib}</span>}
              {klijent.mb && <span>MB: {klijent.mb}</span>}
              {klijent.email && <span>{klijent.email}</span>}
              {klijent.telefon && <span>{klijent.telefon}</span>}
            </div>
            {klijent.adresa && <div className="text-sm text-gray-400 mt-0.5">{klijent.adresa}</div>}
          </div>
        </div>
        <Link
          to={`/fakture/nova?klijentId=${klijent.id}`}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Nova faktura
        </Link>
      </div>

      {/* Stanje */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Fakturisano</div>
          <div className="text-xl font-bold text-gray-900">{formatRSD(ukupnoFakturisano)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-green-600 mb-1">Naplaćeno</div>
          <div className="text-xl font-bold text-green-700">{formatRSD(ukupnoPlaceno)}</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="text-xs text-red-500 mb-1">Dug</div>
          <div className="text-xl font-bold text-red-700">{formatRSD(ukupnoDug)}</div>
        </div>
      </div>

      {/* Fakture */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 gap-3">
          <h2 className="font-semibold text-gray-900 flex-shrink-0">Fakture ({fakture.length})</h2>
          <div className="flex gap-2 ml-auto">
            <select
              value={firmaFilter}
              onChange={e => setFirmaFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sve firme</option>
              {firme.map(f => <option key={f.id} value={f.id}>{f.naziv}</option>)}
            </select>
            <select
              value={godina ?? ''}
              onChange={e => setGodina(e.target.value ? Number(e.target.value) : undefined)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sve godine</option>
              {godine.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        {fakture.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Nema faktura za odabrane filtere.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {fakture.sort((a, b) => b.datum.localeCompare(a.datum)).map(f => {
              const firma = firme.find(fi => fi.id === f.firmaId);
              const placeno = getPlacenoZaFakturu(f.id);
              const dug = Math.max(0, f.ukupanIznos - placeno);
              const uplate = getUplateZaFakturu(f.id);
              return (
                <Link
                  key={f.id}
                  to={`/fakture/${f.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {dug === 0
                      ? <CheckCircle2 className="text-green-500" size={20} />
                      : <AlertCircle className="text-amber-500" size={20} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{f.broj}</span>
                      {firma && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
                          <Building2 size={10} /> {firma.naziv}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDatum(f.datum)} · Dospeće: {formatDatum(f.datumDospeca)}
                      {uplate.length > 0 && ` · ${uplate.length} uplata`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{formatRSD(f.ukupanIznos)}</div>
                    {dug > 0
                      ? <div className="text-xs text-red-600">{formatRSD(dug)} preostalo</div>
                      : <div className="text-xs text-green-600">Izmireno</div>
                    }
                  </div>
                  <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
