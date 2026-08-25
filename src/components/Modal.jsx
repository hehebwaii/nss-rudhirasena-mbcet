import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  // Synchronously ensure mounted is true when open becomes true
  if (open && !mounted) {
    setMounted(true);
    setClosing(false);
  }

  useEffect(() => {
    if (open) {
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Lock body scroll when any modal is actively open
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted && !open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center ${
        closing ? 'pointer-events-none' : 'pointer-events-auto'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className={`absolute inset-0 h-full w-full cursor-default bg-slate-950/60 backdrop-blur-[3px] transition-opacity duration-200 ease-out ${
          closing ? 'opacity-0' : 'opacity-100 animate-veil'
        }`}
      />
      {/* Modal Dialog Card */}
      <div
        className={`relative max-h-[90vh] w-full overflow-y-auto rounded-3xl bg-white shadow-overlay ring-1 ring-slate-900/10 transition-all duration-200 ease-out ${maxWidth} ${
          closing
            ? 'opacity-0 scale-[0.96] translate-y-3'
            : 'opacity-100 scale-100 translate-y-0 animate-pop'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 py-4 backdrop-blur">
          <h2
            id="modal-title"
            className="text-lg font-bold tracking-tight text-slate-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
