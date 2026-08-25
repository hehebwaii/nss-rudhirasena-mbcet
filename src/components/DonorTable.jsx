import { ExternalLink } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { daysRemaining, formatShortDate, getEligibility } from '../utils/donor';

const COLUMNS = [
  'Donor',
  'Blood Group',
  'Age · Gender',
  'Location',
  'Last Donation',
  'Next Eligible Date',
  'Certificate',
];

const dateClass = {
  eligible: 'text-emerald-700',
  cooling: 'text-orange-600',
  unknown: 'text-slate-500',
};

const linkFocus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600';

export default function DonorTable({ donors, onView }) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card md:block">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {COLUMNS.map((column) => (
              <th
                key={column}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {donors.map((donor, index) => {
            const eligibility = getEligibility(donor);
            const daysLeft = daysRemaining(donor);
            const certificateUrl = donor['Certificate URL']
              ? String(donor['Certificate URL'])
              : '';
            const name = String(donor.Name || donor.ID || 'Unnamed');
            return (
              <tr
                key={String(donor.ID || index)}
                onClick={() => onView(donor)}
                style={{ animationDelay: `${Math.min(index, 14) * 25}ms` }}
                className="animate-rise cursor-pointer transition-colors duration-150 hover:bg-red-50/40"
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onView(donor);
                    }}
                    aria-label={`View profile of ${name}`}
                    className="cursor-pointer text-left font-semibold text-slate-900 underline-offset-2 transition-colors duration-150 hover:text-red-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  >
                    {name}
                  </button>
                  <p className="tnum mt-0.5 text-xs text-slate-400">
                    {donor.ID}
                    {donor.Contact ? ` · ${donor.Contact}` : ''}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="tnum inline-flex w-fit items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-200">
                    {donor['Blood Group'] || '—'}
                  </span>
                </td>
                <td className="tnum whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                  {donor.Age != null && donor.Age !== '' ? `${donor.Age} · ` : ''}
                  {donor.Gender || '—'}
                </td>
                <td className="max-w-[10rem] truncate px-4 py-3 text-slate-600">
                  {donor.Location || '—'}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-700">
                    {donor['Last Donation Type'] || '—'}
                  </p>
                  <p className="tnum mt-0.5 text-xs text-slate-400">
                    {formatShortDate(donor['Last Donated Date'])}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p
                    className={`tnum whitespace-nowrap font-semibold ${dateClass[eligibility]}`}
                  >
                    {formatShortDate(donor['Next Eligible Date'])}
                  </p>
                  <div className="mt-1">
                    <StatusBadge eligibility={eligibility} daysLeft={daysLeft} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  {certificateUrl ? (
                    <a
                      href={certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Open certificate for ${name}`}
                      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-700 ${linkFocus}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

