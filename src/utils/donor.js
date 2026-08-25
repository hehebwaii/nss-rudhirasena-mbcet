export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const MS_PER_DAY = 86400000;

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseDateOnly(value) {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  if (str.toLowerCase() === 'eligible' || str.toLowerCase() === 'now') {
    return startOfDay(new Date());
  }
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(str);
  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return isNaN(date.getTime()) ? null : date;
  }
  const dmyMatch = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(str);
  if (dmyMatch) {
    const date = new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
    return isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : startOfDay(fallback);
}

export function getEligibility(donor) {
  if (!donor) return 'unknown';
  const nextVal = donor['Next Eligible Date'] || donor.Next_Eligible_Date || donor.nextEligibleDate;
  if (
    typeof nextVal === 'string' &&
    (nextVal.toLowerCase().trim() === 'eligible' || nextVal.toLowerCase().trim() === 'now')
  ) {
    return 'eligible';
  }
  const next = parseDateOnly(nextVal);
  if (!next) {
    return 'eligible';
  }
  const today = startOfDay(new Date());
  return today.getTime() >= next.getTime() ? 'eligible' : 'cooling';
}

export function daysRemaining(donor) {
  const nextVal =
    donor &&
    (donor['Next Eligible Date'] || donor.Next_Eligible_Date || donor.nextEligibleDate);
  if (
    typeof nextVal === 'string' &&
    (nextVal.toLowerCase().trim() === 'eligible' || nextVal.toLowerCase().trim() === 'now')
  ) {
    return 0;
  }
  const next = parseDateOnly(nextVal);
  if (!next) return null;
  const today = startOfDay(new Date());
  return Math.max(0, Math.round((next.getTime() - today.getTime()) / MS_PER_DAY));
}

export function formatShortDate(value) {
  if (value == null || value === '') return '—';
  const str = String(value).trim();
  if (str.toLowerCase() === 'eligible' || str.toLowerCase() === 'now') {
    return 'Eligible';
  }
  const date = parseDateOnly(value);
  if (!date) return str || '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function normalizeGroup(value) {
  return String(value == null ? '' : value).trim().toUpperCase();
}

export function normalizeYear(value) {
  if (!value) return '';
  const str = String(value).trim();
  const lower = str.toLowerCase();
  if (lower.includes('1') || lower.includes('first')) return '1st Year';
  if (lower.includes('2') || lower.includes('second')) return '2nd Year';
  if (lower.includes('3') || lower.includes('third')) return '3rd Year';
  if (lower.includes('4') || lower.includes('fourth') || lower.includes('final')) return '4th Year';
  return str;
}

export function uniqueLocations(donors) {
  const seen = new Map();
  (donors || []).forEach((donor) => {
    const raw =
      donor.Location ||
      donor.District_Location ||
      donor.district_location ||
      donor.District ||
      donor.district ||
      donor.city;
    if (raw == null) return;
    const value = String(raw).trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (!seen.has(key)) seen.set(key, value);
  });
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

/**
 * Normalizes donor records from any Google Sheet / Apps Script header format
 * to canonical properties expected by UI components.
 */
export function normalizeDonor(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return raw;

  const pick = (...keys) => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== '') {
        return raw[k];
      }
    }
    return '';
  };

  const id = pick('ID', 'Donor_ID', 'donor_id', 'DonorID', 'id') || `RUD-${String(index + 1).padStart(3, '0')}`;
  const name = pick('Name', 'Full_Name', 'full_name', 'FullName', 'Donor_Name', 'name', 'Full Name');
  const bloodGroup = pick('Blood Group', 'Blood_Group', 'blood_group', 'BloodGroup', 'bloodGroup', 'Group');
  const contact = pick('Contact', 'Contact_Number', 'contact_number', 'ContactNumber', 'Phone', 'phone', 'Mobile', 'mobile', 'Contact Number');
  
  let rawDept = pick('Department', 'Department_Year', 'department_year', 'DepartmentYear', 'Dept', 'dept', 'Department / Year');
  let rawYear = pick('Year', 'Year_of_Study', 'year_of_study', 'YearOfStudy', 'year', 'Batch', 'batch', 'Year / Batch');

  // If year is not separately defined but embedded in department (e.g. "CS 3rd Year")
  if (!rawYear && rawDept) {
    const yearMatch = /(1st|2nd|3rd|4th|\b[1-4]\b)\s*(year|yr)?/i.exec(rawDept);
    if (yearMatch) {
      rawYear = normalizeYear(yearMatch[0]);
      rawDept = rawDept.replace(yearMatch[0], '').replace(/[-–—/]/g, '').trim();
    }
  }

  const year = normalizeYear(rawYear);
  const department = rawDept || 'General';
  const age = raw.Age ?? raw.age ?? '';
  const weight = raw.Weight ?? raw.Weight_kg ?? raw.weight_kg ?? raw.weight ?? raw['Weight (kg)'] ?? '';
  const gender = pick('Gender', 'gender', 'Sex', 'sex');
  const location = pick('Location', 'District_Location', 'district_location', 'District', 'district', 'City', 'city', 'location', 'District / Location');
  const lastDonatedDate = pick('Last Donated Date', 'Last_Donated_Date', 'last_donated_date', 'LastDonatedDate', 'lastDonatedDate');
  const lastDonationType = pick('Last Donation Type', 'Last_Donation_Type', 'last_donation_type', 'LastDonationType', 'lastDonationType');
  const lastDonationVenue = pick('Last Donation Venue', 'Last_Donation_Venue', 'last_donation_venue', 'LastDonationVenue', 'Venue', 'venue', 'Last Donation Venue');
  const certificateUrl = pick('Certificate URL', 'Certificate_URL', 'certificate_url', 'CertificateUrl', 'Cert_URL', 'certificate');
  const nextEligibleDate = pick('Next Eligible Date', 'Next_Eligible_Date', 'next_eligible_date', 'NextEligibleDate', 'nextEligibleDate');

  return {
    ...raw,
    ID: id,
    Name: name,
    'Blood Group': bloodGroup,
    Contact: contact,
    Department: department,
    Year: year,
    Age: age !== '' ? Number(age) : '',
    Weight: weight !== '' ? Number(weight) : '',
    Gender: gender,
    Location: location,
    'Last Donated Date': lastDonatedDate,
    'Last Donation Type': lastDonationType,
    'Last Donation Venue': lastDonationVenue,
    'Certificate URL': certificateUrl,
    'Next Eligible Date': nextEligibleDate,
  };
}
