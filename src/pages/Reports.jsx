import { useMemo } from 'react';
import {
  Activity,
  Award,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Droplet,
  Heart,
  Hourglass,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { useDonors } from '../context/DonorContext';
import {
  BLOOD_GROUPS,
  formatShortDate,
  getEligibility,
  normalizeGroup,
} from '../utils/donor';

const BLOOD_GROUP_META = {
  'O-': { label: 'Universal Red Cell Donor', rare: true, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  'O+': { label: 'Most Common / High Demand', rare: false, color: 'text-red-700 bg-red-50 border-red-200' },
  'A+': { label: 'High Demand', rare: false, color: 'text-red-700 bg-red-50 border-red-200' },
  'A-': { label: 'Rare Donor Group', rare: true, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  'B+': { label: 'High Demand', rare: false, color: 'text-red-700 bg-red-50 border-red-200' },
  'B-': { label: 'Rare Donor Group', rare: true, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  'AB+': { label: 'Universal Plasma Donor', rare: false, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  'AB-': { label: 'Rarest Blood Group', rare: true, color: 'text-rose-700 bg-rose-50 border-rose-200' },
};

export default function Reports() {
  const { donors } = useDonors();

  // Core calculations
  const stats = useMemo(() => {
    const total = donors.length;
    let eligible = 0;
    let cooling = 0;
    let totalAge = 0;
    let ageCount = 0;

    const groupCounts = {};
    const groupEligible = {};
    BLOOD_GROUPS.forEach((g) => {
      groupCounts[g] = 0;
      groupEligible[g] = 0;
    });

    const deptCounts = {};
    const yearCounts = { '1st Year': 0, '2nd Year': 0, '3rd Year': 0, '4th Year': 0, Other: 0 };
    const locCounts = {};
    const typeCounts = { 'Whole Blood': 0, Platelets: 0, Plasma: 0, Other: 0 };
    const genderCounts = { Male: 0, Female: 0, Other: 0 };

    donors.forEach((d) => {
      const isEligible = getEligibility(d) === 'eligible';
      if (isEligible) eligible++;
      else cooling++;

      if (d.Age && Number(d.Age) > 0) {
        totalAge += Number(d.Age);
        ageCount++;
      }

      // Blood Group
      const bg = normalizeGroup(d['Blood Group']);
      if (groupCounts[bg] !== undefined) {
        groupCounts[bg]++;
        if (isEligible) groupEligible[bg]++;
      }

      // Department
      const dept = String(d.Department || 'Unspecified').trim();
      if (dept) {
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      }

      // Year
      const yr = String(d.Year || '').trim();
      if (yr && yearCounts[yr] !== undefined) {
        yearCounts[yr]++;
      } else if (yr) {
        yearCounts.Other++;
      }

      // Location
      const loc = String(d.Location || 'Unspecified').trim();
      if (loc) {
        locCounts[loc] = (locCounts[loc] || 0) + 1;
      }

      // Donation Type
      const dt = d['Last Donation Type'];
      if (dt && typeCounts[dt] !== undefined) {
        typeCounts[dt]++;
      } else if (dt) {
        typeCounts.Other++;
      }

      // Gender
      const g = d.Gender;
      if (g && genderCounts[g] !== undefined) {
        genderCounts[g]++;
      } else if (g) {
        genderCounts.Other++;
      }
    });

    const avgAge = ageCount > 0 ? (totalAge / ageCount).toFixed(1) : '—';
    const sortedDepts = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);
    const sortedLocs = Object.entries(locCounts).sort((a, b) => b[1] - a[1]);

    return {
      total,
      eligible,
      cooling,
      avgAge,
      groupCounts,
      groupEligible,
      sortedDepts,
      yearCounts,
      sortedLocs,
      typeCounts,
      genderCounts,
    };
  }, [donors]);

  // Immediately eligible donors for emergency triage matrix
  const readyDonors = useMemo(() => {
    return donors.filter((d) => getEligibility(d) === 'eligible');
  }, [donors]);

  const handlePrint = () => {
    window.print();
  };

  const exportReportCSV = () => {
    if (donors.length === 0) return;
    const summaryRows = [
      ['NSS Rudhirasena - Blood Donor Analytics & Summary Report'],
      ['Generated On', new Date().toLocaleString('en-IN')],
      ['Total Registered Donors', stats.total],
      ['Eligible Donors Today', stats.eligible],
      ['Cooling Period Donors', stats.cooling],
      ['Average Donor Age', stats.avgAge],
      [],
      ['Blood Group Distribution'],
      ['Blood Group', 'Total Donors', 'Percentage', 'Eligible Now'],
      ...BLOOD_GROUPS.map((bg) => [
        bg,
        stats.groupCounts[bg] || 0,
        stats.total > 0
          ? `${(((stats.groupCounts[bg] || 0) / stats.total) * 100).toFixed(1)}%`
          : '0%',
        stats.groupEligible[bg] || 0,
      ]),
      [],
      ['Department Breakdown'],
      ['Department', 'Donors Count'],
      ...stats.sortedDepts.map(([dept, count]) => [dept, count]),
      [],
      ['Geographic Breakdown'],
      ['Location', 'Donors Count'],
      ...stats.sortedLocs.map(([loc, count]) => [loc, count]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      summaryRows.map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `NSS_Rudhirasena_Analytics_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 print:space-y-4">
      {/* Header */}
      <div className="flex animate-rise flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-100 text-red-700">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-bold tracking-wider text-red-700 uppercase">
              NSS Rudhirasena Intelligence
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tighter text-slate-900 sm:text-3xl">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time donor inventory, readiness status, and emergency response metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-[color,background-color,border-color,transform] duration-150 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-red-600 active:scale-[0.98]"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            Print Report
          </button>
          <button
            type="button"
            onClick={exportReportCSV}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-[background-color,transform] duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-slate-900 active:scale-[0.98]"
          >
            <Download className="h-4 w-4 text-slate-300" />
            Export Summary CSV
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <div className="flex items-center gap-2 text-slate-500">
            <Users className="h-4 w-4 text-red-600" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Total Registry
            </span>
          </div>
          <p className="tnum mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {stats.total}
          </p>
          <p className="mt-1 text-xs text-slate-400">Total registered volunteers</p>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-card">
          <div className="flex items-center gap-2 text-emerald-800">
            <UserCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Eligible Today
            </span>
          </div>
          <p className="tnum mt-2 text-3xl font-bold tracking-tight text-emerald-700">
            {stats.eligible}
          </p>
          <p className="mt-1 text-xs text-emerald-600">
            {stats.total > 0
              ? `${Math.round((stats.eligible / stats.total) * 100)}% of total pool`
              : '0%'}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-card">
          <div className="flex items-center gap-2 text-amber-800">
            <Hourglass className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Cooling Period
            </span>
          </div>
          <p className="tnum mt-2 text-3xl font-bold tracking-tight text-amber-700">
            {stats.cooling}
          </p>
          <p className="mt-1 text-xs text-amber-600">Within mandatory resting interval</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <div className="flex items-center gap-2 text-slate-500">
            <Activity className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Average Age
            </span>
          </div>
          <p className="tnum mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {stats.avgAge} <span className="text-sm font-normal text-slate-400">years</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">Campus volunteer demographic</p>
        </div>
      </div>

      {/* Blood Group Inventory Grid */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Blood Group Inventory & Rarity Matrix
            </h2>
            <p className="text-xs text-slate-500">
              Distribution and immediate availability per blood group
            </p>
          </div>
          <span className="tnum rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            8 Blood Types Tracked
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {BLOOD_GROUPS.map((group) => {
            const count = stats.groupCounts[group] || 0;
            const eligibleCount = stats.groupEligible[group] || 0;
            const pct = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0.0';
            const meta = BLOOD_GROUP_META[group] || { label: 'Standard Group', rare: false, color: 'text-slate-700 bg-slate-50 border-slate-200' };

            return (
              <div
                key={group}
                className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 transition-colors hover:bg-slate-50"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="tnum inline-flex items-center rounded-lg bg-red-700 px-2.5 py-1 text-base font-bold text-white shadow-xs">
                      {group}
                    </span>
                    <span
                      className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${meta.color}`}
                    >
                      {meta.rare ? 'Rare' : 'Standard'}
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-medium text-slate-600">
                    {meta.label}
                  </p>
                </div>

                <div className="mt-4 border-t border-slate-200/60 pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="tnum text-xl font-bold text-slate-900">
                      {count} <span className="text-xs font-normal text-slate-500">donors</span>
                    </span>
                    <span className="tnum text-xs font-semibold text-slate-500">{pct}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-red-600"
                      style={{ width: `${Math.min(100, Math.max(4, Number(pct)))}%` }}
                    />
                  </div>

                  <p className="tnum mt-2 text-[11px] font-medium text-emerald-700">
                    ✓ {eligibleCount} eligible now
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Section: Department Breakdown & Donation Types */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Department Representation */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-red-600" />
                <h3 className="font-bold text-slate-900">Department Participation</h3>
              </div>
              <span className="text-xs text-slate-400">
                {stats.sortedDepts.length} departments
              </span>
            </div>

            {stats.sortedDepts.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                No department data available
              </p>
            ) : (
              <div className="space-y-3">
                {stats.sortedDepts.slice(0, 6).map(([dept, count]) => {
                  const pct =
                    stats.total > 0
                      ? Math.round((count / stats.total) * 100)
                      : 0;
                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700">{dept}</span>
                        <span className="tnum font-semibold text-slate-900">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-800"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
            Helps campus coordinators plan NSS awareness drives in under-represented streams.
          </p>
        </div>

        {/* Donation Types & Gender Balance */}
        <div className="space-y-6">
          {/* Year of Study Distribution */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-red-600" />
                <h3 className="font-bold text-slate-900">Year of Study Distribution</h3>
              </div>
              <span className="text-xs text-slate-400">Undergraduate batches</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((yr) => {
                const count = stats.yearCounts[yr] || 0;
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={yr} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-center">
                    <p className="text-xs font-semibold text-slate-500">{yr}</p>
                    <p className="tnum mt-1 text-2xl font-bold text-slate-900">{count}</p>
                    <p className="text-[10px] text-slate-400">{pct}% of pool</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Donation Types */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Droplet className="h-4 w-4 text-red-600" />
                <h3 className="font-bold text-slate-900">Donation Modalities</h3>
              </div>
              <span className="text-xs text-slate-400">Historical donation types</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                <p className="text-xs font-semibold text-slate-500">Whole Blood</p>
                <p className="tnum mt-1 text-2xl font-bold text-slate-900">
                  {stats.typeCounts['Whole Blood'] || 0}
                </p>
                <p className="text-[10px] text-slate-400">90–120d interval</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                <p className="text-xs font-semibold text-slate-500">Platelets</p>
                <p className="tnum mt-1 text-2xl font-bold text-slate-900">
                  {stats.typeCounts.Platelets || 0}
                </p>
                <p className="text-[10px] text-slate-400">14d interval</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                <p className="text-xs font-semibold text-slate-500">Plasma</p>
                <p className="tnum mt-1 text-2xl font-bold text-slate-900">
                  {stats.typeCounts.Plasma || 0}
                </p>
                <p className="text-[10px] text-slate-400">28d interval</p>
              </div>
            </div>
          </div>

          {/* Location Distribution */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-600" />
                <h3 className="font-bold text-slate-900">Top Volunteer Locations</h3>
              </div>
              <span className="text-xs text-slate-400">District clusters</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {stats.sortedLocs.length === 0 ? (
                <p className="text-xs text-slate-400">No location data</p>
              ) : (
                stats.sortedLocs.map(([loc, count]) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    <span>{loc}</span>
                    <span className="tnum font-bold text-slate-900">{count}</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Immediate Response Matrix */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Emergency Immediate Response Roster
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              List of all donors with valid cooling clearance ready for urgent blood donation calls today.
            </p>
          </div>
          <span className="tnum inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            {readyDonors.length} Ready Donors
          </span>
        </div>

        {readyDonors.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No donors currently eligible for immediate dispatch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold">Donor Name</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Blood Group</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Department</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Location</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Contact</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {readyDonors.map((d, i) => {
                  const contact = String(d.Contact || '').replace(/[\s-]/g, '');
                  const name = d.Name || d.ID || 'Volunteer';
                  return (
                    <tr key={d.ID || i} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {name}
                        <span className="block text-[10px] font-normal text-slate-400">
                          {d.ID}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="tnum font-bold text-red-700">
                          {d['Blood Group'] || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {d.Department || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {d.Location || '—'}
                      </td>
                      <td className="tnum px-3 py-2.5 font-medium text-slate-800">
                        {d.Contact || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {contact ? (
                          <div className="inline-flex items-center gap-1.5">
                            <a
                              href={`tel:${contact}`}
                              title={`Call ${name}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                            <a
                              href={`https://wa.me/${contact}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`WhatsApp ${name}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          </div>
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
        )}
      </div>
    </div>
  );
}
