import { getEligibility, normalizeGroup, formatDonorName } from './donor';

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

  const rawPatient = raw.patientName || raw.Patient_Name || raw.Name || 'Patient';
  const rawAssigned = raw.assignedDonorName || raw.Assigned_Donor_Name || '';

  return {
    id: raw.id || raw.ID || `CASE-${String(index + 1).padStart(3, '0')}`,
    patientName: formatDonorName(rawPatient),
    hospital: raw.hospital || raw.Hospital_Venue || raw.Location || '',
    bloodGroup: normalizeGroup(raw.bloodGroup || raw.Blood_Group || raw['Blood Group'] || 'O+'),
    unitsNeeded: Number(raw.unitsNeeded || raw.Units_Needed || 1),
    urgency: raw.urgency || raw.Urgency || 'Urgent',
    status: raw.status || raw.Status || 'Open',
    requiredDate: raw.requiredDate || raw.Required_Date || raw['Last Donated Date'] || new Date().toISOString().slice(0, 10),
    contactPerson: raw.contactPerson || raw.Contact || raw.Contact_Number || '',
    notes: raw.notes || raw.Notes || '',
    assignedDonorId: raw.assignedDonorId || raw.Assigned_Donor_ID || '',
    assignedDonorName: rawAssigned ? formatDonorName(rawAssigned) : '',
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

  const rawDonor = raw.donorName || raw.Donor_Name || raw.Name || '';

  return {
    id: raw.id || raw.ID || `VOL-${String(index + 1).padStart(3, '0')}`,
    donorId: raw.donorId || raw.Donor_ID || raw.Assigned_Donor_ID || '',
    donorName: rawDonor ? formatDonorName(rawDonor) : '',
    bloodGroup: normalizeGroup(raw.bloodGroup || raw.Blood_Group || raw['Blood Group'] || ''),
    donationDate: raw.donationDate || raw.Donation_Date || raw['Last Donated Date'] || new Date().toISOString().slice(0, 10),
    venue: raw.venue || raw.Venue || raw.Hospital_Venue || '',
    donationType: raw.donationType || raw.Donation_Type || raw['Last Donation Type'] || 'Whole Blood',
    units: Number(raw.units || raw.Units_Collected || 1),
    certificateUrl: raw.certificateUrl || raw.Certificate_URL || raw['Certificate URL'] || '',
    notes: raw.notes || raw.Notes || '',
  };
}

/**
 * Parses standard KTU NSS Blood Cell / WhatsApp emergency broadcast messages into structured case data.
 */
export function parseBroadcastMessage(text) {
  if (!text || typeof text !== 'string') return null;

  const getLineVal = (pattern) => {
    const match = text.match(pattern);
    return match && match[1] ? match[1].trim() : '';
  };

  const rawBg = getLineVal(/(?:Blood\s*group|BloodGroup|Group)\s*[:=]\s*([^\n\r]+)/i);
  const rawPatientName = getLineVal(/(?:Name\s*of\s*person|Patient\s*Name|Name)\s*[:=]\s*([^\n\r]+)/i);
  const rawDate = getLineVal(/(?:Date|Required\s*Date)\s*[:=]\s*([^\n\r]+)/i);
  const hospital = getLineVal(/(?:Hospital|Location|Venue)\s*[:=]\s*([^\n\r]+)/i);
  const district = getLineVal(/(?:District|City)\s*[:=]\s*([^\n\r]+)/i);
  const rawBystanderName = getLineVal(/(?:Bystander\s*Name|Contact\s*Person|Bystander)\s*[:=]\s*([^\n\r]+)/i);
  const bystanderContact = getLineVal(/(?:Bystander\s*Contact\s*number|Contact\s*number|Contact|Phone|Mobile)\s*[:=]\s*([^\n\r]+)/i);
  const unitsStr = getLineVal(/(?:No\s*of\s*units|Units\s*Needed|Units|Count)\s*[:=]\s*([^\n\r]+)/i);

  // Normalize Blood Group
  let bloodGroup = 'O+';
  if (rawBg) {
    bloodGroup = normalizeGroup(rawBg);
  }

  // Format Patient & Bystander Names (Title Case, spaced capitalized initials, no dots)
  const patientName = rawPatientName ? formatDonorName(rawPatientName) : '';
  const bystanderName = rawBystanderName ? formatDonorName(rawBystanderName) : '';

  // Format Date to YYYY-MM-DD
  let requiredDate = new Date().toISOString().slice(0, 10);
  if (rawDate) {
    const dMatch = rawDate.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (dMatch) {
      const day = dMatch[1].padStart(2, '0');
      const month = dMatch[2].padStart(2, '0');
      const year = dMatch[3].length === 2 ? `20${dMatch[3]}` : dMatch[3];
      requiredDate = `${year}-${month}-${day}`;
    }
  }

  const cleanContact = bystanderContact.replace(/\D/g, '').slice(-10);
  const combinedContact = bystanderName ? (cleanContact ? `${bystanderName} (${cleanContact})` : bystanderName) : cleanContact;
  const fullHospital = hospital ? (district && !hospital.toLowerCase().includes(district.toLowerCase()) ? `${hospital}, ${district}` : hospital) : district;

  const isCritical = /CRITICAL|EMERGENCY/i.test(text);
  const isUrgent = /URGENT/i.test(text);
  const urgency = isCritical ? 'Critical' : (isUrgent ? 'Urgent' : 'Standard');

  return {
    patientName,
    hospital: fullHospital || '',
    bloodGroup,
    unitsNeeded: parseInt(unitsStr, 10) || 1,
    urgency,
    requiredDate,
    contactPerson: combinedContact || '',
    bystanderName,
    bystanderContact: cleanContact || '',
    district: district || '',
    notes: text.trim(),
  };
}
