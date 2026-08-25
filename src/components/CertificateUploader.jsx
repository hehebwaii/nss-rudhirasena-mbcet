import { useState, useRef } from 'react';
import {
  AlertCircle,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Trash2,
  UploadCloud,
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

export default function CertificateUploader({ certificates = [], onChange }) {
  const [addMode, setAddMode] = useState('file'); // 'file' | 'url'
  const [urlInput, setUrlInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;
    setError('');

    const newCerts = [...certificates];
    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`"${file.name}" is not a supported format. Choose PDF, PNG, JPG, or WEBP.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`"${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max 5MB.`);
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        newCerts.push({
          type: 'file',
          fileData: base64,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });
      } catch (err) {
        setError('Error reading file. Please try again.');
      }
    }

    onChange(newCerts);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setError('');
    onChange([...certificates, { type: 'url', url: trimmed }]);
    setUrlInput('');
  };

  const handleRemove = (index) => {
    const updated = certificates.filter((_, idx) => idx !== index);
    onChange(updated);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-700">
          Donation Certificates
          <span className="text-xs font-normal text-slate-400">
            {' '}({certificates.length} attached)
          </span>
        </label>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setAddMode('file')}
            className={`cursor-pointer rounded-md px-2.5 py-1 transition-colors ${
              addMode === 'file'
                ? 'bg-white font-semibold text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setAddMode('url')}
            className={`cursor-pointer rounded-md px-2.5 py-1 transition-colors ${
              addMode === 'url'
                ? 'bg-white font-semibold text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Add Link
          </button>
        </div>
      </div>

      {/* List of Attached Certificates */}
      {certificates.length > 0 && (
        <div className="space-y-2">
          {certificates.map((cert, index) => {
            const isFile = cert.type === 'file';
            const isPdf = isFile && (cert.fileType === 'application/pdf' || cert.fileName?.endsWith('.pdf'));
            const displayName = isFile
              ? cert.fileName
              : cert.url?.length > 45
                ? cert.url.slice(0, 42) + '...'
                : cert.url;

            return (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 shadow-xs ring-1 ring-slate-200">
                    {isFile ? (
                      isPdf ? <FileText className="h-4 w-4 text-red-600" /> : <ImageIcon className="h-4 w-4 text-blue-600" />
                    ) : (
                      <LinkIcon className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      {displayName}
                    </p>
                    <p className="tnum text-[10px] text-slate-400">
                      Certificate #{index + 1} · {isFile ? `${(cert.fileSize / 1024).toFixed(0)} KB (Pending Drive upload)` : 'Saved web link'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {!isFile && cert.url && (
                    <a
                      href={cert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
                      title="Open Link"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Remove Certificate"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Certificate Controls */}
      {addMode === 'file' ? (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
              dragOver
                ? 'border-red-500 bg-red-50/50'
                : 'border-slate-300 bg-slate-50/50 hover:border-red-300 hover:bg-red-50/20'
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-xs ring-1 ring-slate-200">
              <UploadCloud className="h-4 w-4 text-red-600" />
            </div>
            <p className="mt-1.5 text-xs font-semibold text-slate-700">
              {certificates.length > 0 ? '+ Upload Another Certificate' : 'Click or drop certificate files here'}
            </p>
            <p className="text-[11px] text-slate-400">
              PDF, PNG, JPG, or WEBP up to 5MB (saved to Google Drive)
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleFileSelect(e.target.files);
              }
            }}
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="url"
              maxLength={500}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUrl();
                }
              }}
              placeholder="https://drive.google.com/..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <button
            type="button"
            onClick={handleAddUrl}
            className="flex cursor-pointer items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
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
