import { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share2, PlusSquare, WifiOff, CheckCircle2 } from 'lucide-react';
import { usePWA } from '../context/PWAContext';
import Modal from './Modal';

export default function PWAInstallPrompt() {
  const {
    isInstallable,
    isInstalled,
    isOffline,
    isIOS,
    showInstallModal,
    setShowInstallModal,
    promptInstall,
  } = usePWA();

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('nss_pwa_prompt_dismissed');
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('nss_pwa_prompt_dismissed', 'true');
  };

  return (
    <>
      {/* Offline Connectivity Banner */}
      {isOffline && (
        <div
          role="status"
          className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md animate-slideDown"
        >
          <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
          <span>Offline Mode Active — You can continue browsing cached donor records & camp details.</span>
        </div>
      )}

      {/* Floating PWA Install Prompt (Bottom Right) */}
      {!isInstalled && isInstallable && !dismissed && (
        <aside
          aria-label="Install mobile app prompt"
          className="fixed bottom-4 right-4 z-40 max-w-sm rounded-2xl border border-red-200 bg-white/95 p-4 shadow-raised backdrop-blur-md animate-rise transition-transform sm:bottom-6 sm:right-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white shadow-sm ring-2 ring-red-100">
                <Smartphone className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">Install Rudhirasena App</p>
                <p className="text-xs text-slate-500">Fast access & offline camp support</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={promptInstall}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-red-700 active:scale-[0.98] transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Install Now
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Later
            </button>
          </div>
        </aside>
      )}

      {/* Manual / iOS Installation Modal Guide */}
      <Modal
        open={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        title="Install Mobile App"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 py-1">
          <div className="flex items-center gap-3.5 rounded-2xl bg-red-50/80 p-3.5 ring-1 ring-red-100">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-700 text-white shadow-sm">
              <Smartphone className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">NSS Rudhirasena Mobile App</p>
              <p className="text-xs text-slate-600">MBCET Units 230 & 706 Coordinator Portal</p>
            </div>
          </div>

          {isIOS ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs text-slate-700">
              <p className="font-bold text-slate-900">To install on iPhone / iPad (Safari):</p>
              <ol className="list-decimal space-y-2 pl-4 leading-relaxed">
                <li className="flex items-center gap-2">
                  <span>1. Tap the</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-bold shadow-xs border border-slate-200">
                    <Share2 className="h-3.5 w-3.5 text-blue-600" /> Share
                  </span>
                  <span>button at bottom of screen.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>2. Scroll down & tap</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-bold shadow-xs border border-slate-200">
                    <PlusSquare className="h-3.5 w-3.5 text-slate-700" /> Add to Home Screen
                  </span>
                </li>
                <li>3. Tap <strong>Add</strong> in top right corner.</li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-700">
                <p className="font-bold text-slate-900 mb-2">How to install on Android (Chrome / Edge):</p>
                <ol className="list-decimal space-y-2 pl-4 leading-relaxed">
                  <li>Tap the <strong>three dots (⋮)</strong> menu in the browser top-right corner.</li>
                  <li>
                    Select{' '}
                    <strong className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                      "Install app"
                    </strong>{' '}
                    or{' '}
                    <strong className="text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      "Add to Home screen"
                    </strong>.
                  </li>
                  <li>Confirm by tapping <strong>Install / Add</strong>.</li>
                </ol>
              </div>

              <div className="space-y-1.5 pt-1 text-xs text-slate-600">
                <p className="flex items-center gap-2 font-medium text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  Instant home screen icon with full-screen experience
                </p>
                <p className="flex items-center gap-2 font-medium text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  Offline cached directory access during blood camps
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
