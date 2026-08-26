import { Edit3, ExternalLink, Eye, Phone, QrCode, Trash2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import CooldownProgress from './CooldownProgress';
import { daysRemaining, formatShortDate, getEligibility, getCertificateUrls } from '../utils/donor';

export default function DonorCard({
  donor,
  isSelected = false,
  onToggleSelect,
  onView,
  onEdit,
  onViewIdCard,
  onDeleteDonor,
  style,
}) {
  const donorId = donor.ID || donor.Donor_ID;
  const eligibility = getEligibility(donor);
  const daysLeft = daysRemaining(donor);
  const certificateUrls = getCertificateUrls(donor);
  const name = String(donor.Name || donor.Full_Name || donor.ID || 'Unnamed');
  const venue = donor['Last Donation Venue'] || donor.Last_Donation_Venue || '—';

  return (
    <article
      style={style}
      onClick={() => onView && onView(donor)}
      className={`animate-rise cursor-pointer rounded-2xl border bg-white p-4 shadow-card transition-all duration-200 hover:shadow-raised ${
        isSelected ? 'border-red-400 bg-red-50/40 ring-2 ring-red-500/20' : 'border-slate-200/80'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {onToggleSelect && (
            <div
              className="pt-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                aria-label={`Select ${name}`}
                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-red-600 focus:ring-red-500"
                checked={isSelected}
                onChange={() => onToggleSelect(donorId)}
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{name}</p>
            <p className="tnum mt-0.5 truncate text-xs text-slate-400">
              {donorId}
              {donor.Year ? ` · ${donor.Year}` : ''}
            </p>
            {donor.Contact && (
              <p className="tnum mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Phone className="h-3 w-3" />
                {donor.Contact}
              </p>
            )}
          </div>
        </div>
        <span className="tnum inline-flex shrink-0 items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-200">
          {donor['Blood Group'] || donor.Blood_Group || '—'}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-slate-400">Dept · Year</dt>
          <dd className="mt-0.5 truncate font-medium text-slate-700">
            {donor.Department || '—'}
            {donor.Year ? ` · ${donor.Year}` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Location</dt>
          <dd className="mt-0.5 truncate font-medium text-slate-700">
            {donor.Location || donor.District_Location || donor.district_location || donor['District / Location'] || donor.District || donor.city || donor.City || '—'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Last Donation Venue</dt>
          <dd className="mt-0.5 truncate font-medium text-slate-700" title={venue}>
            {venue} · {formatShortDate(donor['Last Donated Date'] || donor.Last_Donated_Date)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Next Eligible</dt>
          <dd
            className={`tnum mt-0.5 font-semibold ${
              eligibility === 'eligible'
                ? 'text-emerald-700'
                : eligibility === 'cooling'
                  ? 'text-orange-600'
                  : 'text-slate-500'
            }`}
          >
            {formatShortDate(donor['Next Eligible Date'] || donor.Next_Eligible_Date)}
          </dd>
        </div>
      </dl>

      {/* 90-Day Cooldown Meter (Visible during active cooldown) */}
      {eligibility === 'cooling' && (
        <div className="mt-3 rounded-xl bg-orange-50/60 p-2.5 ring-1 ring-orange-200/50">
          <CooldownProgress donor={donor} />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <StatusBadge eligibility={eligibility} daysLeft={daysLeft} />
        <div
          className="flex items-center gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          {certificateUrls.length > 0 && (
            <a
              href={certificateUrls[0]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open certificate for ${name}`}
              title={certificateUrls.length > 1 ? `View Certificate (1 of ${certificateUrls.length})` : 'View Certificate'}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {onViewIdCard && (
            <button
              type="button"
              onClick={() => onViewIdCard(donor)}
              aria-label={`View ID Card for ${name}`}
              title="View Digital Donor ID Card"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:scale-95"
            >
              <QrCode className="h-4 w-4" />
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(donor)}
              aria-label={`Edit details for ${name}`}
              title="Edit Details"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:scale-95"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onView(donor)}
            aria-label={`View profile of ${name}`}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-700 transition-[color,background-color,transform] duration-150 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:scale-95"
          >
            <Eye className="h-4 w-4" />
            View
          </button>
          {onDeleteDonor && (
            <button
              type="button"
              onClick={() => onDeleteDonor(donor)}
              aria-label={`Delete ${name}`}
              title="Delete Donor"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-600 active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
