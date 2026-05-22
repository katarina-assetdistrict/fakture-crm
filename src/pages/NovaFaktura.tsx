import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Check } from 'lucide-react';
import { getKlijenti, addFaktura, getFirme } from '../utils/storage';
import { genId, danas, formatRSD } from '../utils/format';
import { useFirma } from '../context/FirmaContext';
import type { StavkaFakture } from '../types';

const praznaStavka = (): StavkaFakture => ({
  id: genId(), opis: '', kolicina: 1, cenaPoJedinici: 0, ukupno: 0,
});

export default function NovaFaktura() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { selectedFirmaId } = useFirma();
  const klijenti = getKlijenti();
  const firme = getFirme();

  const [firmaId, setFirmaId] = useState(selectedFirmaId ?? firme[0]?.id ?? '');
  const [klijentId, setKlijentId] = useState(params.get('klijentId') || '');
  const [broj, setBroj] = useState('');
  const [datum, setDatum] = useState(danas());
  const [datumDospeca, setDatumDospeca] = useState('');
  const [napomena, setNapomena] = useState('');
  const [stavke, setStavke] = useState<StavkaFakture[]>([praznaStavka()]);
  const [greska, setGreska] = useState('');

  const updateStavka = (id: string, field: keyof StavkaFakture, val: string | number) => {
    setStavke(prev => prev.map(s => {
      if (s.id !== id) return s;
      const nova = { ...s, [field]: val };
      if (field === 'kolicina' || field === 'cenaPoJedinici') {
        nova.ukupno = Number(nova.kolicina) * Number(nova.cenaPoJedinici);
      }
      return nova;
    }));
  };

  const ukupnoIznos = stavke.reduce((s, st) => s + st.ukupno, 0);

  const sacuvaj = () => {
    if (!firmaId) { setGreska('Izaberite firmu.'); return; }
    if (!klijentId) { setGreska('Izaberite klijenta.'); return; }
    if (!broj.trim()) { setGreska('Unesite broj fakture.'); return; }
    if (stavke.some(s => !s.opis.trim())) { setGreska('Sve stavke moraju imati opis.'); return; }
    addFaktura({
      id: genId(),
      firmaId,
      klijentId,
      broj: broj.trim(),
      datum,
      datumDospeca,
      stavke,
      ukupanIznos: ukupnoIznos,
      napomena,
      kreirana: danas(),
    });
    navigate(-1);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-5">
        <ArrowLeft size={15} /> Nazad
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nova faktura</h1>

      {greska && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{greska}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {/* Firma */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Firma *</label>
            <select
              value={firmaId}
              onChange={e => setFirmaId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Izaberite firmu —</option>
              {firme.map(f => <option key={f.id} value={f.id}>{f.naziv}</option>)}
            </select>
          </div>

          {/* Klijent */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Klijent *</label>
            <select
              value={klijentId}
              onChange={e => setKlijentId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Izaberite klijenta —</option>
              {klijenti.map(k => <option key={k.id} value={k.id}>{k.naziv}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Broj fakture *</label>
            <input value={broj} onChange={e => setBroj(e.target.value)} placeholder="npr. 2024/001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Datum fakture</label>
            <input type="date" value={datum} onChange={e => setDatum(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Datum dospeća</label>
            <input type="date" value={datumDospeca} onChange={e => setDatumDospeca(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Napomena</label>
            <input value={napomena} onChange={e => setNapomena(e.target.value)} placeholder="Opciono..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Stavke */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Stavke fakture</h3>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="px-3 py-2 text-left font-medium">Opis</th>
                  <th className="px-3 py-2 text-right font-medium w-20">Kol.</th>
                  <th className="px-3 py-2 text-right font-medium w-32">Cena (RSD)</th>
                  <th className="px-3 py-2 text-right font-medium w-32">Ukupno</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stavke.map(s => (
                  <tr key={s.id}>
                    <td className="px-2 py-1.5">
                      <input value={s.opis} onChange={e => updateStavka(s.id, 'opis', e.target.value)}
                        placeholder="Opis usluge/robe"
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min="0" value={s.kolicina}
                        onChange={e => updateStavka(s.id, 'kolicina', Number(e.target.value))}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min="0" value={s.cenaPoJedinici}
                        onChange={e => updateStavka(s.id, 'cenaPoJedinici', Number(e.target.value))}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium text-gray-900">{formatRSD(s.ukupno)}</td>
                    <td className="px-2 py-1.5">
                      {stavke.length > 1 && (
                        <button onClick={() => setStavke(prev => prev.filter(x => x.id !== s.id))}
                          className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={3} className="px-3 py-2 text-right text-sm font-semibold text-gray-700">Ukupno:</td>
                  <td className="px-3 py-2 text-right text-base font-bold text-gray-900">{formatRSD(ukupnoIznos)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button
            onClick={() => setStavke(prev => [...prev, praznaStavka()])}
            className="mt-2 flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            <Plus size={14} /> Dodaj stavku
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button onClick={() => navigate(-1)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            Otkaži
          </button>
          <button onClick={sacuvaj} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Check size={14} /> Sačuvaj fakturu
          </button>
        </div>
      </div>
    </div>
  );
}
