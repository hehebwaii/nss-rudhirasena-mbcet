import { Edit3, ExternalLink, Eye, Phone } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { daysRemaining, formatShortDate, getEligibility, getCertificateUrls } from '../utils/donor';

export default function DonorCard({ donor, onView, onEdit, style }) {
  const eligibility = getEligibility(donor);
  const daysLeft = daysRemaining(donor);
  const certificateUrls = getCertificateUrls(donor);
  const name = String(donor.Name || donor.Full_Name || donor.ID || 'Unnamed');
  const venue = donor['Last Donation Venue'] || donor.Last_Donation_Venue || '—';

  return (
    <article
      style={style}
      className="animate-rise rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{name}</p>
          <p className="tnum mt-0.5 truncate text-xs text-slate-400">
            {donor.ID || donor.Donor_ID}
            {donor.Year ? ` · ${donor.Year}` : ''}
          </p>
          {donor.Contact && (
            <p className="tnum mt-1 flex items-center gap-1 text-xs text-slate-500">
              <Phone className="h-3 w-3" />
              {donor.Contact}
            </p>
          )}
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
            {donor.Location || donor.District_Location || '—'}
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
        </div>
      </div>
    </article>
  );
}
