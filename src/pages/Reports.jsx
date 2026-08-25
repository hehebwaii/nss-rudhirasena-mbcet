import { useState, useMemo } from 'react';
import {
  Activity,
  Award,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Droplet,
  FileSpreadsheet,
  FileText,
  Heart,
  Hourglass,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { useDonors } from '../context/DonorContext';
import { useOperations } from '../context/OperationsContext';
import {
  BLOOD_GROUPS,
  formatShortDate,
  getEligibility,
  normalizeGroup,
} from '../utils/donor';
import {
  ACADEMIC_YEARS,
  getAcademicYearRange,
  filterByDateRange,
  exportAccreditationExcel,
} from '../utils/accreditationReport';

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
  const { camps = [], emergencies = [] } = useOperations();

  const [activeView, setActiveView] = useState('dossier'); // 'dossier' | 'analytics'
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2025-26');

  // Academic year date range
  const dateRange = useMemo(() => {
    return getAcademicYearRange(selectedAcademicYear);
  }, [selectedAcademicYear]);

  const academicYearObj = useMemo(() => {
    return ACADEMIC_YEARS.find((y) => y.id === selectedAcademicYear) || ACADEMIC_YEARS[0];
  }, [selectedAcademicYear]);

  // Scoped Data by Academic Year
  const scopedCamps = useMemo(() => {
    return filterByDateRange(camps, (c) => c.date || c.Date, dateRange);
  }, [camps, dateRange]);

  const scopedEmergencies = useMemo(() => {
    return filterByDateRange(emergencies, (e) => e.requestDate || e.Request_Date || e.createdAt, dateRange);
  }, [emergencies, dateRange]);

  // Comprehensive Aggregations & Metrics
  const stats = useMemo(() => {
    const totalDonors = donors.length;
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
    const deptEligible = {};
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
        if (isEligible) deptEligible[dept] = (deptEligible[dept] || 0) + 1;
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

    // Camp statistics
    const totalCamps = scopedCamps.length;
    const totalCampUnits = scopedCamps.reduce((acc, c) => {
      const units = Number(c.collectedUnits || c.Units_Collected || (c.donorIds ? c.donorIds.length : 0));
      return acc + units;
    }, 0);

    // Emergency statistics
    const emergencyFulfilled = scopedEmergencies.filter((e) => (e.status || e.Status) === 'Fulfilled').length;
    const emergencyUnits = scopedEmergencies.reduce((acc, e) => {
      return acc + Number(e.unitsFulfilled || e.Units_Fulfilled || (e.status === 'Fulfilled' ? 1 : 0));
    }, 0);

    const maleDonors = genderCounts.Male || 0;
    const femaleDonors = genderCounts.Female || 0;
    const malePercent = totalDonors > 0 ? ((maleDonors / totalDonors) * 100).toFixed(1) : '0';
    const femalePercent = totalDonors > 0 ? ((femaleDonors / totalDonors) * 100).toFixed(1) : '0';

    return {
      totalDonors,
      eligible,
      cooling,
      avgAge,
      groupCounts,
      groupEligible,
      sortedDepts,
      deptCounts,
      deptEligible,
      yearCounts,
      sortedLocs,
      typeCounts,
      genderCounts,
      maleDonors,
      femaleDonors,
      malePercent,
      femalePercent,
      totalCamps,
      totalCampUnits,
      emergencyFulfilled,
      emergencyUnits,
    };
  }, [donors, scopedCamps, scopedEmergencies]);

  const handlePrintDossier = () => {
    setActiveView('dossier');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleExportExcel = () => {
    exportAccreditationExcel({
      academicYearLabel: academicYearObj.label,
      stats,
      camps: scopedCamps,
      emergencies: scopedEmergencies,
      donors,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Reporting Year Filter (Hidden in Print) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-100 text-red-700">
              <Award className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">
              NSS MBCET Units 230 & 706
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Reports & NAAC / KTU Accreditation
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Official institutional dossier, NAAC Criterion 3 data exports, and live analytics.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Academic Year Picker */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
            <Calendar className="h-4 w-4 text-red-700" />
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              {ACADEMIC_YEARS.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 active:scale-95 transition-all"
            title="Export NAAC Criterion 3.6.2 Multi-Sheet Excel"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            <span>Export NAAC Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handlePrintDossier}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-800 active:scale-95 transition-all"
            title="Print or Save Official Institutional PDF Dossier"
          >
            <Printer className="h-4 w-4" />
            <span>Print / Save PDF Dossier</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs (Hidden in Print) */}
      <div className="flex items-center gap-2 border-b border-slate-200 print:hidden">
        <button
          type="button"
          onClick={() => setActiveView('dossier')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
            activeView === 'dossier'
              ? 'border-red-700 text-red-700 bg-red-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Official NAAC & KTU Dossier View</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('analytics')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
            activeView === 'analytics'
              ? 'border-red-700 text-red-700 bg-red-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Interactive Analytics Dashboard</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 1. OFFICIAL NAAC & KTU ACCREDITATION DOSSIER (A4 Print Ready) */}
      {/* ============================================================ */}
      {activeView === 'dossier' && (
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-card print:border-none print:p-0 print:m-0 print:space-y-4 print:shadow-none">
          {/* Institutional Letterhead Header */}
          <div className="border-b-2 border-red-800 pb-5 text-center print-avoid-break">
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs font-black tracking-widest text-red-700 uppercase print:text-[10pt]">
                Mar Baselios College of Engineering and Technology (Autonomous)
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase print:text-[14pt]">
                National Service Scheme (NSS) Units 230 & 706
              </h2>
              <p className="text-sm font-bold text-slate-700 print:text-[10pt]">
                Rudhirasena Blood Donor Registry & Emergency Operations Cell
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-1 text-xs font-bold text-red-800 border border-red-200 print:border-slate-300 print:bg-slate-50 print:text-slate-900 print:text-[9pt]">
                <span>Annual Extension Activity & NAAC Criterion 3.6.2 Compliance Dossier</span>
                <span>·</span>
                <span>{academicYearObj.label}</span>
              </div>
            </div>
          </div>

          {/* Executive Summary Metrics Grid */}
          <div className="print-avoid-break">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5 print:text-[9pt]">
              Executive Activity & Impact Summary
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print-card-grid">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-center print:border-slate-300 print:p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 print:text-[7.5pt]">
                  Registered Voluntary Donors
                </p>
                <p className="tnum mt-1 text-2xl font-black text-slate-900 print:text-[14pt]">
                  {stats.totalDonors}
                </p>
                <p className="text-[10px] font-semibold text-emerald-600 print:text-[8pt]">
                  {stats.eligible} Eligible Now
                </p>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50/70 p-3.5 text-center print:border-slate-300 print:p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 print:text-[7.5pt] print:text-slate-700">
                  Blood Units Collected (Camps)
                </p>
                <p className="tnum mt-1 text-2xl font-black text-red-700 print:text-[14pt] print:text-slate-900">
                  {stats.totalCampUnits}
                </p>
                <p className="text-[10px] font-semibold text-red-900 print:text-[8pt] print:text-slate-600">
                  Across {stats.totalCamps} Campus Drives
                </p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 text-center print:border-slate-300 print:p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 print:text-[7.5pt] print:text-slate-700">
                  Emergency SOS Fulfilled
                </p>
                <p className="tnum mt-1 text-2xl font-black text-blue-700 print:text-[14pt] print:text-slate-900">
                  {stats.emergencyFulfilled}
                </p>
                <p className="text-[10px] font-semibold text-blue-900 print:text-[8pt] print:text-slate-600">
                  {stats.emergencyUnits} Critical Units Supplied
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-center print:border-slate-300 print:p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 print:text-[7.5pt] print:text-slate-700">
                  Estimated Lives Impacted
                </p>
                <p className="tnum mt-1 text-2xl font-black text-amber-700 print:text-[14pt] print:text-slate-900">
                  {(stats.totalCampUnits + stats.emergencyUnits) * 3}
                </p>
                <p className="text-[10px] font-semibold text-amber-900 print:text-[8pt] print:text-slate-600">
                  Standard 3:1 Impact Ratio
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Campus Blood Donation Camps Portfolio */}
          <div className="space-y-2.5 print-avoid-break">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 print:text-[9.5pt]">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-red-700 text-white text-[10px] font-black print:bg-slate-800">1</span>
                Campus Voluntary Blood Donation Drives Portfolio
              </h3>
              <span className="text-xs font-semibold text-slate-500 print:text-[8.5pt]">
                {scopedCamps.length} Drives Recorded
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 text-xs print:rounded-none print:border-slate-300">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-left font-bold text-slate-700 print:bg-slate-100">
                  <tr>
                    <th className="px-3.5 py-2.5 print:px-2 print:py-1.5">Drive / Camp Name</th>
                    <th className="px-3.5 py-2.5 print:px-2 print:py-1.5">Date</th>
                    <th className="px-3.5 py-2.5 print:px-2 print:py-1.5">Partner Blood Bank / Hospital</th>
                    <th className="px-3.5 py-2.5 text-center print:px-2 print:py-1.5">Target</th>
                    <th className="px-3.5 py-2.5 text-center print:px-2 print:py-1.5">Collected</th>
                    <th className="px-3.5 py-2.5 text-right print:px-2 print:py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  {scopedCamps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400 font-medium print:py-3">
                        No camp drives recorded for the selected academic period.
                      </td>
                    </tr>
                  ) : (
                    scopedCamps.map((c, i) => {
                      const target = Number(c.targetUnits || c.Target_Units || 50);
                      const collected = Number(c.collectedUnits || c.Units_Collected || (c.donorIds ? c.donorIds.length : 0));
                      return (
                        <tr key={c.id || i} className="hover:bg-slate-50/60">
                          <td className="px-3.5 py-2.5 font-bold text-slate-900 print:px-2 print:py-1.5">
                            {c.name || c.Camp_Name || `Camp Drive #${i + 1}`}
                          </td>
                          <td className="px-3.5 py-2.5 font-medium text-slate-600 print:px-2 print:py-1.5">
                            {formatShortDate(c.date || c.Date)}
                          </td>
                          <td className="px-3.5 py-2.5 font-medium text-slate-700 print:px-2 print:py-1.5">
                            {c.partnerBloodBank || c.Partner_Blood_Bank || 'Govt Blood Bank'}
                          </td>
                          <td className="px-3.5 py-2.5 text-center font-semibold text-slate-600 print:px-2 print:py-1.5">
                            {target}
                          </td>
                          <td className="px-3.5 py-2.5 text-center font-bold text-red-700 print:text-slate-900 print:px-2 print:py-1.5">
                            {collected} Units
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-semibold text-emerald-700 print:text-slate-900 print:px-2 print:py-1.5">
                            {c.status || c.Status || 'Completed'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Emergency SOS Blood Request Fulfillment Log */}
          <div className="space-y-2.5 print-avoid-break">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 print:text-[9.5pt]">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-700 text-white text-[10px] font-black print:bg-slate-800">2</span>
                24x7 Emergency Hospital Blood Dispatch Operations
              </h3>
              <span className="text-xs font-semibold text-slate-500 print:text-[8.5pt]">
                {scopedEmergencies.length} Emergency Cases
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 text-xs print:rounded-none print:border-slate-300">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-left font-bold text-slate-700 print:bg-slate-100">
                  <tr>
                    <th className="px-3.5 py-2.5 print:px-2 print:py-1.5">Case ID</th>
                    <th className="px-3.5 py-2.5 print:px-2 print:py-1.5">Hospital / Facility</th>
                    <th className="px-3.5 py-2.5 text-center print:px-2 print:py-1.5">Group</th>
                    <th className="px-3.5 py-2.5 text-center print:px-2 print:py-1.5">Units</th>
                    <th className="px-3.5 py-2.5 print:px-2 print:py-1.5">Request Date</th>
                    <th className="px-3.5 py-2.5 text-right print:px-2 print:py-1.5">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  {scopedEmergencies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400 font-medium print:py-3">
                        No emergency cases logged for the selected period.
                      </td>
                    </tr>
                  ) : (
                    scopedEmergencies.map((em, i) => (
                      <tr key={em.id || i} className="hover:bg-slate-50/60">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-slate-700 print:px-2 print:py-1.5">
                          {em.id || em.Case_ID || `EM-${i + 1}`}
                        </td>
                        <td className="px-3.5 py-2.5 font-medium text-slate-900 print:px-2 print:py-1.5">
                          {em.hospital || em.Hospital || 'Regional Medical Hospital'}
                        </td>
                        <td className="px-3.5 py-2.5 text-center print:px-2 print:py-1.5">
                          <span className="inline-block rounded bg-red-100 px-1.5 py-0.5 font-bold text-red-800 print:border print:border-slate-300 print:bg-slate-50 print:text-slate-900">
                            {em.bloodGroup || em.Blood_Group || '—'}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-bold text-slate-800 print:px-2 print:py-1.5">
                          {em.unitsFulfilled || em.Units_Fulfilled || 1}
                        </td>
                        <td className="px-3.5 py-2.5 font-medium text-slate-600 print:px-2 print:py-1.5">
                          {formatShortDate(em.requestDate || em.Request_Date || em.createdAt)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-emerald-700 print:text-slate-900 print:px-2 print:py-1.5">
                          Fulfilled
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Department-wise Volunteer Participation */}
          <div className="space-y-2.5 print-avoid-break">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 print:text-[9.5pt]">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-700 text-white text-[10px] font-black print:bg-slate-800">3</span>
              Department-wise Volunteer Donors Participation Matrix
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs print-dept-grid">
              {stats.sortedDepts.slice(0, 8).map(([dept, count]) => {
                const pct = stats.totalDonors > 0 ? ((count / stats.totalDonors) * 100).toFixed(1) : 0;
                return (
                  <div key={dept} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 print:border-slate-300 print:p-2">
                    <p className="truncate font-bold text-slate-900 print:text-[8.5pt]">{dept}</p>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-lg font-black text-red-700 print:text-[12pt] print:text-slate-900">{count}</span>
                      <span className="text-[11px] font-semibold text-slate-500 print:text-[8pt]">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Official Signatory & Attestation Block */}
          <div className="mt-10 border-t-2 border-slate-300 pt-6 print:mt-8 print:pt-4 print-avoid-break">
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase text-center mb-8 print:mb-6 print:text-[8pt] print:text-slate-600">
              Official Institutional Sign-off & Accreditation Attestation
            </p>
            <div className="grid grid-cols-3 gap-6 text-center text-xs print-sign-grid">
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-900 print:text-[9pt]">NSS Programme Officer</p>
                <p className="text-[11px] font-semibold text-slate-500 print:text-[8pt]">Unit 230 · MBCET</p>
              </div>
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-900 print:text-[9pt]">NSS Programme Officer</p>
                <p className="text-[11px] font-semibold text-slate-500 print:text-[8pt]">Unit 706 · MBCET</p>
              </div>
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-900 print:text-[9pt]">Principal</p>
                <p className="text-[11px] font-semibold text-slate-500 print:text-[8pt]">MBCET (Autonomous)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. INTERACTIVE ANALYTICS & OPERATIONS DASHBOARD */}
      {/* ============================================================ */}
      {activeView === 'analytics' && (
        <div className="space-y-6">
          {/* Blood Group Matrix */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h3 className="text-sm font-bold text-slate-900">
              Blood Group Inventory & Immediate Donor Readiness
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of total registered donors vs currently eligible donors (outside 90-day cooldown).
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {BLOOD_GROUPS.map((bg) => {
                const total = stats.groupCounts[bg] || 0;
                const eligible = stats.groupEligible[bg] || 0;
                const meta = BLOOD_GROUP_META[bg] || {};

                return (
                  <div
                    key={bg}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-all hover:bg-white hover:shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-700 text-sm font-black text-white shadow-xs">
                        {bg}
                      </span>
                      {meta.rare && (
                        <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                          Rare
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="tnum text-xl font-black text-slate-900">{total} Donors</p>
                      <p className="text-xs font-semibold text-emerald-600">
                        {eligible} Eligible Now
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Demographic & Geographic Split */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Gender Demographics */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <h3 className="text-sm font-bold text-slate-900">Donor Gender Demographics</h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribution across registered volunteers.</p>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-bold text-slate-700 mb-1">
                    <span>Male Volunteers</span>
                    <span>{stats.maleDonors} ({stats.malePercent}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${stats.malePercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold text-slate-700 mb-1">
                    <span>Female Volunteers</span>
                    <span>{stats.femaleDonors} ({stats.femalePercent}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-rose-600 rounded-full"
                      style={{ width: `${stats.femalePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Average Age & Readiness */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <h3 className="text-sm font-bold text-slate-900">Donor Health & Registry Metrics</h3>
              <p className="text-xs text-slate-500 mt-0.5">Key directory performance benchmarks.</p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Average Donor Age</p>
                  <p className="tnum mt-1 text-2xl font-black text-slate-800">{stats.avgAge} yrs</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Directory Readiness</p>
                  <p className="tnum mt-1 text-2xl font-black text-emerald-600">
                    {stats.totalDonors > 0 ? Math.round((stats.eligible / stats.totalDonors) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
