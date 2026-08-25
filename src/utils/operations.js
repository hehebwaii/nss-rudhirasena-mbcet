import { getEligibility, normalizeGroup } from './donor';

export const CASE_STATUS = ['Open', 'In Progress', 'Fulfilled', 'Closed'];
export const URGENCY_LEVELS = ['Critical', 'Urgent', 'Standard'];
export const CAMP_STATUS = ['Upcoming', 'Ongoing', 'Completed'];

/**
 * Blood group compatibility matrix (Who can donate to whom for red blood cells)
 */
export const COMPATIBLE_DONOR_GROUPS = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal recipient
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'], // Universal donor
};

/**
 * Smart matching algorithm to find eligible donors strictly from the database
 * Ranked by:
 * 1. Exact Blood Group Match
 * 2. Universal / Compatible Blood Group
 * 3. Proximity / Location Match with Hospital
 */
export function findMatchingDonors(requiredGroup, hospitalLocation, allDonors = []) {
  const normRequired = normalizeGroup(requiredGroup);
  const compatibleGroups = COMPATIBLE_DONOR_GROUPS[normRequired] || [normRequired];
  const targetLoc = String(hospitalLocation || '').toLowerCase().trim();

  const eligibleDonors = allDonors.filter((donor) => {
    const isEligible = getEligibility(donor) === 'eligible';
    const donorGroup = normalizeGroup(donor['Blood Group']);
    const isCompatible = compatibleGroups.includes(donorGroup);
    return isEligible && isCompatible;
  });

  return eligibleDonors.sort((a, b) => {
    const aGroup = normalizeGroup(a['Blood Group']);
    const bGroup = normalizeGroup(b['Blood Group']);

    // Priority 1: Exact group match
    const aExact = aGroup === normRequired ? 1 : 0;
    const bExact = bGroup === normRequired ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;

    // Priority 2: Location match
    const aLoc = String(a.Location || '').toLowerCase();
    const bLoc = String(b.Location || '').toLowerCase();
    const aLocMatch = targetLoc && (aLoc.includes(targetLoc) || targetLoc.includes(aLoc)) ? 1 : 0;
    const bLocMatch = targetLoc && (bLoc.includes(targetLoc) || targetLoc.includes(bLoc)) ? 1 : 0;
    if (aLocMatch !== bLocMatch) return bLocMatch - aLocMatch;

    // Priority 3: Alphabetical
    return String(a.Name || '').localeCompare(String(b.Name || ''));
  });
}

export function normalizeEmergencyCase(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return raw;

  return {
    id: raw.id || raw.ID || `CASE-${String(index + 1).padStart(3, '0')}`,
    patientName: raw.patientName || raw.Patient_Name || raw.Name || 'Patient',
    hospital: raw.hospital || raw.Hospital_Venue || raw.Location || '',
    bloodGroup: normalizeGroup(raw.bloodGroup || raw.Blood_Group || raw['Blood Group'] || 'O+'),
    unitsNeeded: Number(raw.unitsNeeded || raw.Units_Needed || 1),
    urgency: raw.urgency || raw.Urgency || 'Urgent',
    status: raw.status || raw.Status || 'Open',
    requiredDate: raw.requiredDate || raw.Required_Date || raw['Last Donated Date'] || new Date().toISOString().slice(0, 10),
    contactPerson: raw.contactPerson || raw.Contact || raw.Contact_Number || '',
    notes: raw.notes || raw.Notes || '',
    assignedDonorId: raw.assignedDonorId || raw.Assigned_Donor_ID || '',
    assignedDonorName: raw.assignedDonorName || raw.Assigned_Donor_Name || '',
    createdAt: raw.createdAt || raw.Created_At || new Date().toISOString(),
  };
}

export function normalizeCamp(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return raw;

  return {
    id: raw.id || raw.ID || raw.Camp_ID || `CAMP-${String(index + 1).padStart(3, '0')}`,
    name: raw.name || raw.Name || raw.Camp_Name || 'Blood Donation Drive',
    date: raw.date || raw.Date || raw['Last Donated Date'] || new Date().toISOString().slice(0, 10),
    venue: raw.venue || raw.Venue || raw.Hospital_Venue || raw.Location || '',
    partnerBloodBank: raw.partnerBloodBank || raw.Partner_Blood_Bank || 'Medical College Blood Bank',
    targetUnits: Number(raw.targetUnits || raw.Target_Units || raw.Units_Needed || 50),
    collectedUnits: Number(raw.collectedUnits || raw.Collected_Units || raw.Units_Collected || 0),
    status: raw.status || raw.Status || 'Upcoming',
    notes: raw.notes || raw.Notes || '',
    donorIds: Array.isArray(raw.donorIds)
      ? raw.donorIds
      : String(raw.donorIds || raw.Assigned_Donor_ID || '')
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean),
  };
}

export function normalizeVoluntaryDonation(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return raw;

  return {
    id: raw.id || raw.ID || `VOL-${String(index + 1).padStart(3, '0')}`,
    donorId: raw.donorId || raw.Donor_ID || raw.Assigned_Donor_ID || '',
    donorName: raw.donorName || raw.Donor_Name || raw.Name || '',
    bloodGroup: normalizeGroup(raw.bloodGroup || raw.Blood_Group || raw['Blood Group'] || ''),
    donationDate: raw.donationDate || raw.Donation_Date || raw['Last Donated Date'] || new Date().toISOString().slice(0, 10),
    venue: raw.venue || raw.Venue || raw.Hospital_Venue || '',
    donationType: raw.donationType || raw.Donation_Type || raw['Last Donation Type'] || 'Whole Blood',
    units: Number(raw.units || raw.Units_Collected || 1),
    certificateUrl: raw.certificateUrl || raw.Certificate_URL || raw['Certificate URL'] || '',
    notes: raw.notes || raw.Notes || '',
  };
}
