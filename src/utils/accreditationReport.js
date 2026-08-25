import * as XLSX from 'xlsx';
import { formatShortDate } from './donor';

export const ACADEMIC_YEARS = [
  { id: 'all', label: 'All-Time Comprehensive' },
  { id: '2025-26', label: '2025 – 2026 Academic Year', start: '2025-06-01', end: '2026-05-31' },
  { id: '2024-25', label: '2024 – 2025 Academic Year', start: '2024-06-01', end: '2025-05-31' },
  { id: '2023-24', label: '2023 – 2024 Academic Year', start: '2023-06-01', end: '2024-05-31' },
];

export function getAcademicYearRange(yearId) {
  const match = ACADEMIC_YEARS.find((y) => y.id === yearId);
  if (!match || match.id === 'all') return null;
  return { start: new Date(match.start), end: new Date(match.end) };
}

export function filterByDateRange(items, dateGetter, range) {
  if (!range || !range.start || !range.end) return items;
  return items.filter((item) => {
    const raw = dateGetter(item);
    if (!raw) return false;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return false;
    return d >= range.start && d <= range.end;
  });
}

/**
 * Multi-Sheet Excel Generator for NAAC Criterion 3 & KTU NSS Audits
 */
export function exportAccreditationExcel({ academicYearLabel, stats, camps, emergencies, donors }) {
  const wb = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const summaryData = [
    ['MAR BASELIOS COLLEGE OF ENGINEERING AND TECHNOLOGY (AUTONOMOUS)'],
    ['NATIONAL SERVICE SCHEME (NSS) UNITS 230 & 706'],
    ['RUDHIRASENA BLOOD DONOR DIRECTORY & OPERATIONS CELL'],
    ['ANNUAL NSS ACTIVITY & NAAC / KTU ACCREDITATION REPORT'],
    ['Reporting Period:', academicYearLabel],
    ['Generated On:', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })],
    [],
    ['KEY ACCREDITATION METRICS (NAAC CRITERION 3.6.2 & EXTENSION ACTIVITIES)'],
    ['Metric Description', 'Value', 'Notes / Context'],
    ['Total Registered Voluntary Donors', stats.totalDonors, 'Active student & faculty donors in directory'],
    ['Total Blood Units Collected (Camps)', stats.totalCampUnits, 'Units collected through on-campus blood drives'],
    ['Campus Blood Donation Drives Conducted', stats.totalCamps, 'Organized in collaboration with approved Blood Banks'],
    ['Emergency SOS Requests Fulfilled', stats.emergencyFulfilled, 'Direct hospital patient emergency dispatches'],
    ['Total Emergency Blood Units Supplied', stats.emergencyUnits, 'Critical units coordinated for hospital surgeries'],
    ['Estimated Lives Impacted (3 lives/unit)', stats.totalCampUnits * 3 + stats.emergencyUnits * 3, 'Standard NAAC social impact multiplier'],
    ['Active Female Donors', stats.femaleDonors, `${stats.femalePercent}% of registry`],
    ['Active Male Donors', stats.maleDonors, `${stats.malePercent}% of registry`],
    [],
    ['INSTITUTIONAL SIGN-OFF & ACCREDITATION ATTESTATION'],
    ['NSS Programme Officer (Unit 230)', 'NSS Programme Officer (Unit 706)', 'Principal (MBCET)'],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 38 }, { wch: 22 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive_Summary');

  // 2. NAAC Criterion 3.6.2 Portal Format
  const naacFormatData = [
    [
      'Sl No',
      'Name of the Activity',
      'Organising Unit / Agency / Collaborating Agency',
      'Name of the Scheme',
      'Year of the Activity',
      'Number of Students Participated in Such Activities',
      'Units of Blood Collected / Impact',
    ],
  ];

  camps.forEach((c, idx) => {
    const units = Number(c.collectedUnits || c.Units_Collected || (c.donorIds ? c.donorIds.length : 0));
    const participants = c.donorIds ? c.donorIds.length : (units || 40);
    naacFormatData.push([
      idx + 1,
      `Campus Voluntary Blood Donation Camp – ${c.name || c.Camp_Name || 'Drive'}`,
      `${c.partnerBloodBank || c.Partner_Blood_Bank || 'Govt Blood Bank / Hospital'} in association with NSS MBCET Units 230 & 706`,
      'National Service Scheme (NSS) - Rudhirasena',
      academicYearLabel,
      participants,
      `${units} Units Collected`,
    ]);
  });

  if (emergencies.length > 0) {
    naacFormatData.push([
      camps.length + 1,
      'Rudhirasena 24x7 Emergency Hospital Blood Dispatch Operations',
      'Kerala State Blood Transfusion Council / Regional Hospitals & NSS MBCET',
      'National Service Scheme (NSS) - Emergency Care',
      academicYearLabel,
      emergencies.length,
      `${stats.emergencyUnits} Emergency Units Fulfilled across ${stats.emergencyFulfilled} Hospitals`,
    ]);
  }

  const wsNaac = XLSX.utils.aoa_to_sheet(naacFormatData);
  wsNaac['!cols'] = [{ wch: 8 }, { wch: 45 }, { wch: 55 }, { wch: 35 }, { wch: 20 }, { wch: 22 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsNaac, 'NAAC_Criteria_3.6.2_Format');

  // 3. Camp Drives Portfolio Sheet
  const campHeaders = [
    ['Sl No', 'Camp Drive Name', 'Date', 'Venue / Location', 'Partner Blood Bank / Hospital', 'Target Units', 'Units Collected', 'Achievement %', 'Status'],
  ];
  const campRows = camps.map((c, i) => {
    const target = Number(c.targetUnits || c.Target_Units || 50);
    const collected = Number(c.collectedUnits || c.Units_Collected || (c.donorIds ? c.donorIds.length : 0));
    const pct = target > 0 ? `${Math.round((collected / target) * 100)}%` : '—';
    return [
      i + 1,
      c.name || c.Camp_Name || 'Camp Drive',
      formatShortDate(c.date || c.Date),
      c.venue || c.Venue || 'MBCET Campus',
      c.partnerBloodBank || c.Partner_Blood_Bank || 'General Hospital Blood Bank',
      target,
      collected,
      pct,
      c.status || c.Status || 'Completed',
    ];
  });
  const wsCamps = XLSX.utils.aoa_to_sheet([...campHeaders, ...campRows]);
  wsCamps['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 15 }, { wch: 30 }, { wch: 35 }, { wch: 14 }, { wch: 16 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsCamps, 'Camp_Drives_Portfolio');

  // 4. Emergency Dispatches Sheet
  const emHeaders = [
    ['Sl No', 'Case ID', 'Patient Name / Case', 'Hospital / Medical Center', 'Blood Group', 'Units Needed', 'Units Fulfilled', 'Status', 'Date Logged', 'Coordinator'],
  ];
  const emRows = emergencies.map((em, i) => [
    i + 1,
    em.id || em.Case_ID || `EM-${i + 1}`,
    em.patientName || em.Patient_Name || 'Confidential Patient',
    em.hospital || em.Hospital || 'City Hospital',
    em.bloodGroup || em.Blood_Group || '—',
    em.unitsRequired || em.Units_Required || 1,
    em.unitsFulfilled || em.Units_Fulfilled || (em.status === 'Fulfilled' ? 1 : 0),
    em.status || em.Status || 'Fulfilled',
    formatShortDate(em.requestDate || em.Request_Date || em.createdAt),
    em.coordinatorName || em.Coordinator || 'NSS Volunteer Coordinator',
  ]);
  const wsEm = XLSX.utils.aoa_to_sheet([...emHeaders, ...emRows]);
  wsEm['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 25 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 15 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsEm, 'Emergency_Dispatches');

  // 5. Departmental Participation Sheet
  const deptHeaders = [['Sl No', 'Department', 'Registered Voluntary Donors', '% of Total Donor Pool', 'Currently Eligible Donors']];
  const deptRows = Object.entries(stats.deptCounts || {})
    .sort((a, b) => b[1] - a[1])
    .map(([dept, count], idx) => {
      const pct = stats.totalDonors > 0 ? `${((count / stats.totalDonors) * 100).toFixed(1)}%` : '0%';
      const eligible = stats.deptEligible?.[dept] || 0;
      return [idx + 1, dept || 'General', count, pct, eligible];
    });
  const wsDept = XLSX.utils.aoa_to_sheet([...deptHeaders, ...deptRows]);
  wsDept['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 28 }, { wch: 22 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsDept, 'Departmental_Breakdown');

  // Export File
  const cleanYear = academicYearLabel.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `NSS_MBCET_Accreditation_Report_${cleanYear}.xlsx`);
}
