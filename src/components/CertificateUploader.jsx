import { useState, useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Paperclip,
  Trash2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export default function CertificateUploader({
  certificateUrl,
  onUrlChange,
  certificateFile,
  onFileChange,
}) {
  const [mode, setMode] = useState(certificateFile ? 'file' : certificateUrl ? 'url' : 'file');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid format. Please choose a PDF, PNG, JPG, or WEBP file.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max limit is 5MB.`);
      return;
    }

    setError('');
    try {
      const base64 = await fileToBase64(file);
      onFileChange({
        data: base64,
        name: file.name,
        type: file.type,
        size: file.size,
      });
    } catch (err) {
      setError('Could not process file. Please try again.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const removeFile = () => {
    onFileChange(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isPdf = certificateFile?.type === 'application/pdf' || certificateFile?.name?.endsWith('.pdf');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-700">
          Donation Certificate
          <span className="text-xs font-normal text-slate-400"> (optional)</span>
        </label>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`cursor-pointer rounded-md px-2.5 py-1 transition-colors ${
              mode === 'file'
                ? 'bg-white font-semibold text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`cursor-pointer rounded-md px-2.5 py-1 transition-colors ${
              mode === 'url'
                ? 'bg-white font-semibold text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Paste Link
          </button>
        </div>
      </div>

      {mode === 'file' ? (
        <div>
          {certificateFile ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  {isPdf ? <FileText className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900">
                    {certificateFile.name}
                  </p>
                  <p className="tnum mt-0.5 text-[11px] text-slate-500">
                    {(certificateFile.size / 1024).toFixed(0)} KB · Ready to save to Drive
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-900"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={removeFile}
                  title="Remove file"
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                dragOver
                  ? 'border-red-500 bg-red-50/50'
                  : 'border-slate-300 bg-slate-50/50 hover:border-red-300 hover:bg-red-50/20'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-xs ring-1 ring-slate-200">
                <UploadCloud className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-700">
                Click to upload or drag & drop certificate
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                PDF, PNG, JPG, or WEBP up to 5MB (saved automatically to Google Drive)
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />

          {certificateUrl && !certificateFile && (
            <p className="mt-1.5 truncate text-[11px] text-slate-500">
              Current saved link:{' '}
              <a
                href={certificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-red-700 hover:underline"
              >
                {certificateUrl}
              </a>
            </p>
          )}
        </div>
      ) : (
        <div>
          <div className="relative">
            <LinkIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="url"
              maxLength={500}
              value={certificateUrl || ''}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Paste an accessible URL to the certificate file
          </p>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
