import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ChevronRight, Trash2, Edit2, X, Check, Loader2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatRSD } from '../utils/format';
import type { Klijent } from '../types';

const prazanKlijent = () => ({ naziv: '', adresa: '', pib: '', mb: '', email: '', telefon: '' });

export default function Klijenti() {
  const { klijenti, fakture, addKlijent, updateKlijent, deleteKlijent, getPlacenoZaFakturu } = useData();
  const [pretraga, setPretraga] = useState('');
  const [modal, setModal] = useState<'dodaj' | 'izmeni' | null>(null);
  const [forma, setForma] = useState(prazanKlijent());
  const [editId, setEditId] = useState<string | null>(null);
  const [brisanjeId, setBrisanjeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtrirani = klijenti.filter(k =>
    k.naziv.toLowerCase().includes(pretraga.toLowerCase()) ||
    k.pib.includes(pretraga) || k.email.toLowerCase().includes(pretraga.toLowerCase())
  );

  const otvoriDodaj = () => { setForma(prazanKlijent()); setModal('dodaj'); };
  const otvoriIzmeni = (k: Klijent) => {
    setEditId(k.id);
    setForma({ naziv: k.naziv, adresa: k.adresa, pib: k.pib, mb: k.mb, email: k.email, telefon: k.telefon });
    setModal('izmeni');
  };

  const sacuvaj = async () => {
    if (!forma.naziv.trim()) return;
    setSaving(true);
    try {
      if (modal === 'dodaj') {
        await addKlijent(forma);
      } else if (modal === 'izmeni' && editId) {
        const stari = klijenti.find(k => k.id === editId)!;
        await updateKlijent({ ...stari, ...forma });
      }
      setModal(null);
    } finally {
      setSaving(false);
    }
  };

  const potvrdiIzbrisi = async () => {
    if (!brisanjeId) return;
    setSaving(true);
    try {
      await deleteKlijent(brisanjeId);
      setBrisanjeId(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Klijenti</h1>
          <p className="text-gray-500 text-sm mt-0.5">{klijenti.length} klijenta ukupno</p>
        </div>
        <button onClick={otvoriDodaj}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Novi klijent
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
        <input value={pretraga} onChange={e => setPretraga(e.target.value)}
          placeholder="Pretraži po nazivu, PIB-u ili email-u..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {filtrirani.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {pretraga ? 'Nema rezultata pretrage.' : 'Nema dodanih klijenata.'}
          </div>
        ) : filtrirani.map(k => {
          const kFakture = fakture.filter(f => f.klijentId === k.id);
          const ukupno = kFakture.reduce((s, f) => s + f.ukupanIznos, 0);
          const placeno = kFakture.reduce((s, f) => s + getPlacenoZaFakturu(f.id), 0);
          const dug = ukupno - placeno;
          return (
            <div key={k.id} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
                {k.naziv.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{k.naziv}</div>
                <div className="text-xs text-gray-400 mt-0.5 flex gap-3">
                  {k.pib && <span>PIB: {k.pib}</span>}
                  {k.email && <span>{k.email}</span>}
                  {k.telefon && <span>{k.telefon}</span>}
                </div>
              </div>
              <div className="text-right hidden md:block">
                <div className="text-xs text-gray-400">{kFakture.length} faktura</div>
                {dug > 0 && <div className="text-sm font-semibold text-red-600">{formatRSD(dug)} dug</div>}
                {dug === 0 && ukupno > 0 && <div className="text-sm text-green-600 font-medium">Izmireno</div>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => otvoriIzmeni(k)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                <button onClick={() => setBrisanjeId(k.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                <Link to={`/klijenti/${k.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><ChevronRight size={16} /></Link>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal === 'dodaj' ? 'Novi klijent' : 'Izmeni klijenta'} onClose={() => setModal(null)}>
          <KlijentForma forma={forma} onChange={setForma} />
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Otkaži</button>
            <button onClick={sacuvaj} disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Sačuvaj
            </button>
          </div>
        </Modal>
      )}

      {brisanjeId && (
        <Modal title="Potvrda brisanja" onClose={() => setBrisanjeId(null)}>
          <p className="text-gray-600 text-sm">Brisanjem klijenta brišu se i sve fakture i uplate za tog klijenta.</p>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setBrisanjeId(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Otkaži</button>
            <button onClick={potvrdiIzbrisi} disabled={saving}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null} Izbriši
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function KlijentForma({ forma, onChange }: { forma: ReturnType<typeof prazanKlijent>; onChange: (f: ReturnType<typeof prazanKlijent>) => void }) {
  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...forma, [field]: e.target.value });
  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Naziv firme *</label><input value={forma.naziv} onChange={set('naziv')} className={inp} /></div>
      <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Adresa</label><input value={forma.adresa} onChange={set('adresa')} className={inp} /></div>
      <div><label className="block text-xs font-medium text-gray-700 mb-1">PIB</label><input value={forma.pib} onChange={set('pib')} className={inp} /></div>
      <div><label className="block text-xs font-medium text-gray-700 mb-1">Matični broj</label><input value={forma.mb} onChange={set('mb')} className={inp} /></div>
      <div><label className="block text-xs font-medium text-gray-700 mb-1">Email</label><input value={forma.email} onChange={set('email')} type="email" className={inp} /></div>
      <div><label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label><input value={forma.telefon} onChange={set('telefon')} className={inp} /></div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
