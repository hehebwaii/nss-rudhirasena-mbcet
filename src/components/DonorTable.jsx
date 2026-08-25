import { Edit3, ExternalLink, Eye, MapPin, Phone, QrCode } from 'lucide-react';
import StatusBadge from './StatusBadge';
import CooldownProgress from './CooldownProgress';
import {
  daysRemaining,
  formatShortDate,
  getEligibility,
  getCertificateUrls,
  normalizeYear,
} from '../utils/donor';

const COLUMNS = [
  { key: 'donor', label: 'Donor', align: 'text-left', width: 'min-w-[14rem]' },
  { key: 'bloodGroup', label: 'Blood Group', align: 'text-center', width: 'w-[7rem]' },
  { key: 'deptYear', label: 'Dept · Year', align: 'text-left', width: 'min-w-[12rem]' },
  { key: 'ageGender', label: 'Age · Gender', align: 'text-left', width: 'min-w-[8.5rem]' },
  { key: 'location', label: 'Location', align: 'text-left', width: 'min-w-[10rem]' },
  { key: 'venue', label: 'Last Donation Venue', align: 'text-left', width: 'min-w-[12rem]' },
  { key: 'eligibility', label: 'Next Eligible Date', align: 'text-left', width: 'min-w-[12.5rem]' },
  { key: 'actions', label: 'Actions', align: 'text-right', width: 'w-[9.5rem]' },
];

const dateClass = {
  eligible: 'text-emerald-700',
  cooling: 'text-orange-600',
  unknown: 'text-slate-500',
};

const linkFocus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600';

export default function DonorTable({ donors, onView, onEdit, onViewIdCard }) {
  return (
    <div className="hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-card md:block">
      <table className="w-full min-w-[58rem] divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50/80">
          <tr>
            {COLUMNS.map(({ key, label, align, width }) => (
              <th
                key={key}
                scope="col"
                className={`whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${align} ${width}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {donors.map((donor, index) => {
            const eligibility = getEligibility(donor);
            const daysLeft = daysRemaining(donor);
            const certificateUrls = getCertificateUrls(donor);
            const name = String(donor.Name || donor.Full_Name || donor.ID || 'Unnamed');
            const venue = donor['Last Donation Venue'] || donor.Last_Donation_Venue || '—';
            const location =
              donor.Location ||
              donor.District_Location ||
              donor.district_location ||
              donor['District / Location'] ||
              donor.District ||
              donor.city ||
              donor.City ||
              '—';
            const yearStr = normalizeYear(donor.Year || donor.Year_of_Study || donor.year);
            const deptStr = donor.Department || 'General';

            return (
              <tr
                key={String(donor.ID || donor.Donor_ID || index)}
                onClick={() => onView(donor)}
                style={{ animationDelay: `${Math.min(index, 14) * 25}ms` }}
                className="animate-rise cursor-pointer transition-colors duration-150 hover:bg-red-50/30"
              >
                {/* 1. Donor Name, ID & Contact */}
                <td className="px-4 py-3.5">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onView(donor);
                      }}
                      aria-label={`View profile of ${name}`}
                      className="cursor-pointer text-left font-bold text-slate-900 transition-colors duration-150 hover:text-red-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                    >
                      {name}
                    </button>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10.5px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 rounded-md">
                        {donor.ID || donor.Donor_ID}
                      </span>
                      {donor.Contact && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {donor.Contact}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* 2. Blood Group Badge */}
                <td className="px-4 py-3.5 text-center">
                  <span className="tnum inline-flex h-7 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-xs font-black text-red-700 shadow-2xs">
                    {donor['Blood Group'] || donor.Blood_Group || '—'}
                  </span>
                </td>

                {/* 3. Department & Year */}
                <td className="px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-xs truncate max-w-[11rem]" title={deptStr}>
                      {deptStr}
                    </p>
                    <span className="inline-block mt-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                      {yearStr}
                    </span>
                  </div>
                </td>

                {/* 4. Age & Gender */}
                <td className="tnum whitespace-nowrap px-4 py-3.5 text-xs font-medium text-slate-700">
                  {donor.Age != null && donor.Age !== '' ? `${donor.Age} yrs · ` : ''}
                  <span className="font-semibold">{donor.Gender || '—'}</span>
                </td>

                {/* 5. Location */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 max-w-[10rem] truncate" title={location}>
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{location}</span>
                  </div>
                </td>

                {/* 6. Last Donation Venue & Date */}
                <td className="px-4 py-3.5">
                  <div className="min-w-0 max-w-[12rem]">
                    <p className="font-semibold text-slate-800 text-xs truncate" title={venue}>
                      {venue}
                    </p>
                    <p className="tnum mt-0.5 text-[11px] font-medium text-slate-400">
                      {formatShortDate(donor['Last Donated Date'] || donor.Last_Donated_Date)}
                    </p>
                  </div>
                </td>

                {/* 7. Next Eligible Date & Status Progress */}
                <td className="px-4 py-3.5">
                  <div className="min-w-0 max-w-[12.5rem]">
                    <p className={`tnum whitespace-nowrap text-xs font-bold ${dateClass[eligibility]}`}>
                      {formatShortDate(donor['Next Eligible Date'] || donor.Next_Eligible_Date)}
                    </p>
                    <div className="mt-1">
                      {eligibility === 'cooling' ? (
                        <CooldownProgress donor={donor} />
                      ) : (
                        <StatusBadge eligibility={eligibility} daysLeft={daysLeft} />
                      )}
                    </div>
                  </div>
                </td>

                {/* 8. Action Buttons Toolbar */}
                <td className="px-4 py-3.5 text-right">
                  <div
                    className="inline-flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {certificateUrls.length > 0 && (
                      <a
                        href={certificateUrls[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open certificate for ${name}`}
                        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 ${linkFocus}`}
                        title={certificateUrls.length > 1 ? `View Certificate (1 of ${certificateUrls.length})` : 'View Certificate'}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {onViewIdCard && (
                      <button
                        type="button"
                        onClick={() => onViewIdCard(donor)}
                        aria-label={`View ID Card for ${name}`}
                        title="View Digital Donor ID Card"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-600 active:scale-95"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(donor)}
                        aria-label={`Edit ${name}`}
                        title="Edit Details"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-600 active:scale-95"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onView(donor)}
                      aria-label={`View ${name}`}
                      title="View Profile"
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-red-600 active:scale-95"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
