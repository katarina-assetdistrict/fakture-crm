import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, CheckCircle2, AlertCircle, ChevronRight, Download, Upload, X, Loader2, AlertTriangle, FileJson, FileText } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useFirma } from '../context/FirmaContext';
import { formatRSD, formatDatum, godineFaktura } from '../utils/format';
import { exportFaktureExcel } from '../utils/export';
import { parseImportFile } from '../utils/importParse';
import type { ImportRow } from '../utils/importParse';

export default function Fakture() {
  const { selectedFirmaId } = useFirma();
  const { fakture: sveFakture, klijenti, uplate, firme, getPlacenoZaFakturu, batchImportFakture } = useData();
  const [pretraga, setPretraga] = useState('');
  const [godina, setGodina] = useState<number | undefined>(undefined);
  const [klijentFilter, setKlijentFilter] = useState('');
  const [lokalnaFirma, setLokalnaFirma] = useState(selectedFirmaId ?? '');
  const [importModal, setImportModal] = useState(false);
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
          <button onClick={() => setImportModal(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <Upload size={14} /> Uvezi fakture
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

      {importModal && (
        <ImportModal
          firme={firme}
          onImport={batchImportFakture}
          onClose={() => setImportModal(false)}
        />
      )}
    </div>
  );
}

// ── Import Modal ──────────────────────────────────────────────────────────────

type ImportStep = 'pick' | 'preview' | 'result';

interface ImportResult { imported: number; skipped: string[]; }

function ImportModal({
  firme,
  onImport,
  onClose,
}: {
  firme: { naziv: string }[];
  onImport: (rows: ImportRow[]) => Promise<ImportResult>;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>('pick');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState('');

  const firmaNames = new Set(firme.map(f => f.naziv.toLowerCase()));

  const handleFile = async (file: File) => {
    setParseError('');
    setFileName(file.name);
    const parsed = await parseImportFile(file);
    if (!parsed.ok) { setParseError(parsed.error); return; }
    if (parsed.rows.length === 0) { setParseError('Fajl ne sadrži ni jedan red podataka'); return; }
    setRows(parsed.rows);
    setStep('preview');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const res = await onImport(rows);
      setResult(res);
      setStep('result');
    } finally {
      setSaving(false);
    }
  };

  const unknownFirme = [...new Set(rows.filter(r => !firmaNames.has(r.firma.toLowerCase())).map(r => r.firma))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Uvezi fakture</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 'pick' && 'Odaberite JSON ili CSV fajl'}
              {step === 'preview' && `${fileName} — ${rows.length} faktura za uvoz`}
              {step === 'result' && 'Uvoz završen'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step: pick file */}
          {step === 'pick' && (
            <div className="space-y-5">
              {/* Drop zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                <Upload className="mx-auto text-gray-400 mb-3" size={32} />
                <p className="text-gray-700 font-medium">Prevucite fajl ovdje ili kliknite</p>
                <p className="text-gray-400 text-sm mt-1">Podržano: .json, .csv</p>
                <input ref={fileRef} type="file" accept=".json,.csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>

              {parseError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Format examples */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                    <FileJson size={15} className="text-amber-500" /> JSON format
                  </div>
                  <pre className="text-xs text-gray-500 bg-gray-50 rounded p-2 overflow-x-auto">{`[
  {
    "firma": "Best Digital",
    "klijent": "Klijent d.o.o.",
    "broj_fakture": "001/2025",
    "datum": "2025-01-15",
    "iznos": 150000,
    "opis": "Web dizajn"
  }
]`}</pre>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                    <FileText size={15} className="text-green-500" /> CSV format
                  </div>
                  <pre className="text-xs text-gray-500 bg-gray-50 rounded p-2 overflow-x-auto">{`firma,klijent,broj_fakture,datum,iznos,opis
Best Digital,Klijent d.o.o.,001/2025,2025-01-15,150000,Web dizajn
Best App d.o.o.,Drugi klijent,002/2025,2025-02-01,80000,App razvoj`}</pre>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">
                <strong>Napomena:</strong> Firma mora tačno odgovarati nazivu u aplikaciji. Klijenti koji ne postoje biće automatski kreirani.
                Dostupne firme: <strong>{firme.map(f => f.naziv).join(', ')}</strong>
              </div>
            </div>
          )}

          {/* Step: preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {unknownFirme.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Nepoznate firme (fakture će biti preskočene): <strong>{unknownFirme.join(', ')}</strong>
                  </span>
                </div>
              )}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                    <tr>
                      {['Firma', 'Klijent', 'Broj', 'Datum', 'Iznos', 'Opis'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((r, i) => {
                      const firmaOk = firmaNames.has(r.firma.toLowerCase());
                      return (
                        <tr key={i} className={firmaOk ? '' : 'bg-red-50'}>
                          <td className="px-3 py-2">
                            <span className={`font-medium ${firmaOk ? 'text-gray-700' : 'text-red-600'}`}>{r.firma}</span>
                            {!firmaOk && <span className="ml-1 text-red-400">✗</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{r.klijent}</td>
                          <td className="px-3 py-2 font-mono text-gray-900">{r.broj_fakture}</td>
                          <td className="px-3 py-2 text-gray-600">{r.datum}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">{formatRSD(r.iznos)}</td>
                          <td className="px-3 py-2 text-gray-500 max-w-32 truncate">{r.opis || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400">
                {rows.length - unknownFirme.length} faktura će biti uvezeno
                {unknownFirme.length > 0 && `, ${unknownFirme.length} firma nepoznata (preskočeno)`}.
              </p>
            </div>
          )}

          {/* Step: result */}
          {step === 'result' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
                <CheckCircle2 className="text-green-600 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-green-800">Uvoz završen</p>
                  <p className="text-sm text-green-700">{result.imported} faktura uspješno uvezeno</p>
                </div>
              </div>
              {result.skipped.length > 0 && (
                <div className="border border-amber-200 rounded-lg overflow-hidden">
                  <div className="bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 uppercase tracking-wide">
                    Preskočeno ({result.skipped.length})
                  </div>
                  <ul className="divide-y divide-amber-100">
                    {result.skipped.map((s, i) => (
                      <li key={i} className="px-4 py-2 text-sm text-amber-800">{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          {step === 'pick' && (
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Otkaži</button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => { setStep('pick'); setRows([]); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Nazad
              </button>
              <button onClick={handleConfirm} disabled={saving || rows.filter(r => firmaNames.has(r.firma.toLowerCase())).length === 0}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Uvezi {rows.filter(r => firmaNames.has(r.firma.toLowerCase())).length} faktura
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
