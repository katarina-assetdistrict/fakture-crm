import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, X, Check, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import {
  getFakture, getKlijenti, getFirme, getUplateZaFakturu, getPlacenoZaFakturu,
  addUplata, deleteUplata, deleteFaktura,
} from '../utils/storage';
import { formatRSD, formatDatum, genId, danas } from '../utils/format';

export default function FakturaDetalji() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [, setRefresh] = useState(0);
  const [modalUplata, setModalUplata] = useState(false);
  const [brisanjeUplataId, setBrisanjeUplataId] = useState<string | null>(null);
  const [brisanjeFaktura, setBrisanjeFaktura] = useState(false);
  const [novaUplata, setNovaUplata] = useState({ iznos: '', datum: danas(), napomena: '' });
  const [greska, setGreska] = useState('');

  const reload = () => setRefresh(r => r + 1);

  const faktura = getFakture().find(f => f.id === id);
  if (!faktura) return <div className="p-8 text-gray-500">Faktura nije pronađena.</div>;

  const klijent = getKlijenti().find(k => k.id === faktura.klijentId);
  const firma = getFirme().find(f => f.id === faktura.firmaId);
  const uplate = getUplateZaFakturu(id!).sort((a, b) => b.datum.localeCompare(a.datum));
  const placeno = getPlacenoZaFakturu(id!);
  const dug = Math.max(0, faktura.ukupanIznos - placeno);
  const prosloRok = new Date(faktura.datumDospeca) < new Date() && dug > 0;
  const procenat = faktura.ukupanIznos > 0 ? Math.min(100, (placeno / faktura.ukupanIznos) * 100) : 0;

  const sacuvajUplatu = () => {
    const iznos = Number(novaUplata.iznos);
    if (!iznos || iznos <= 0) { setGreska('Unesite ispravan iznos.'); return; }
    if (iznos > dug + 0.01) { setGreska(`Iznos ne može biti veći od duga (${formatRSD(dug)}).`); return; }
    addUplata({
      id: genId(),
      fakturaId: id!,
      firmaId: faktura.firmaId,
      iznos,
      datum: novaUplata.datum,
      napomena: novaUplata.napomena,
      kreirana: danas(),
    });
    setNovaUplata({ iznos: '', datum: danas(), napomena: '' });
    setGreska('');
    setModalUplata(false);
    reload();
  };

  const handleIzbrisiUplatu = () => {
    if (brisanjeUplataId) { deleteUplata(brisanjeUplataId); reload(); setBrisanjeUplataId(null); }
  };

  const handleIzbrisiFakturu = () => {
    deleteFaktura(id!);
    navigate('/fakture');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-5">
        <ArrowLeft size={15} /> Nazad
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {dug === 0
              ? <CheckCircle2 className="text-green-500" size={20} />
              : <AlertCircle className={prosloRok ? 'text-red-500' : 'text-amber-500'} size={20} />
            }
            <h1 className="text-2xl font-bold text-gray-900">{faktura.broj}</h1>
          </div>
          <div className="flex items-center gap-3 mt-1">
            {firma && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                <Building2 size={11} /> {firma.naziv}
              </span>
            )}
            {klijent && (
              <Link to={`/klijenti/${klijent.id}`} className="text-blue-600 hover:underline text-sm">
                {klijent.naziv}
              </Link>
            )}
          </div>
        </div>
        <button onClick={() => setBrisanjeFaktura(true)}
          className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-sm border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors">
          <Trash2 size={13} /> Izbriši fakturu
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {/* Leva kolona */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3 text-sm">Detalji fakture</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-400">Datum:</span><span className="text-gray-800 ml-1">{formatDatum(faktura.datum)}</span></div>
              <div>
                <span className="text-gray-400">Dospeće:</span>
                <span className={`ml-1 ${prosloRok ? 'text-red-600 font-medium' : 'text-gray-800'}`}>
                  {formatDatum(faktura.datumDospeca)}{prosloRok && ' ⚠'}
                </span>
              </div>
              {faktura.napomena && (
                <div className="col-span-2">
                  <span className="text-gray-400">Napomena:</span>
                  <span className="text-gray-800 ml-1">{faktura.napomena}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 text-sm">Stavke</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-100">
                  <th className="px-4 py-2 text-left font-medium">Opis</th>
                  <th className="px-4 py-2 text-right font-medium">Kol.</th>
                  <th className="px-4 py-2 text-right font-medium">Cena</th>
                  <th className="px-4 py-2 text-right font-medium">Ukupno</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {faktura.stavke.map(s => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 text-gray-800">{s.opis}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{s.kolicina}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{formatRSD(s.cenaPoJedinici)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatRSD(s.ukupno)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-gray-700 text-sm">Ukupno:</td>
                  <td className="px-4 py-2.5 text-right font-bold text-gray-900">{formatRSD(faktura.ukupanIznos)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Desna kolona */}
        <div className="col-span-2 space-y-4">
          <div className={`rounded-xl border p-5 ${dug === 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
            <h2 className="font-semibold text-gray-800 text-sm mb-3">Stanje plaćanja</h2>
            <div className="space-y-2 text-sm mb-3">
              <div className="flex justify-between"><span className="text-gray-500">Ukupno:</span><span className="font-medium">{formatRSD(faktura.ukupanIznos)}</span></div>
              <div className="flex justify-between"><span className="text-green-600">Plaćeno:</span><span className="text-green-700 font-medium">{formatRSD(placeno)}</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-red-600 font-semibold">Dug:</span><span className="text-red-700 font-bold">{formatRSD(dug)}</span></div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${procenat}%` }} />
            </div>
            <div className="text-xs text-gray-400 text-center">{Math.round(procenat)}% plaćeno</div>
            {dug > 0 && (
              <button
                onClick={() => { setNovaUplata({ iznos: String(dug), datum: danas(), napomena: '' }); setModalUplata(true); }}
                className="w-full mt-3 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={14} /> Dodaj uplatu
              </button>
            )}
          </div>

          {uplate.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800 text-sm">Uplate ({uplate.length})</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {uplate.map(u => (
                  <div key={u.id} className="px-4 py-3 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-green-700">{formatRSD(u.iznos)}</div>
                      <div className="text-xs text-gray-400">{formatDatum(u.datum)}</div>
                      {u.napomena && <div className="text-xs text-gray-500 mt-0.5 italic">"{u.napomena}"</div>}
                    </div>
                    <button onClick={() => setBrisanjeUplataId(u.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Nova uplata */}
      {modalUplata && (
        <Modal title="Nova uplata" onClose={() => { setModalUplata(false); setGreska(''); }}>
          {greska && <div className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{greska}</div>}
          {firma && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
              <Building2 size={13} className="text-slate-500" />
              <span className="text-sm text-slate-600 font-medium">{firma.naziv}</span>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Iznos (RSD) *</label>
              <input type="number" min="0" step="0.01" value={novaUplata.iznos}
                onChange={e => setNovaUplata(p => ({ ...p, iznos: e.target.value }))}
                placeholder={`maks. ${formatRSD(dug)}`}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Datum uplate</label>
              <input type="date" value={novaUplata.datum}
                onChange={e => setNovaUplata(p => ({ ...p, datum: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Napomena</label>
              <input value={novaUplata.napomena}
                onChange={e => setNovaUplata(p => ({ ...p, napomena: e.target.value }))}
                placeholder="npr. prenos sa žiro računa..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => { setModalUplata(false); setGreska(''); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Otkaži</button>
            <button onClick={sacuvajUplatu} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Check size={14} /> Evidentiraj uplatu
            </button>
          </div>
        </Modal>
      )}

      {brisanjeUplataId && (
        <Modal title="Izbriši uplatu" onClose={() => setBrisanjeUplataId(null)}>
          <p className="text-sm text-gray-600">Da li ste sigurni da želite da izbrišete ovu uplatu?</p>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setBrisanjeUplataId(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Otkaži</button>
            <button onClick={handleIzbrisiUplatu} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Izbriši</button>
          </div>
        </Modal>
      )}

      {brisanjeFaktura && (
        <Modal title="Izbriši fakturu" onClose={() => setBrisanjeFaktura(false)}>
          <p className="text-sm text-gray-600">Brisanjem fakture brišu se i sve evidentirane uplate. Ovo se ne može poništiti.</p>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setBrisanjeFaktura(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Otkaži</button>
            <button onClick={handleIzbrisiFakturu} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Izbriši fakturu</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
