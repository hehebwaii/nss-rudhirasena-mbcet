import { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Download,
  Share2,
  Droplet,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Phone,
  Sparkles,
  QrCode as QrIcon,
  Copy,
  Info
} from 'lucide-react';
import Modal from './Modal';
import { getEligibilityDetails, formatShortDate } from '../utils/donor';

const generateQRCodeDataUrl = async (payload, options) => {
  try {
    const fn = QRCode?.toDataURL || QRCode?.default?.toDataURL;
    if (typeof fn === 'function') {
      return await fn(payload, options);
    }
  } catch (e) {
    console.error('QR code generation error:', e);
  }
  return '';
};

export default function DigitalDonorCardModal({ open, donor, onClose }) {
  const lastDonorRef = useRef(donor);
  if (donor) lastDonorRef.current = donor;
  const activeDonor = donor || lastDonorRef.current;

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareNotice, setShareNotice] = useState('');
  const cardRef = useRef(null);

  const name = String(activeDonor?.Name || activeDonor?.Full_Name || activeDonor?.ID || 'Donor');
  const bloodGroup = activeDonor ? activeDonor['Blood Group'] || activeDonor.Blood_Group || '—' : '—';
  const donorId = activeDonor ? activeDonor.ID || activeDonor.Donor_ID || 'RUD-001' : 'RUD-001';
  const dept = activeDonor?.Department || activeDonor?.Department_Year || 'MBCET';
  const year = activeDonor?.Year || activeDonor?.Year_of_Study || '';
  const contact = activeDonor?.Contact || activeDonor?.Contact_Number || '';
  const eligibility = activeDonor ? getEligibilityDetails(activeDonor) : null;
  const isEligible = eligibility?.status === 'eligible';

  // Offline Verification Token payload (No web URLs encoded)
  const qrPayload = `NSS-RUDHIRASENA:ID=${donorId};NAME=${name};BG=${bloodGroup};DEPT=${dept};STATUS=${isEligible ? 'ELIGIBLE' : 'COOLDOWN'}`;

  useEffect(() => {
    if (activeDonor && open) {
      setShareNotice('');
      generateQRCodeDataUrl(qrPayload, {
        width: 320,
        margin: 1,
        color: {
          dark: '#991B1B',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      }).then((url) => {
        if (url) setQrDataUrl(url);
      });
    }
  }, [activeDonor, open, qrPayload]);

  // Canvas Generator (1050 x 650)
  const generateCanvas = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = 1050;
    const height = 650;
    canvas.width = width;
    canvas.height = height;

    // 1. Background Card Base
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    roundRect(ctx, 0, 0, width, height, 32);
    ctx.fill();

    // 2. Header Gradient (NSS Crimson to Dark Ruby)
    const grad = ctx.createLinearGradient(0, 0, width, 180);
    grad.addColorStop(0, '#B91C1C');
    grad.addColorStop(0.5, '#991B1B');
    grad.addColorStop(1, '#7F1D1D');
    ctx.fillStyle = grad;
    ctx.beginPath();
    roundRect(ctx, 0, 0, width, 180, [32, 32, 0, 0]);
    ctx.fill();

    // Gold Accent Strip
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(0, 176, width, 6);

    // 3. Header Text & Branding
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px Inter, system-ui, sans-serif';
    ctx.fillText('NSS RUDHIRASENA', 50, 68);

    ctx.fillStyle = '#FEE2E2';
    ctx.font = '600 20px Inter, system-ui, sans-serif';
    ctx.fillText('BLOOD DONOR REGISTRY & OPERATIONS', 50, 104);

    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#FEF3C7';
    ctx.fillText('NSS MBCET Units 230 & 706 · Mar Baselios College of Engineering & Tech', 50, 140);

    // Header Blood Droplet Logo
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(width - 90, 88, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#B91C1C';
    ctx.font = 'bold 28px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bloodGroup, width - 90, 98);
    ctx.textAlign = 'left';

    // 4. Donor Info Fields
    ctx.fillStyle = '#64748B';
    ctx.font = '600 16px Inter, system-ui, sans-serif';
    ctx.fillText('DONOR NAME', 50, 240);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 38px Inter, system-ui, sans-serif';
    ctx.fillText(name, 50, 285);

    // Donor ID & Blood Group Info Row
    ctx.fillStyle = '#64748B';
    ctx.font = '600 16px Inter, system-ui, sans-serif';
    ctx.fillText('DONOR ID', 50, 345);
    ctx.fillText('BLOOD GROUP', 280, 345);
    ctx.fillText('DEPARTMENT & YEAR', 500, 345);

    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 24px Inter, monospace';
    ctx.fillText(donorId, 50, 380);

    ctx.fillStyle = '#B91C1C';
    ctx.font = 'bold 26px Inter, system-ui, sans-serif';
    ctx.fillText(bloodGroup, 280, 380);

    ctx.fillStyle = '#1E293B';
    ctx.font = '600 22px Inter, system-ui, sans-serif';
    const deptText = [dept, year].filter(Boolean).join(' · ');
    ctx.fillText(deptText || 'General', 500, 380);

    // Contact & Status
    ctx.fillStyle = '#64748B';
    ctx.font = '600 16px Inter, system-ui, sans-serif';
    ctx.fillText('CONTACT', 50, 440);
    ctx.fillText('STATUS', 280, 440);

    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 22px Inter, system-ui, sans-serif';
    ctx.fillText(contact || '—', 50, 475);

    ctx.fillStyle = isEligible ? '#059669' : '#D97706';
    ctx.font = 'bold 22px Inter, system-ui, sans-serif';
    ctx.fillText(isEligible ? 'Eligible to Donate' : `In 90-Day Cooldown (${eligibility?.daysLeft}d left)`, 280, 475);

    // 5. Draw QR Code
    if (qrDataUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = qrDataUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });

        // QR Box
        ctx.fillStyle = '#F8FAFC';
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        roundRect(ctx, width - 260, 220, 210, 210, 16);
        ctx.fill();
        ctx.stroke();

        ctx.drawImage(img, width - 245, 235, 180, 180);

        ctx.fillStyle = '#64748B';
        ctx.font = 'bold 13px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('OFFLINE CAMP VERIFICATION', width - 155, 455);
        ctx.textAlign = 'left';
      } catch (qrDrawErr) {
        console.error('Error drawing QR onto canvas:', qrDrawErr);
      }
    }

    // 6. Card Footer
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    roundRect(ctx, 0, height - 80, width, 80, [0, 0, 32, 32]);
    ctx.fill();

    ctx.fillStyle = '#475569';
    ctx.font = '500 15px Inter, system-ui, sans-serif';
    ctx.fillText('NSS MBCET Units 230 & 706 · Official Voluntary Donor Card', 50, height - 35);

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 15px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('VERIFIED NSS DONOR', width - 50, height - 35);

    return canvas;
  };

  // High-Resolution Canvas PNG Download
  const handleDownloadPNG = async () => {
    if (!activeDonor) return;
    setDownloading(true);

    try {
      const canvas = await generateCanvas();
      const link = document.createElement('a');
      link.download = `rudhirasena-id-${donorId.toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download card error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const cleanWhatsAppPhone = (rawPhone) => {
    if (!rawPhone) return '';
    let digits = String(rawPhone).replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 11) {
      digits = digits.slice(1);
    }
    if (digits.length === 10) {
      digits = '91' + digits;
    }
    return digits;
  };

  // Direct WhatsApp Image + Message Share
  const handleShareWhatsApp = async () => {
    if (!activeDonor) return;
    setSharing(true);
    setShareNotice('');

    const phone = cleanWhatsAppPhone(
      activeDonor.Contact ||
      activeDonor.Contact_Number ||
      activeDonor['Contact Number'] ||
      activeDonor.Phone ||
      activeDonor['Phone Number'] ||
      activeDonor['WhatsApp Number'] ||
      activeDonor.WhatsApp ||
      contact ||
      ''
    );

    // Private text message without web application URLs
    const messageText = `🩸 *NSS Rudhirasena Blood Donor Card*\n\nDear *${name}*,\nThank you for being a voluntary blood donor with NSS MBCET Units 230 & 706.\n\n👤 *Donor Name:* ${name}\n🩸 *Blood Group:* ${bloodGroup}\n🆔 *Donor ID:* ${donorId}\n🏢 *Department:* ${dept} ${year}\n📞 *Contact:* ${contact}\n✅ *Status:* ${isEligible ? 'Eligible to Donate' : `In 90-Day Cooldown (${eligibility?.daysLeft}d remaining)`}\n\n_Please save the attached QR Donor Card and present it during camp drive check-ins._\n\n_NSS MBCET Units 230 & 706 · Mar Baselios College of Engineering & Technology_`;

    try {
      const canvas = await generateCanvas();
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], `rudhirasena-id-${donorId.toLowerCase()}.png`, {
        type: 'image/png',
      });

      const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

      // 1. On Mobile devices ONLY: Try Native Web Share API if supported
      if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'NSS Rudhirasena Blood Donor Card',
          text: messageText,
          files: [file],
        });
        setSharing(false);
        return;
      }

      // 2. On Desktop (Windows/Mac/Linux): Directly launch WhatsApp & copy image to clipboard
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob,
            }),
          ]);
          setShareNotice('✅ Card image copied to clipboard! Simply press Ctrl+V in WhatsApp to send the image.');
        } else {
          setShareNotice('✅ Card image downloaded! Attach the saved file in WhatsApp.');
        }
      } catch (clipErr) {
        setShareNotice('✅ Card image downloaded! Attach the saved file in WhatsApp.');
      }

      // Auto download PNG backup for coordinator
      const link = document.createElement('a');
      link.download = `rudhirasena-id-${donorId.toLowerCase()}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();

      // Directly open WhatsApp chat without triggering Windows Share dialog
      const waUrl = phone
        ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(messageText)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;

      window.open(waUrl, '_blank');
    } catch (err) {
      console.error('WhatsApp share error:', err);
      // Generic fallback
      if (phone) {
        window.open(
          `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(messageText)}`,
          '_blank'
        );
      }
    } finally {
      setSharing(false);
    }
  };

  if (!activeDonor) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Digital Donor ID Card"
      maxWidth="max-w-xl"
    >
      <div className="space-y-5 py-2">
        {/* Physical-Style PVC ID Card Preview */}
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl transition-all duration-300 hover:shadow-raised"
        >
          {/* Header Banner */}
          <div className="relative bg-gradient-to-br from-red-700 via-red-800 to-rose-900 px-6 py-5 text-white">
            <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 backdrop-blur-xs">
                    <Droplet className="h-4 w-4 fill-white text-white" />
                  </span>
                  <h3 className="text-base font-black tracking-wider text-white uppercase">
                    NSS Rudhirasena
                  </h3>
                </div>
                <p className="mt-1 text-[11px] font-medium tracking-wide text-red-100 uppercase">
                  Blood Donor Registry & Operations
                </p>
                <p className="text-[10px] font-semibold text-amber-300">
                  NSS MBCET Units 230 & 706
                </p>
              </div>

              {/* Blood Group Badge Top Right */}
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white/20 px-3.5 py-1.5 backdrop-blur-md ring-1 ring-white/30">
                <span className="text-xs font-semibold text-red-100 uppercase">Group</span>
                <span className="tnum text-lg font-black text-white">{bloodGroup}</span>
              </div>
            </div>
            {/* Golden Strip */}
            <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-400" />
          </div>

          {/* Card Body */}
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
              {/* Donor Details */}
              <div className="min-w-0 flex-1 space-y-3.5 text-center sm:text-left">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Donor Name
                  </p>
                  <p className="truncate text-xl font-bold tracking-tight text-slate-900">
                    {name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Donor ID
                    </p>
                    <p className="tnum font-mono text-sm font-bold text-slate-800">
                      {donorId}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Department
                    </p>
                    <p className="truncate text-xs font-semibold text-slate-700">
                      {dept} {year ? `· ${year}` : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  {contact && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Contact
                      </p>
                      <p className="tnum text-xs font-semibold text-slate-700">
                        {contact}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Readiness
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        isEligible
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          : 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
                      }`}
                    >
                      {isEligible ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Eligible
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" /> Cooldown ({eligibility?.daysLeft}d)
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-inner">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR code for ${name}`}
                    className="h-28 w-28 rounded-lg"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-slate-200 animate-pulse">
                    <QrIcon className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                <span className="mt-1.5 text-[10px] font-bold tracking-tight text-slate-500 uppercase">
                  Camp QR Pass
                </span>
              </div>
            </div>
          </div>

          {/* Card Footer Stripe */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/90 px-6 py-2.5 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5 text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Verified NSS Blood Donor Card
            </span>
            <span className="text-[10px] font-bold text-red-700 uppercase">
              Units 230 & 706
            </span>
          </div>
        </div>

        {/* Share Notice Banner (if copied/downloaded) */}
        {shareNotice && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 animate-rise">
            <Info className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{shareNotice}</span>
          </div>
        )}

        {/* Action Buttons: Download & WhatsApp Share */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-red-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{downloading ? 'Generating PNG...' : 'Download Card (PNG)'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={sharing}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-600 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Share2 className="h-4 w-4 text-emerald-700" />
            <span>
              {sharing
                ? 'Preparing Share...'
                : contact
                ? `Send to Donor (${contact})`
                : 'Send via WhatsApp'}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Canvas helper function to draw rounded rectangles
function roundRect(ctx, x, y, width, height, radius) {
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else if (Array.isArray(radius)) {
    radius = { tl: radius[0], tr: radius[1], br: radius[2], bl: radius[3] };
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
}
