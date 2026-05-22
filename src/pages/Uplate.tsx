import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Upload, X, Loader2, AlertTriangle, CheckCircle2, KeyRound, FileType2, ChevronRight } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useFirma } from '../context/FirmaContext';
import { formatRSD, formatDatum } from '../utils/format';
import { fileToBase64, extractUplateFromIzvod } from '../services/claudeApi';
import type { TransakcijaIzvoda } from '../services/claudeApi';

const CLAUDE_KEY_STORAGE = 'claude_api_key';
const getClaudeKey = () => localStorage.getItem(CLAUDE_KEY_STORAGE) ?? '';
const setClaudeKey = (k: string) => localStorage.setItem(CLAUDE_KEY_STORAGE, k);

export default function Uplate() {
  const { selectedFirmaId } = useFirma();
  const { uplate, fakture, klijenti, firme, getPlacenoZaFakturu } = useData();
  const [izvodModal, setIzvodModal] = useState(false);

  // Filtrirane uplate
  const aktivnaFirma = selectedFirmaId;
  const prikazaneUplate = [...uplate]
    .filter(u => !aktivnaFirma || u.firmaId === aktivnaFirma)
    .sort((a, b) => b.datum.localeCompare(a.datum));

  const ukupnoNaplaceno = prikazaneUplate.reduce((s, u) => s + u.iznos, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Uplate</h1>
          <p className="text-gray-500 text-sm mt-0.5">{prikazaneUplate.length} uplata · ukupno {formatRSD(ukupnoNaplaceno)}</p>
        </div>
        <button onClick={() => setIzvodModal(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Upload size={14} /> Uvezi izvod (PDF)
        </button>
      </div>

      {/* Tabela svih uplata */}
      <div className="bg-white rounded-xl border border-gray-200">
        {prikazaneUplate.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Nema evidentiranih uplata. Dodajte uplatu na fakturi ili uvezite izvod.
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
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">{firma?.naziv || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{klijent?.naziv || '—'}</td>
                      <td className="px-4 py-3">
                        {faktura
                          ? <Link to={`/fakture/${faktura.id}`} className="text-blue-600 hover:underline font-mono text-xs">{faktura.broj}</Link>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">{formatRSD(u.iznos)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs italic max-w-48 truncate">{u.napomena || '—'}</td>
                      <td className="px-4 py-3">
                        {faktura && <Link to={`/fakture/${faktura.id}`} className="text-gray-400 hover:text-blue-600"><ChevronRight size={14} /></Link>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Ukupno naplaćeno:</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">{formatRSD(ukupnoNaplaceno)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {izvodModal && (
        <IzvodImportModal
          fakture={fakture}
          klijenti={klijenti}
          firme={firme}
          getPlacenoZaFakturu={getPlacenoZaFakturu}
          onClose={() => setIzvodModal(false)}
        />
      )}
    </div>
  );
}

// ── Izvod Import Modal ────────────────────────────────────────────────────────

interface MappedTransakcija extends TransakcijaIzvoda {
  fakturaId: string; // '' = preskočeno
}

type IzvodStep = 'pick' | 'processing' | 'preview' | 'result';
interface IzvodResult { saved: number; skipped: number; }

function IzvodImportModal({
  fakture,
  klijenti,
  firme,
  getPlacenoZaFakturu,
  onClose,
}: {
  fakture: { id: string; firmaId: string; klijentId: string; broj: string; ukupanIznos: number; datum: string }[];
  klijenti: { id: string; naziv: string }[];
  firme: { id: string; naziv: string }[];
  getPlacenoZaFakturu: (id: string) => number;
  onClose: () => void;
}) {
  const { addUplata } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<IzvodStep>('pick');
  const [rows, setRows] = useState<MappedTransakcija[]>([]);
  const [parseError, setParseError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<IzvodResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [claudeKey, setClaudeKeyState] = useState(getClaudeKey());
  const [processingMsg, setProcessingMsg] = useState('');

  // Open invoices (with remaining debt)
  const openFakture = fakture.filter(f => {
    const dug = f.ukupanIznos - getPlacenoZaFakturu(f.id);
    return dug > 0.01;
  });

  const autoMatch = (transakcije: TransakcijaIzvoda[]): MappedTransakcija[] => {
    return transakcije.map(t => {
      // Try to auto-match: uplatioc name contains klijent name
      let matched = '';
      if (t.uplatioc) {
        const upl = t.uplatioc.toLowerCase();
        for (const f of openFakture) {
          const k = klijenti.find(k => k.id === f.klijentId);
          if (k && upl.includes(k.naziv.toLowerCase().split(' ')[0])) {
            matched = f.id;
            break;
          }
        }
      }
      // Also try to match by iznos
      if (!matched) {
        const byAmount = openFakture.find(f => {
          const dug = f.ukupanIznos - getPlacenoZaFakturu(f.id);
          return Math.abs(dug - t.iznos) < 1;
        });
        if (byAmount) matched = byAmount.id;
      }
      return { ...t, fakturaId: matched };
    });
  };

  const handleFile = async (file: File) => {
    setParseError('');
    setFileName(file.name);
    if (!claudeKey.trim()) { setParseError('Unesite Anthropic API ključ.'); return; }
    if (file.size > 20 * 1024 * 1024) { setParseError('PDF je prevelik (maks. 20 MB).'); return; }

    setStep('processing');
    setProcessingMsg('Čitam PDF...');
    try {
      const b64 = await fileToBase64(file);
      setProcessingMsg('Claude analizira izvod...');
      const extracted = await extractUplateFromIzvod(claudeKey, b64);
      setClaudeKey(claudeKey);
      if (extracted.length === 0) {
        setParseError('Claude nije pronašao transakcije u ovom PDF-u.');
        setStep('pick');
        return;
      }
      setRows(autoMatch(extracted));
      setStep('preview');
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Greška pri obradi PDF-a');
      setStep('pick');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const updateMapping = (idx: number, fakturaId: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, fakturaId } : r));
  };

  const handleConfirm = async () => {
    setSaving(true);
    let saved = 0, skipped = 0;
    try {
      for (const row of rows) {
        if (!row.fakturaId) { skipped++; continue; }
        const faktura = fakture.find(f => f.id === row.fakturaId);
        if (!faktura) { skipped++; continue; }
        await addUplata({
          fakturaId: faktura.id,
          firmaId: faktura.firmaId,
          iznos: row.iznos,
          datum: row.datum,
          napomena: row.svrha ? `${row.uplatioc ? row.uplatioc + ' — ' : ''}${row.svrha}` : (row.uplatioc || ''),
        });
        saved++;
      }
      setResult({ saved, skipped });
      setStep('result');
    } finally {
      setSaving(false);
    }
  };

  const mappedCount = rows.filter(r => r.fakturaId).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Uvezi bankarski izvod (PDF)</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 'pick' && 'Claude AI čita izvod i izvlači prilivne transakcije'}
              {step === 'processing' && processingMsg}
              {step === 'preview' && `${fileName} — ${rows.length} transakcija, ${mappedCount} mapiranih na fakture`}
              {step === 'result' && 'Uvoz završen'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── pick ── */}
          {step === 'pick' && (
            <div className="space-y-4">
              <div
                onDragOver={e => e.preventDefault()} onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                <FileType2 className="mx-auto text-gray-400 mb-3" size={32} />
                <p className="text-gray-700 font-medium">Prevucite PDF bankarski izvod ili kliknite</p>
                <p className="text-gray-400 text-sm mt-1">Podržani formati: PDF</p>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
              </div>

              {parseError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" /><span>{parseError}</span>
                </div>
              )}

              <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-amber-800">
                  <KeyRound size={14} /> Anthropic API ključ
                </div>
                <input
                  type="password" value={claudeKey} placeholder="sk-ant-..."
                  onChange={e => { setClaudeKeyState(e.target.value); setClaudeKey(e.target.value); }}
                  className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <p className="text-xs text-amber-600 mt-1.5">Čuva se lokalno u browseru.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-600 space-y-1.5">
                <p><strong>Kako radi:</strong> Claude čita izvod i pronalazi prilivne transakcije (uplate na račun).</p>
                <p>Svaku transakciju možete mapirati na otvorenu fakturu — automatski pokušava da poveže po imenu platioca i iznosu.</p>
                <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  ⚠️ <strong>Lični uplozi, pozajmice osnivača, povrati troškova</strong> — ostavite "Preskočiti".
                  Ove transakcije nisu plaćanja faktura i ne trebaju se evidentirati.
                </p>
                <p><strong>Otvorene fakture:</strong> {openFakture.length} faktura sa nepodmirenim dugom</p>
              </div>
            </div>
          )}

          {/* ── processing ── */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 size={40} className="animate-spin text-purple-500" />
              <p className="text-gray-600 font-medium">{processingMsg}</p>
              <p className="text-gray-400 text-sm">Ovo može potrajati nekoliko sekundi...</p>
            </div>
          )}

          {/* ── preview ── */}
          {step === 'preview' && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">
                Mapirajte svaku transakciju na fakturu. Nemapovane transakcije biće preskočene.
                Automatski su pokušana podudaranja po imenu platioca i iznosu.
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Datum</th>
                      <th className="px-3 py-2 text-right font-medium">Iznos</th>
                      <th className="px-3 py-2 text-left font-medium">Uplatioc / Svrha</th>
                      <th className="px-3 py-2 text-left font-medium w-72">Mapiranje na fakturu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((r, i) => (
                      <tr key={i} className={r.fakturaId ? 'bg-green-50/40' : ''}>
                        <td className="px-3 py-2.5 text-gray-600 text-xs">{r.datum}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-green-700">{formatRSD(r.iznos)}</td>
                        <td className="px-3 py-2.5">
                          <div className="text-xs text-gray-800 font-medium truncate max-w-48">{r.uplatioc || '—'}</div>
                          <div className="text-xs text-gray-400 truncate max-w-48">{r.svrha || ''}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={r.fakturaId}
                            onChange={e => updateMapping(i, e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">— Preskočiti —</option>
                            {openFakture.map(f => {
                              const k = klijenti.find(k => k.id === f.klijentId);
                              const firma = firme.find(fi => fi.id === f.firmaId);
                              const dug = f.ukupanIznos - getPlacenoZaFakturu(f.id);
                              return (
                                <option key={f.id} value={f.id}>
                                  {f.broj} — {k?.naziv ?? '?'} ({firma?.naziv ?? '?'}) · {formatRSD(dug)} dug
                                </option>
                              );
                            })}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400">
                {mappedCount} od {rows.length} transakcija mapirano · {rows.length - mappedCount} će biti preskočeno
              </p>
            </div>
          )}

          {/* ── result ── */}
          {step === 'result' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
                <CheckCircle2 className="text-green-600 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-green-800">Uvoz završen</p>
                  <p className="text-sm text-green-700">
                    {result.saved} uplata evidentirano
                    {result.skipped > 0 && `, ${result.skipped} preskočeno`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {(step === 'pick' || step === 'processing') && (
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Otkaži</button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => { setStep('pick'); setRows([]); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Nazad</button>
              <button onClick={handleConfirm} disabled={saving || mappedCount === 0}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Evidentiraj {mappedCount} uplata
              </button>
            </>
          )}
          {step === 'result' && (
            <button onClick={onClose} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Zatvori</button>
          )}
        </div>
      </div>
    </div>
  );
}
