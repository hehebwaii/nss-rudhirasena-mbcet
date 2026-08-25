import {
  User,
  Phone,
  MapPin,
  Droplet,
  Activity,
  Building2,
  CalendarDays,
  Edit3,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import { daysRemaining, formatShortDate, getEligibility, getCertificateUrls } from '../utils/donor';

const dateClass = {
  eligible: 'text-emerald-700',
  cooling: 'text-orange-600',
  unknown: 'text-slate-500',
};

export default function DonorProfileModal({ open, donor, onClose, onEdit }) {
  if (!open || !donor) return null;

  const eligibility = getEligibility(donor);
  const daysLeft = daysRemaining(donor);
  const name = String(donor.Name || donor.Full_Name || donor.ID || 'Unnamed');
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('') || '?';
  const certificateUrls = getCertificateUrls(donor);
  const contact = donor.Contact || donor.Contact_Number ? String(donor.Contact || donor.Contact_Number) : '';
  const digits = contact.replace(/[\s-]/g, '');

  const fields = [
    {
      icon: Building2,
      label: 'Department & Year',
      value: [donor.Department || donor.Department_Year, donor.Year].filter(Boolean).join(' · '),
    },
    {
      icon: Activity,
      label: 'Age · Gender',
      value:
        [
          donor.Age != null && donor.Age !== '' ? donor.Age : null,
          donor.Gender || null,
        ]
          .filter(Boolean)
          .join(' · ') || '',
      tnum: true,
    },
    { icon: MapPin, label: 'Location', value: donor.Location || donor.District_Location },
    {
      icon: MapPin,
      label: 'Last Donation Venue',
      value: donor['Last Donation Venue'] || donor.Last_Donation_Venue,
    },
    {
      icon: Droplet,
      label: 'Last Donation Type',
      value: donor['Last Donation Type'] || donor.Last_Donation_Type,
    },
    {
      icon: CalendarDays,
      label: 'Last Donated Date',
      value: formatShortDate(donor['Last Donated Date'] || donor.Last_Donated_Date),
      tnum: true,
    },
  ];

  const actionClass =
    'flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-[color,background-color,border-color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]';

  return (
    <Modal open={open} onClose={onClose} title="Donor Profile">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-50 text-lg font-bold text-red-700 ring-1 ring-inset ring-red-200">
            {initials}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold tracking-tight text-slate-900">
              {name}
            </h3>
            <p className="tnum mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              {donor.ID || donor.Donor_ID}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="tnum inline-flex w-fit items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-200">
                <Droplet className="h-3 w-3" />
                {donor['Blood Group'] || donor.Blood_Group || '—'}
              </span>
              <StatusBadge eligibility={eligibility} daysLeft={daysLeft} />
            </div>
          </div>
        </div>

        {onEdit && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(donor);
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-600 active:scale-[0.98]"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
        {fields.map(({ icon: RowIcon, label, value, tnum }) => (
          <div key={label} className="flex items-start gap-3">
            <RowIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {label}
              </dt>
              <dd
                className={`mt-0.5 break-words text-sm font-semibold text-slate-800 ${tnum ? 'tnum' : ''}`}
              >
                {value || '—'}
              </dd>
            </div>
          </div>
        ))}
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Next Eligible Date
            </dt>
            <dd className={`tnum mt-0.5 text-sm font-bold ${dateClass[eligibility]}`}>
              {formatShortDate(donor['Next Eligible Date'] || donor.Next_Eligible_Date)}
            </dd>
          </div>
        </div>
      </dl>

      {(contact || certificateUrls.length > 0) && (
        <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
          {contact && (
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`tel:${digits}`}
                className={`${actionClass} border-slate-300 text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-red-600`}
              >
                <Phone className="h-4 w-4" />
                Call
              </a>
              <a
                href={`https://wa.me/${digits}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${actionClass} border-emerald-300 text-emerald-700 hover:bg-emerald-50 focus-visible:outline-emerald-600`}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          )}

          {certificateUrls.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="mb-2 text-xs font-bold text-slate-700">
                Verified Donation Certificates ({certificateUrls.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {certificateUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-red-600" />
                    Certificate {certificateUrls.length > 1 ? `#${idx + 1}` : ''}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
        {onEdit ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(donor);
            }}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-slate-900 active:scale-[0.98]"
          >
            <Edit3 className="h-4 w-4 text-slate-300" />
            Edit Details
          </button>
        ) : <div />}
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-[color,background-color,transform] duration-150 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 active:scale-[0.98]"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
