import { useState } from 'react';
import {
  FolderSync,
  Folder,
  Link2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileText,
  Award,
  RefreshCw,
  Info,
  ClipboardPaste,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Modal from './Modal';
import { useDonors } from '../context/DonorContext';

export default function SyncDriveCertificatesModal({ open, onClose }) {
  const { syncDriveCertificates, loadDonors } = useDonors();
  const [driveUrl, setDriveUrl] = useState('');
  const [phase, setPhase] = useState('idle'); // 'idle' | 'syncing' | 'success' | 'error'
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showUnmatched, setShowUnmatched] = useState(false);

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.includes('drive.google.com')) {
          setDriveUrl(text.trim());
          setErrorMessage('');
        }
      }
    } catch {
      // ignore clipboard permission rejection
    }
  };

  const handleReset = () => {
    setDriveUrl('');
    setPhase('idle');
    setResult(null);
    setErrorMessage('');
    setShowUnmatched(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSync = async (e) => {
    e.preventDefault();
    const cleanUrl = driveUrl.trim();
    if (!cleanUrl) {
      setErrorMessage('Please paste a valid Google Drive folder link.');
      return;
    }

    if (!cleanUrl.includes('drive.google.com') && !cleanUrl.includes('folders/') && !/^[a-zA-Z0-9_-]{25,}$/.test(cleanUrl)) {
      setErrorMessage('Please provide a valid Google Drive folder URL (e.g., https://drive.google.com/drive/folders/...).');
      return;
    }

    setPhase('syncing');
    setErrorMessage('');
    setResult(null);

    try {
      const data = await syncDriveCertificates(cleanUrl);
      setResult(data);
      setPhase('success');
      await loadDonors({ silent: true });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to scan and link Drive certificates. Ensure the folder is shared with "Anyone with link can view".');
      setPhase('error');
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Link Google Drive Certificates"
      maxWidth="max-w-xl"
    >
      {phase === 'idle' || phase === 'syncing' || phase === 'error' ? (
        <form onSubmit={handleSync} className="space-y-5">
          {/* Header Description */}
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-3.5 text-xs text-slate-700">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <FolderSync className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Automatic Folder Certificate Matcher</p>
              <p className="mt-0.5 text-slate-600 leading-relaxed">
                Paste your Google Drive folder link containing donor certificates (PDFs or Images). The system will scan all files, match them with donor IDs, names, or contact numbers, and link them to each donor profile automatically.
              </p>
            </div>
          </div>

          {/* Drive Folder URL Input */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Google Drive Folder Link</span>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-red-700 hover:text-red-800"
              >
                <ClipboardPaste className="h-3 w-3" />
                Paste from Clipboard
              </button>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Link2 className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                disabled={phase === 'syncing'}
                value={driveUrl}
                onChange={(e) => {
                  setDriveUrl(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="https://drive.google.com/drive/folders/1ABCxyz..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Folder can contain certificates in PDF, JPG, PNG, or WebP formats.
            </p>
          </div>

          {/* Smart Matching Feature Cards */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs text-slate-600 space-y-2">
            <p className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              How Files Are Matched
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <p className="font-bold text-slate-800">1. By Donor ID</p>
                <p className="text-slate-500 text-[10px] mt-0.5 font-mono">RUD-001.pdf</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <p className="font-bold text-slate-800">2. By Full Name</p>
                <p className="text-slate-500 text-[10px] mt-0.5">Rahul V S.pdf</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <p className="font-bold text-slate-800">3. By Phone No</p>
                <p className="text-slate-500 text-[10px] mt-0.5 font-mono">9847123456.jpg</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={phase === 'syncing'}
              onClick={handleClose}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={phase === 'syncing' || !driveUrl.trim()}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-red-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-800 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {phase === 'syncing' ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Scanning & Matching...</span>
                </>
              ) : (
                <>
                  <FolderSync className="h-3.5 w-3.5" />
                  <span>Scan & Match Certificates</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Success Report View */
        <div className="space-y-4">
          {/* Success Banner */}
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">Drive Certificates Successfully Linked!</p>
              <p className="mt-0.5 text-emerald-700">
                {result?.message || `Linked ${result?.matchedCount || 0} certificate(s) across ${result?.updatedDonorsCount || 0} donor record(s).`}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Files Scanned</p>
              <p className="text-lg font-black text-slate-800">{result?.totalFiles || 0}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5">
              <p className="text-[10px] font-bold text-emerald-700 uppercase">Matched Certs</p>
              <p className="text-lg font-black text-emerald-700">{result?.matchedCount || 0}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-2.5">
              <p className="text-[10px] font-bold text-blue-700 uppercase">Donors Updated</p>
              <p className="text-lg font-black text-blue-700">{result?.updatedDonorsCount || 0}</p>
            </div>
          </div>

          {/* Matched Donors List */}
          {result?.matches && result.matches.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden text-xs">
              <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-red-600" />
                  Matched Certificates ({result.matches.length})
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Ready on Website
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 p-1">
                {result.matches.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate">{m.donorName}</span>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                          {m.donorId}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{m.fileName}</p>
                    </div>
                    <a
                      href={m.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unmatched Files (Expandable) */}
          {result?.unmatchedFiles && result.unmatchedFiles.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs">
              <button
                type="button"
                onClick={() => setShowUnmatched(!showUnmatched)}
                className="w-full flex items-center justify-between font-bold text-slate-700 text-left cursor-pointer"
              >
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Info className="h-3.5 w-3.5 text-slate-400" />
                  {result.unmatchedFiles.length} file(s) not matched to any donor
                </span>
                {showUnmatched ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showUnmatched && (
                <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-1">
                  <p className="text-[10px] text-slate-500">
                    To link these files, rename them with the Donor ID (e.g. <code className="font-mono text-slate-700">RUD-001.pdf</code>) or exact Donor Name.
                  </p>
                  <ul className="text-[11px] text-slate-600 font-mono list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto">
                    {result.unmatchedFiles.map((fn, i) => (
                      <li key={i} className="truncate">{fn}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Footer Action */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Link Another Folder
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 active:scale-95 transition-all"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Done & Refresh View</span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
