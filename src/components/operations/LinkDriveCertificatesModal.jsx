import { useState, useRef } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FolderOpen,
  Link2,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import Modal from '../Modal';
import { useOperations } from '../../context/OperationsContext';
import { useDonors } from '../../context/DonorContext';

/**
 * Parses a 2-column CSV / TSV: Name, CertificateURL
 * Returns [{ name, url }]
 */
function parseNameUrlCsv(text) {
  const rows = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split(/,(?=https?:\/\/)|[\t;]/).map((p) => p.trim().replace(/^"|"$/g, ''));
    if (parts.length >= 2) {
      const name = parts[0];
      const url = parts.slice(1).join(',').trim();
      if (name && (url.startsWith('http://') || url.startsWith('https://'))) {
        rows.push({ name: name.toLowerCase(), url });
      }
    }
  }
  return rows;
}

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractDriveFolderId(url) {
  const match = /\/folders\/([a-zA-Z0-9_-]+)/.exec(url);
  return match ? match[1] : null;
}

export default function LinkDriveCertificatesModal({ open, camp, onClose }) {
  const { updateCamp } = useOperations();
  const { donors, updateDonor } = useDonors();

  const [tab, setTab] = useState('folder');
  const [folderUrl, setFolderUrl] = useState(camp?.driveFolderUrl || '');
  const [folderSaving, setFolderSaving] = useState(false);
  const [folderSaved, setFolderSaved] = useState(false);
  const [folderError, setFolderError] = useState('');
  const [csvText, setCsvText] = useState('');
  const [csvResult, setCsvResult] = useState(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const campDonors = donors.filter((d) => {
    const id = d.ID || d.Donor_ID;
    return camp?.donorIds?.includes(id);
  });

  const handleSaveFolderUrl = async () => {
    setFolderError('');
    const trimmed = folderUrl.trim();
    if (!trimmed) { setFolderError('Please paste a Google Drive folder URL.'); return; }
    if (!trimmed.includes('drive.google.com')) { setFolderError("This doesn't look like a Google Drive URL."); return; }
    setFolderSaving(true);
    try {
      await updateCamp(camp.id, { driveFolderUrl: trimmed });
      setFolderSaved(true);
    } catch { setFolderError('Failed to save. Please try again.'); }
    finally { setFolderSaving(false); }
  };

  const handleCsvFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setCsvText(e.target.result || '');
    reader.readAsText(file);
  };

  const analyzecsv = () => {
    setLinkError('');
    const rows = parseNameUrlCsv(csvText);
    if (rows.length === 0) { setLinkError('No valid Name, URL rows found. Each line must be: Name, CertificateURL'); return; }
    const matched = [];
    const unmatched = [];
    rows.forEach(({ name, url }) => {
      const norm = normalizeName(name);
      const donor = campDonors.find((d) => {
        const dn = normalizeName(d.Name || d.Full_Name || '');
        return dn === norm || dn.includes(norm) || norm.includes(dn);
      });
      if (donor) matched.push({ donor, url, name });
      else unmatched.push({ name, url });
    });
    setCsvResult({ matched, unmatched, total: rows.length });
  };

  const handleLinkAll = async () => {
    if (!csvResult || csvResult.matched.length === 0) return;
    setLinking(true);
    setLinkError('');
    let done = 0;
    try {
      for (const { donor, url } of csvResult.matched) {
        await updateDonor(donor.ID || donor.Donor_ID, { 'Certificate URL': url, Certificate_URL: url });
        done++;
      }
      setLinkSuccess({ linked: done, unmatched: csvResult.unmatched.length });
      setCsvResult(null);
      setCsvText('');
    } catch (err) { setLinkError(err.message || 'Failed to update some donors.'); }
    finally { setLinking(false); }
  };

  const folderId = extractDriveFolderId(folderUrl);
  const savedFolderUrl = camp?.driveFolderUrl || '';
  const tabClass = (t) => {
    const base = 'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ';
    return base + (tab === t ? 'border-red-700 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-800');
  };

  return (
    <Modal open={open} onClose={onClose} title="Link Drive Certificates" maxWidth="max-w-2xl">
      {savedFolderUrl && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2.5 text-xs">
          <span className="flex items-center gap-2 font-semibold text-blue-800">
            <FolderOpen className="h-3.5 w-3.5 text-blue-600 shrink-0" />Drive folder linked to this camp
          </span>
          <a href={savedFolderUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 font-bold text-blue-700 underline underline-offset-2 hover:text-blue-900">
            <ExternalLink className="h-3 w-3" />Open Folder
          </a>
        </div>
      )}

      <div className="flex items-center border-b border-slate-200 mb-4">
        <button type="button" onClick={() => setTab('folder')} className={tabClass('folder')}>
          <Link2 className="h-3.5 w-3.5" /> Save Drive Folder URL
        </button>
        <button type="button" onClick={() => setTab('csv')} className={tabClass('csv')}>
          <Upload className="h-3.5 w-3.5" /> Link Certificates (Name to URL)
        </button>
      </div>

      {tab === 'folder' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Paste the Google Drive folder URL for <span className="font-bold text-slate-800">{camp?.name}</span>. Coordinators can open it directly from the camp details view.
          </p>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Google Drive Folder URL</label>
            <input type="url" value={folderUrl}
              onChange={(e) => { setFolderUrl(e.target.value); setFolderSaved(false); setFolderError(''); }}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-red-500 font-mono" />
            {folderError && <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{folderError}</p>}
            {folderId && <p className="text-[11px] text-slate-400">Folder ID: <span className="font-mono font-bold text-slate-600">{folderId}</span></p>}
          </div>
          {folderSaved && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              Drive folder URL saved. You can now open it from the camp details.
            </div>
          )}
          <div className="flex justify-between border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={handleSaveFolderUrl} disabled={folderSaving || !folderUrl.trim()}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-700 px-5 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-60">
              {folderSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
              Save Drive Folder URL
            </button>
          </div>
        </div>
      )}

      {tab === 'csv' && (
        <div className="space-y-4">
          {linkSuccess ? (
            <div className="py-4 text-center space-y-3">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-inset ring-emerald-200">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </span>
              <h3 className="text-base font-bold text-slate-900">{linkSuccess.linked} certificates linked!</h3>
              <p className="text-xs text-slate-500">
                Each matched donor's profile now shows a certificate link.
                {linkSuccess.unmatched > 0 && <> {linkSuccess.unmatched} name(s) could not be matched.</>}
              </p>
              <button type="button" onClick={onClose} className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800">Done</button>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">How to prepare the mapping</p>
                <ol className="list-decimal list-inside space-y-0.5 pl-1">
                  <li>Open your Drive folder and right-click each certificate file</li>
                  <li>Select "Get link" and copy it</li>
                  <li>Paste into a spreadsheet: Column A = Donor Name, Column B = Certificate URL</li>
                  <li>Export as CSV and upload below, or paste the text directly</li>
                </ol>
                <p className="mt-1 text-[11px] text-slate-400">Matching against <strong>{campDonors.length} donors</strong> in this camp's roster.</p>
              </div>

              {linkError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />{linkError}
                </div>
              )}

              <div onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-4 text-center hover:border-red-400 hover:bg-red-50/20 transition-colors">
                <Upload className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-700">Upload CSV file</p>
                  <p className="text-[11px] text-slate-400">or paste text below</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden"
                  onChange={(e) => handleCsvFile(e.target.files?.[0])} />
              </div>

              <textarea value={csvText}
                onChange={(e) => { setCsvText(e.target.value); setCsvResult(null); setLinkError(''); }}
                placeholder={"Niranjan S S, https://drive.google.com/file/d/...\nArjun Menon, https://drive.google.com/file/d/..."}
                rows={5}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs font-mono text-slate-800 outline-none focus:border-red-500 resize-none" />

              {csvResult && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
                      <p className="text-[10px] font-bold uppercase text-emerald-700">Matched</p>
                      <p className="text-lg font-black text-emerald-900">{csvResult.matched.length}</p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5">
                      <p className="text-[10px] font-bold uppercase text-amber-700">Unmatched</p>
                      <p className="text-lg font-black text-amber-900">{csvResult.unmatched.length}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <p className="text-[10px] font-bold uppercase text-slate-600">Total</p>
                      <p className="text-lg font-black text-slate-900">{csvResult.total}</p>
                    </div>
                  </div>
                  {csvResult.matched.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 border-b border-slate-100 bg-slate-50/90 font-bold text-slate-600">
                          <tr>
                            <th className="px-3 py-2">Donor</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Certificate URL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {csvResult.matched.map(({ donor, url, name }) => (
                            <tr key={donor.ID || donor.Donor_ID} className="hover:bg-slate-50/50">
                              <td className="px-3 py-1.5 font-bold text-slate-900">
                                {donor.Name || donor.Full_Name}
                                {normalizeName(donor.Name || donor.Full_Name) !== normalizeName(name) && (
                                  <span className="ml-1 text-[10px] font-normal text-slate-400">(from: {name})</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5">
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">Matched</span>
                              </td>
                              <td className="px-3 py-1.5 max-w-[180px] truncate">
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block">{url}</a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {csvResult.unmatched.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs">
                      <p className="font-bold text-amber-800 mb-1">{csvResult.unmatched.length} unmatched name(s):</p>
                      <ul className="space-y-0.5 text-amber-700">
                        {csvResult.unmatched.map(({ name }) => (
                          <li key={name} className="flex items-center gap-1"><X className="h-3 w-3 shrink-0" />{name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <button type="button" onClick={onClose} className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <div className="flex items-center gap-2">
                  {!csvResult ? (
                    <button type="button" onClick={analyzecsv} disabled={!csvText.trim()}
                      className="cursor-pointer rounded-xl border border-slate-900 px-4 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50 disabled:opacity-50">
                      Analyse CSV
                    </button>
                  ) : csvResult.matched.length > 0 ? (
                    <button type="button" onClick={handleLinkAll} disabled={linking}
                      className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-700 px-5 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-60">
                      {linking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                      Link {csvResult.matched.length} Certificates
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
