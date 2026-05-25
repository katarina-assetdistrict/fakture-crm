import { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2, AlertTriangle, CheckCircle2, KeyRound, FileType2, Landmark } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useFirma } from '../context/FirmaContext';
import { formatRSD, formatDatum } from '../utils/format';
import { fileToBase64, extractIzvodData } from '../services/claudeApi';
import type { IzvodData, TransakcijaIzvoda } from '../services/claudeApi';
import { normalizeFirma } from '../utils/importParse';

const CLAUDE_KEY_STORAGE = 'claude_api_key';
const getClaudeKey = () => localStorage.getItem(CLAUDE_KEY_STORAGE) ?? '';
const saveClaudeKey = (k: string) => localStorage.setItem(CLAUDE_KEY_STORAGE, k);

function getIzvodLabel(nazivFajla: string, datumIzvoda: string): string {
  const base = (nazivFajla ?? '').split('/').pop() ?? '';
  const bracketNum = base.match(/\[([^\]]+)\]\.pdf$/i);
  if (bracketNum) return `Izvod ${bracketNum[1]}`;
  if (/\.pdf$/i.test(base)) return base;
  return datumIzvoda ? `izvod_${datumIzvoda.replace(/[-./\s]/g, '_')}.pdf` : 'izvod.pdf';
}

export default function Izvodi() {
  const { selectedFirmaId } = useFirma();
  const { izvodi, firme, addIzvod, fakture, klijenti, getPlacenoZaFakturu, addUplata } = useData();
  const directFileRef = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState(false);
  const [preloadFile, setPreloadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; currentFileName: string } | null>(null);
  const [uploadSummary, setUploadSummary] = useState<string | null>(null);

  const handleBatchDirect = async (files: File[]) => {
    const key = getClaudeKey();
    let totalTransakcija = 0;
    const openFakture = fakture.filter(f => f.ukupanIznos - getPlacenoZaFakturu(f.id) > 0.01);
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      setUploadProgress({ current: idx + 1, total: files.length, currentFileName: file.name });
      try {
        const b64 = await fileToBase64(file);
        const data = await extractIzvodData(key, b64);
        const normedFirma = normalizeFirma(data.firma ?? '');
        const matchedFirma = firme.find(f => normalizeFirma(f.naziv) === normedFirma);
        for (const t of data.transakcije) {
          let matched = '';
          if (t.uplatioc) {
            const upl = t.uplatioc.toLowerCase();
            for (const f of openFakture) {
              const k = klijenti.find(kl => kl.id === f.klijentId);
              if (k && upl.includes(k.naziv.toLowerCase().split(' ')[0])) { matched = f.id; break; }
            }
          }
          if (!matched) {
            const byAmt = openFakture.find(f => Math.abs((f.ukupanIznos - getPlacenoZaFakturu(f.id)) - t.iznos) < 1);
            if (byAmt) matched = byAmt.id;
          }
          if (matched) {
            const faktura = fakture.find(f => f.id === matched);
            if (faktura) {
              await addUplata({ fakturaId: faktura.id, firmaId: faktura.firmaId, iznos: t.iznos, datum: t.datum, napomena: [t.uplatioc, t.svrha].filter(Boolean).join(' — ') });
            }
          }
        }
        const ukupnoPrilivno = data.transakcije.reduce((s, t) => s + t.iznos, 0);
        await addIzvod({ firmaId: matchedFirma?.id ?? '', firmaIme: data.firma ?? '', datumIzvoda: data.datum_izvoda, nazivFajla: file.name, ukupnoPrilivno, brojTransakcija: data.transakcije.length });
        totalTransakcija += data.transakcije.length;
      } catch { /* skip failed file */ }
    }
    setUploadProgress(null);
    setUploadSummary(`Uvezeno ${files.length} izvoda, pronađeno ${totalTransakcija} transakcija`);
    setTimeout(() => setUploadSummary(null), 4000);
  };

  const prikazaniIzvodi = [...izvodi]
    .filter(i => !selectedFirmaId || i.firmaId === selectedFirmaId)
    .sort((a, b) => b.datumIzvoda.localeCompare(a.datumIzvoda));

  const ukupnoPrilivno = prikazaniIzvodi.reduce((s, i) => s + i.ukupnoPrilivno, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bankarski izvodi</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {prikazaniIzvodi.length} {prikazaniIzvodi.length === 1 ? 'izvod' : 'izvoda'}
            {prikazaniIzvodi.length > 0 && ` · ukupno prilivno ${formatRSD(ukupnoPrilivno)}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {uploadSummary && (
            <span className="text-sm text-green-600 font-medium">{uploadSummary}</span>
          )}
          {uploadProgress && (
            <span className="text-sm text-purple-600 font-medium">
              Obrađujem {uploadProgress.current}/{uploadProgress.total}: {uploadProgress.currentFileName.length > 28 ? uploadProgress.currentFileName.slice(0, 28) + '…' : uploadProgress.currentFileName}
            </span>
          )}
          <button
            onClick={() => directFileRef.current?.click()}
            disabled={!!uploadProgress}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {uploadProgress ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Uvezi izvod (PDF)
          </button>
          <input
            ref={directFileRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={e => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              if (files.length === 0) return;
              if (files.length === 1) { setPreloadFile(files[0]); setModal(true); }
              else handleBatchDirect(files);
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {prikazaniIzvodi.length === 0 ? (
          <div className="py-20 text-center">
            <Landmark className="mx-auto text-gray-200 mb-3" size={40} />
            <p className="text-gray-500 font-medium text-sm">Nema uvezenih izvoda</p>
            <p className="text-gray-400 text-xs mt-1">Uvezite bankarski PDF izvod — Claude će automatski izvući transakcije.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Datum izvoda</th>
                  <th className="px-4 py-3 font-medium">Firma</th>
                  <th className="px-4 py-3 font-medium">Fajl</th>
                  <th className="px-4 py-3 font-medium text-right">Transakcija</th>
                  <th className="px-4 py-3 font-medium text-right">Ukupno prilivno</th>
                  <th className="px-4 py-3 font-medium">Uvezen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {prikazaniIzvodi.map(izvod => {
                  const firma = firme.find(f => f.id === izvod.firmaId);
                  return (
                    <tr key={izvod.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-800 font-medium">{formatDatum(izvod.datumIzvoda) || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                          {firma?.naziv || izvod.firmaIme || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs font-medium" title={izvod.nazivFajla}>{getIzvodLabel(izvod.nazivFajla, izvod.datumIzvoda)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${izvod.brojTransakcija > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {izvod.brojTransakcija}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">
                        {izvod.ukupnoPrilivno > 0 ? formatRSD(izvod.ukupnoPrilivno) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDatum(izvod.kreiran)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Ukupno prilivno:</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">{formatRSD(ukupnoPrilivno)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {modal && <IzvodImportModal firme={firme} onClose={() => { setModal(false); setPreloadFile(null); }} initialFile={preloadFile ?? undefined} />}
    </div>
  );
}

// ── Import Modal ──────────────────────────────────────────────────────────────

interface MappedTransakcija extends TransakcijaIzvoda {
  fakturaId: string; // '' = preskočeno
}

type Step = 'pick' | 'processing' | 'preview' | 'result';

function IzvodImportModal({
  firme,
  onClose,
  initialFile,
}: {
  firme: { id: string; naziv: string }[];
  onClose: () => void;
  initialFile?: File;
}) {
  const { fakture, klijenti, getPlacenoZaFakturu, addUplata, addIzvod } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const initialFileRef = useRef(initialFile);

  const [step, setStep] = useState<Step>('pick');
  const [fileName, setFileName] = useState('');
  const [claudeKey, setClaudeKeyState] = useState(getClaudeKey());
  const [processingMsg, setProcessingMsg] = useState('');
  const [parseError, setParseError] = useState('');
  const [izvodData, setIzvodData] = useState<IzvodData | null>(null);
  const [selectedFirmaId, setSelectedFirmaId] = useState('');
  const [rows, setRows] = useState<MappedTransakcija[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ saved: number; skipped: number } | null>(null);

  // Open invoices with remaining debt
  const openFakture = fakture.filter(f => f.ukupanIznos - getPlacenoZaFakturu(f.id) > 0.01);

  const autoMatchFirmaId = (firmaName: string | null): string => {
    if (!firmaName) return '';
    const norm = normalizeFirma(firmaName);
    return firme.find(f => normalizeFirma(f.naziv) === norm)?.id ?? '';
  };

  const autoMatchTransakcije = (transakcije: TransakcijaIzvoda[]): MappedTransakcija[] =>
    transakcije.map(t => {
      let matched = '';
      if (t.uplatioc) {
        const upl = t.uplatioc.toLowerCase();
        for (const f of openFakture) {
          const k = klijenti.find(k => k.id === f.klijentId);
          if (k && upl.includes(k.naziv.toLowerCase().split(' ')[0])) { matched = f.id; break; }
        }
      }
      if (!matched) {
        const byAmt = openFakture.find(f => Math.abs((f.ukupanIznos - getPlacenoZaFakturu(f.id)) - t.iznos) < 1);
        if (byAmt) matched = byAmt.id;
      }
      return { ...t, fakturaId: matched };
    });

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
      const data = await extractIzvodData(claudeKey, b64);
      saveClaudeKey(claudeKey);
      setIzvodData(data);
      setSelectedFirmaId(autoMatchFirmaId(data.firma));
      setRows(autoMatchTransakcije(data.transakcije));
      setStep('preview');
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Greška pri obradi PDF-a');
      setStep('pick');
    }
  };

  // Auto-process a file passed from the parent (single-file direct click flow)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialFileRef.current) handleFile(initialFileRef.current); }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const updateMapping = (idx: number, fakturaId: string) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, fakturaId } : r));

  const handleConfirm = async () => {
    if (!izvodData) return;
    setSaving(true);
    let saved = 0, skipped = 0;
    try {
      // Save payments for mapped transactions
      for (const row of rows) {
        if (!row.fakturaId) { skipped++; continue; }
        const faktura = fakture.find(f => f.id === row.fakturaId);
        if (!faktura) { skipped++; continue; }
        await addUplata({
          fakturaId: faktura.id,
          firmaId: faktura.firmaId,
          iznos: row.iznos,
          datum: row.datum,
          napomena: [row.uplatioc, row.svrha].filter(Boolean).join(' — '),
        });
        saved++;
      }
      // Save the Izvod record
      const ukupnoPrilivno = izvodData.transakcije.reduce((s, t) => s + t.iznos, 0);
      await addIzvod({
        firmaId: selectedFirmaId,
        firmaIme: izvodData.firma ?? '',
        datumIzvoda: izvodData.datum_izvoda,
        nazivFajla: fileName,
        ukupnoPrilivno,
        brojTransakcija: izvodData.transakcije.length,
      });
      setResult({ saved, skipped });
      setStep('result');
    } finally {
      setSaving(false);
    }
  };

  const mappedCount = rows.filter(r => r.fakturaId).length;
  const resetToPickStep = () => { setStep('pick'); setRows([]); setIzvodData(null); setParseError(''); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Uvezi bankarski izvod (PDF)</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 'pick' && 'Claude AI čita PDF i izvlači prilivne transakcije'}
              {step === 'processing' && processingMsg}
              {step === 'preview' && izvodData && `${fileName} · ${rows.length} transakcija · ${mappedCount} mapiranih na fakture`}
              {step === 'result' && 'Uvoz završen'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
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
                <FileType2 className="mx-auto text-gray-400 mb-3" size={36} />
                <p className="text-gray-700 font-medium">Prevucite PDF bankarski izvod ili kliknite</p>
                <p className="text-gray-400 text-sm mt-1">Samo PDF format · max 20 MB</p>
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
                  onChange={e => { setClaudeKeyState(e.target.value); saveClaudeKey(e.target.value); }}
                  className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <p className="text-xs text-amber-600 mt-1.5">Čuva se lokalno u vašem browseru, nigde se ne šalje.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-600 space-y-1.5">
                <p><strong>Kako radi:</strong> Claude čita izvod i pronalazi prilivne transakcije (uplate na račun).</p>
                <p>Svaku transakciju možete mapirati na otvorenu fakturu — automatski pokušava da poveže po imenu platioca i iznosu.</p>
                <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  ⚠️ <strong>Lični uplozi, pozajmice osnivača, povrati troškova</strong> — ostavite "Preskočiti".
                  Ove transakcije nisu plaćanja faktura.
                </p>
                <p><strong>Otvorene fakture:</strong> {openFakture.length} faktura sa nepodmirenim dugom</p>
              </div>
            </div>
          )}

          {/* ── processing ── */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={40} className="animate-spin text-purple-500" />
              <p className="text-gray-600 font-medium">{processingMsg}</p>
              <p className="text-gray-400 text-sm">Ovo može potrajati nekoliko sekundi...</p>
            </div>
          )}

          {/* ── preview ── */}
          {step === 'preview' && izvodData && (
            <div className="space-y-4">

              {/* Izvod metadata */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-wrap gap-6">
                <div className="min-w-36">
                  <p className="text-xs text-gray-500 mb-1">Datum izvoda</p>
                  <p className="text-sm font-semibold text-gray-800">{izvodData.datum_izvoda || '—'}</p>
                </div>
                <div className="flex-1 min-w-52">
                  <p className="text-xs text-gray-500 mb-1">
                    Firma
                    {izvodData.firma && (
                      <span className="ml-1 text-gray-400">(detektovana: "{izvodData.firma}")</span>
                    )}
                  </p>
                  <select
                    value={selectedFirmaId}
                    onChange={e => setSelectedFirmaId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Odaberite firmu —</option>
                    {firme.map(f => <option key={f.id} value={f.id}>{f.naziv}</option>)}
                  </select>
                  {!selectedFirmaId && (
                    <p className="text-xs text-amber-600 mt-1">Firma je obavezna za čuvanje izvoda.</p>
                  )}
                </div>
                <div className="min-w-28 text-right">
                  <p className="text-xs text-gray-500 mb-1">Ukupno prilivno</p>
                  <p className="text-sm font-bold text-green-700">
                    {formatRSD(izvodData.transakcije.reduce((s, t) => s + t.iznos, 0))}
                  </p>
                </div>
              </div>

              {izvodData.transakcije.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-4 text-sm text-amber-700 text-center">
                  Claude nije pronašao prilivne transakcije u ovom izvodu.
                  Izvod će biti sačuvan ali bez uplata.
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">
                    Mapirajte svaku transakciju na fakturu. Nemapovane transakcije se preskačuju pri evidentiranju uplata, ali se izvod svejedno čuva.
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Datum</th>
                          <th className="px-3 py-2 text-right font-medium">Iznos</th>
                          <th className="px-3 py-2 text-left font-medium">Uplatioc / Svrha</th>
                          <th className="px-3 py-2 text-left font-medium w-72">Faktura</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rows.map((r, i) => (
                          <tr key={i} className={r.fakturaId ? 'bg-green-50/50' : ''}>
                            <td className="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">{r.datum}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-green-700 whitespace-nowrap">{formatRSD(r.iznos)}</td>
                            <td className="px-3 py-2.5">
                              <div className="text-xs text-gray-800 font-medium truncate max-w-52">{r.uplatioc || '—'}</div>
                              <div className="text-xs text-gray-400 truncate max-w-52">{r.svrha || ''}</div>
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
                    {mappedCount} od {rows.length} transakcija mapirano na fakture
                    {rows.length - mappedCount > 0 && ` · ${rows.length - mappedCount} će biti preskočeno`}
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── result ── */}
          {step === 'result' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-5">
                <CheckCircle2 className="text-green-600 flex-shrink-0" size={28} />
                <div>
                  <p className="font-semibold text-green-800 text-base">Uvoz završen</p>
                  <p className="text-sm text-green-700 mt-0.5">
                    Izvod sačuvan
                    {result.saved > 0 && ` · ${result.saved} uplata evidentirano`}
                    {result.skipped > 0 && ` · ${result.skipped} transakcija preskočeno`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {(step === 'pick' || step === 'processing') && (
            <button onClick={onClose} disabled={step === 'processing'}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
              Otkaži
            </button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={resetToPickStep}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Nazad
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving || !selectedFirmaId}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {mappedCount > 0
                  ? `Sačuvaj izvod i evidentiraj ${mappedCount} uplata`
                  : 'Sačuvaj izvod'}
              </button>
            </>
          )}
          {step === 'result' && (
            <button onClick={onClose}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Zatvori
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
