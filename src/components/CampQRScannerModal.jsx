import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Search,
  Building2,
  Calendar,
  Droplet,
  Undo2,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import Modal from './Modal';
import { useDonors } from '../context/DonorContext';
import { useOperations } from '../context/OperationsContext';
import { getEligibilityDetails } from '../utils/donor';

export default function CampQRScannerModal({ open, onClose, defaultCampId }) {
  const { donors } = useDonors();
  const { camps, logCampDonation } = useOperations();

  const [selectedCampId, setSelectedCampId] = useState(defaultCampId || '');
  const [cameraActive, setCameraActive] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { donor, isEligible, daysLeft, checkedIn, error }
  const [manualQuery, setManualQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'

  const scannerRef = useRef(null);
  const audioContextRef = useRef(null);

  // Set default camp if none selected
  useEffect(() => {
    if (open) {
      if (defaultCampId) {
        setSelectedCampId(defaultCampId);
      } else if (camps && camps.length > 0) {
        const active = camps.find((c) => c.Status?.toLowerCase() === 'active') || camps[0];
        setSelectedCampId(active.ID || active.Camp_ID);
      }
      setScanResult(null);
      setManualQuery('');
    }
  }, [open, defaultCampId, camps]);

  // Web Audio Chime synthesizer
  const playSound = (type = 'success') => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(160, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      // Audio not supported or blocked
    }
  };

  // Start Scanner
  useEffect(() => {
    if (!open) return;

    let html5QrCode = null;

    const startScanner = async () => {
      try {
        const element = document.getElementById('qr-reader-viewport');
        if (!element) return;

        html5QrCode = new Html5Qrcode('qr-reader-viewport');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleDecodedQR(decodedText);
          },
          () => {
            // Scanning in progress
          }
        );
        setCameraActive(true);
      } catch (err) {
        console.warn('Camera scanner initialization note:', err);
        setCameraActive(false);
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 250);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().then(() => {
            scannerRef.current.clear();
          }).catch(() => {});
        } catch (e) {}
      }
    };
  }, [open, facingMode]);

  // Process Scanned QR Code
  const handleDecodedQR = async (rawText) => {
    if (!rawText) return;

    // Extract Donor ID from token, text or URL
    let extractedId = '';
    try {
      if (rawText.includes('ID=')) {
        const match = rawText.match(/ID=([^;|\s]+)/i);
        if (match) extractedId = match[1];
      } else if (rawText.includes('donor=')) {
        const url = new URL(rawText.startsWith('http') ? rawText : `https://x.com/${rawText}`);
        extractedId = url.searchParams.get('donor') || '';
      } else if (rawText.startsWith('{') && rawText.endsWith('}')) {
        const parsed = JSON.parse(rawText);
        extractedId = parsed.id || parsed.donorId || parsed.ID || '';
      } else {
        extractedId = rawText.trim();
      }
    } catch (e) {
      extractedId = rawText.trim();
    }

    if (!extractedId) return;

    // Lookup Donor
    const target = donors.find(
      (d) =>
        String(d.ID || d.Donor_ID).toLowerCase() === extractedId.toLowerCase() ||
        String(d.Contact || '').includes(extractedId) ||
        String(d.Name || '').toLowerCase() === extractedId.toLowerCase()
    );

    if (!target) {
      playSound('warning');
      setScanResult({
        error: `No donor found matching ID: "${extractedId}". Check registration or register as a new donor.`,
      });
      return;
    }

    // Check Eligibility
    const details = getEligibilityDetails(target);
    const isEligible = details.status === 'eligible';

    if (isEligible) {
      playSound('success');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      // Auto check-in to selected camp if available
      let checkedIn = false;
      const currentCamp = camps.find((c) => (c.ID || c.Camp_ID) === selectedCampId);
      if (currentCamp) {
        try {
          await logCampDonation({
            campId: currentCamp.ID || currentCamp.Camp_ID,
            campName: currentCamp.Name || currentCamp.Camp_Name,
            donorId: target.ID || target.Donor_ID,
            donorName: target.Name || target.Full_Name,
            bloodGroup: target['Blood Group'] || target.Blood_Group,
            units: 1,
            donationType: 'Whole Blood',
          });
          checkedIn = true;
        } catch (err) {
          console.warn('Auto log camp donation note:', err);
        }
      }

      setScanResult({
        donor: target,
        isEligible: true,
        daysLeft: 0,
        checkedIn,
        campName: currentCamp ? (currentCamp.Name || currentCamp.Camp_Name) : 'General Camp',
      });
    } else {
      playSound('warning');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([250]);
      }

      setScanResult({
        donor: target,
        isEligible: false,
        daysLeft: details.daysLeft,
        error: `Ineligible: Donor is currently in a 90-day cooldown rest period (${details.daysLeft} days remaining).`,
      });
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (manualQuery.trim()) {
      handleDecodedQR(manualQuery.trim());
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="📷 Camp Drive QR Scanner"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 py-1">
        {/* Camp Selector Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-2xl bg-red-50/80 p-3.5 ring-1 ring-red-200">
          <div className="flex items-center gap-2 text-xs font-bold text-red-900">
            <Building2 className="h-4 w-4 text-red-700 shrink-0" />
            <span>Target Blood Camp:</span>
          </div>

          <select
            value={selectedCampId}
            onChange={(e) => setSelectedCampId(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-red-300"
          >
            {camps && camps.length > 0 ? (
              camps.map((c) => (
                <option key={c.ID || c.Camp_ID} value={c.ID || c.Camp_ID}>
                  {c.Name || c.Camp_Name} ({c.Date ? String(c.Date).slice(0, 10) : 'Active'})
                </option>
              ))
            ) : (
              <option value="">Campus Donation Camp</option>
            )}
          </select>
        </div>

        {/* Scan Result Verification Card (When scanned) */}
        {scanResult && (
          <div
            className={`animate-rise rounded-2xl border p-4 shadow-sm ${
              scanResult.isEligible
                ? 'border-emerald-200 bg-emerald-50/90 text-emerald-900'
                : 'border-orange-200 bg-orange-50/90 text-orange-900'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    scanResult.isEligible ? 'bg-emerald-600 text-white' : 'bg-orange-600 text-white'
                  }`}
                >
                  {scanResult.isEligible ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                </span>
                <div>
                  <h4 className="text-base font-bold">
                    {scanResult.donor
                      ? String(scanResult.donor.Name || scanResult.donor.Full_Name)
                      : 'Scan Alert'}
                  </h4>
                  <p className="text-xs font-medium">
                    {scanResult.donor && (
                      <span className="mr-2 inline-flex items-center gap-1 rounded bg-white/80 px-1.5 py-0.5 font-bold text-red-700 border border-red-200">
                        <Droplet className="h-3 w-3" />
                        {scanResult.donor['Blood Group'] || scanResult.donor.Blood_Group}
                      </span>
                    )}
                    {scanResult.donor ? (scanResult.donor.ID || scanResult.donor.Donor_ID) : ''}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed">
                    {scanResult.isEligible
                      ? `✅ Check-in recorded to ${scanResult.campName}!`
                      : scanResult.error}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setScanResult(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex justify-end gap-2 border-t border-slate-200/50 pt-2.5">
              <button
                type="button"
                onClick={() => setScanResult(null)}
                className="flex items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                <span>Scan Next Donor</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Camera Viewport */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-slate-950 shadow-inner">
          <div
            id="qr-reader-viewport"
            className="h-[280px] w-full flex items-center justify-center text-white"
          />

          {/* Scanner Controls Floating Overlay */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={toggleFacingMode}
              aria-label="Flip camera"
              title="Flip Camera (Front/Back)"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              aria-label="Toggle chime sound"
              title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition-colors"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
            </button>
          </div>

          <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none z-10">
            <span className="rounded-full bg-black/70 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
              Point camera at Donor ID Card QR Code
            </span>
          </div>
        </div>

        {/* Manual ID / Phone Fallback Search */}
        <form onSubmit={handleManualSearch} className="flex gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="Or type Donor ID / Phone / Name manually..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <button
            type="submit"
            className="flex cursor-pointer items-center justify-center rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition-colors"
          >
            Verify
          </button>
        </form>
      </div>
    </Modal>
  );
}
