export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export const COOLDOWN_DAYS_WHOLE_BLOOD = 90;
export const COOLDOWN_DAYS_PLATELETS = 14;
export const NEWLY_ELIGIBLE_WINDOW_DAYS = 30;

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

/**
 * Full 90-day cooldown details calculator
 */
export function getEligibilityDetails(donor) {
  if (!donor) {
    return {
      status: 'unknown',
      daysLeft: null,
      daysElapsed: null,
      totalCooldown: COOLDOWN_DAYS_WHOLE_BLOOD,
      progressPercent: 100,
      isNewlyEligible: false,
      lastDonatedDate: null,
      nextEligibleDate: null,
    };
  }

  const today = startOfDay(new Date());
  const rawLast = donor['Last Donated Date'] || donor.Last_Donated_Date || donor.lastDonatedDate;
  const rawNext = donor['Next Eligible Date'] || donor.Next_Eligible_Date || donor.nextEligibleDate;
  const donationType = donor['Last Donation Type'] || donor.Last_Donation_Type || 'Whole Blood';

  const totalCooldown =
    donationType === 'Platelets' || donationType === 'Plasma'
      ? COOLDOWN_DAYS_PLATELETS
      : COOLDOWN_DAYS_WHOLE_BLOOD;

  const parsedLast = parseDateOnly(rawLast);
  let parsedNext = parseDateOnly(rawNext);

  // If next eligible date is missing but last donated date exists, calculate Last + 90d
  if (!parsedNext && parsedLast) {
    parsedNext = new Date(parsedLast.getTime() + totalCooldown * MS_PER_DAY);
  }

  // If both missing, donor has no recorded donation and is ready
  if (!parsedNext && !parsedLast) {
    return {
      status: 'eligible',
      daysLeft: 0,
      daysElapsed: totalCooldown,
      totalCooldown,
      progressPercent: 100,
      lastDonatedDate: null,
      nextEligibleDate: null,
    };
  }

  const nextTime = (parsedNext || today).getTime();
  const todayTime = today.getTime();

  if (todayTime < nextTime) {
    // Currently cooling down
    const daysLeft = Math.max(1, Math.ceil((nextTime - todayTime) / MS_PER_DAY));
    const daysElapsed = Math.max(0, totalCooldown - daysLeft);
    const progressPercent = Math.min(99, Math.max(1, Math.round((daysElapsed / totalCooldown) * 100)));

    return {
      status: 'cooling',
      daysLeft,
      daysElapsed,
      totalCooldown,
      progressPercent,
      lastDonatedDate: parsedLast,
      nextEligibleDate: parsedNext,
    };
  }

  // Cooldown complete (eligible)
  return {
    status: 'eligible',
    daysLeft: 0,
    daysElapsed: totalCooldown,
    totalCooldown,
    progressPercent: 100,
    lastDonatedDate: parsedLast,
    nextEligibleDate: parsedNext,
  };
}

export function getEligibility(donor) {
  const details = getEligibilityDetails(donor);
  return details.status;
}

export function daysRemaining(donor) {
  const details = getEligibilityDetails(donor);
  return details.daysLeft;
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
  if (!value) return '1st Year';
  const str = String(value).trim();
  const lower = str.toLowerCase();

  // Direct canonical matches
  if (lower === '3rd year' || lower === '3rd' || lower === 'third' || lower === '3' || lower === 'year 3' || lower === '3rd yr' || lower === 's5' || lower === 's6') {
    return '3rd Year';
  }
  if (lower === '4th year' || lower === '4th' || lower === 'fourth' || lower === '4' || lower === 'year 4' || lower === '4th yr' || lower === 'final' || lower === 'final year' || lower === 's7' || lower === 's8') {
    return '4th Year';
  }
  if (lower === '2nd year' || lower === '2nd' || lower === 'second' || lower === '2' || lower === 'year 2' || lower === '2nd yr' || lower === 's3' || lower === 's4') {
    return '2nd Year';
  }
  if (lower === '1st year' || lower === '1st' || lower === 'first' || lower === '1' || lower === 'year 1' || lower === '1st yr' || lower === 's1' || lower === 's2') {
    return '1st Year';
  }

  // Word boundary regex check
  if (/\b(?:4th|fourth|final)\b/i.test(str) || /\b4\b/.test(str)) return '4th Year';
  if (/\b(?:3rd|third)\b/i.test(str) || /\b3\b/.test(str)) return '3rd Year';
  if (/\b(?:2nd|second)\b/i.test(str) || /\b2\b/.test(str)) return '2nd Year';
  if (/\b(?:1st|first)\b/i.test(str) || /\b1\b/.test(str)) return '1st Year';

  return '1st Year';
}

export function cleanLocation(val) {
  if (val == null) return '';
  if (val instanceof Date) return '';
  const str = String(val).trim();
  if (!str) return '';
  if (
    /GMT[+-]\d{4}/i.test(str) ||
    /India Standard Time/i.test(str) ||
    /^[A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{4}/i.test(str) ||
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/i.test(str)
  ) {
    return '';
  }
  return str;
}

export function uniqueLocations(donors) {
  const seen = new Map();
  (donors || []).forEach((donor) => {
    const raw = cleanLocation(
      donor.Location ||
      donor.District_Location ||
      donor.district_location ||
      donor['District / Location'] ||
      donor.District ||
      donor.district ||
      donor.city ||
      donor.City ||
      donor.Place ||
      donor.place
    );
    if (!raw) return;
    const value = String(raw).trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (!seen.has(key)) seen.set(key, value);
  });
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

/**
 * Extracts array of certificate URLs for a donor (handles multiple comma/newline-separated URLs)
 */
export function getCertificateUrls(donor) {
  if (!donor) return [];
  const raw =
    donor['Certificate URL'] ||
    donor.Certificate_URL ||
    donor.certificate_url ||
    donor.Certificate ||
    '';
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return String(raw)
    .split(/[\n,;]+/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http://') || u.startsWith('https://'));
}

/**
 * Formats donor name such that:
 * 1. Dots/periods are removed, and initials are separated by spaces.
 * 2. Each word has first letter capital, rest lowercase (Title Case).
 * 3. Initials (e.g. "S S", "P K", "V S") are ALWAYS capitalized and spaced,
 *    regardless of whether they appear at the beginning, middle, or end.
 * Examples:
 *   "rahul v.s" -> "Rahul V S"
 *   "s.s. niranjan" -> "S S Niranjan"
 *   "anandu krishnan p.k." -> "Anandu Krishnan P K"
 */
export function formatDonorName(name) {
  if (!name || typeof name !== 'string') return '';
  // Remove dots and commas, replace with spaces, and collapse multiple spaces
  const clean = name.replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  return clean
    .split(' ')
    .map((word) => {
      if (!word) return '';

      // Single character initial (e.g. "s", "k", "p", "v") -> "S", "K", "P", "V"
      if (word.length === 1) {
        return word.toUpperCase();
      }

      // 2 or 3 letter initial sequence without vowels (e.g. "ss", "pk", "kp", "sk", "ms", "ck")
      // e.g. "ss" -> "S S", "pk" -> "P K"
      if (word.length <= 3 && !/[aeiouy]/i.test(word)) {
        return word.toUpperCase().split('').join(' ');
      }

      // Standard word (e.g. "rahul" -> "Rahul", "NIRANJAN" -> "Niranjan")
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
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
  const rawName = pick('Name', 'Full_Name', 'full_name', 'FullName', 'Donor_Name', 'name', 'Full Name');
  const name = formatDonorName(rawName);
  const bloodGroup = pick('Blood Group', 'Blood_Group', 'blood_group', 'BloodGroup', 'bloodGroup', 'Group');
  const contact = pick('Contact', 'Contact_Number', 'contact_number', 'ContactNumber', 'Phone', 'phone', 'Mobile', 'mobile', 'Contact Number');
  
  let rawDept = pick('Department', 'Department_Year', 'department_year', 'DepartmentYear', 'Dept', 'dept', 'Department / Year');
  let rawYear = pick('Year', 'Year_of_Study', 'year_of_study', 'YearOfStudy', 'year', 'Batch', 'batch', 'Year / Batch');

  // Extract year if combined with department (e.g. "ECE - 2nd Year", "CS 3rd Year", "ME (4th Year)")
  if (!rawYear && rawDept) {
    const yearMatch = /(1st|2nd|3rd|4th|\b[1-4](?:st|nd|rd|th)?\b)\s*(?:year|yr)?/i.exec(String(rawDept));
    if (yearMatch) {
      rawYear = normalizeYear(yearMatch[0]);
      rawDept = String(rawDept).replace(yearMatch[0], '').replace(/[-–—/()]/g, '').trim();
    }
  } else if (rawYear && rawDept) {
    const yearMatch = /(1st|2nd|3rd|4th|\b[1-4](?:st|nd|rd|th)?\b)\s*(?:year|yr)?/i.exec(String(rawDept));
    if (yearMatch) {
      rawDept = String(rawDept).replace(yearMatch[0], '').replace(/[-–—/()]/g, '').trim();
    }
  }

  const year = normalizeYear(rawYear);
  const department = rawDept || 'General';
  const age = raw.Age ?? raw.age ?? '';
  const rawWeight = raw.Weight ?? raw.Weight_kg ?? raw.weight_kg ?? raw.weight ?? raw['Weight (kg)'] ?? '';
  const weight = rawWeight !== '' && rawWeight != null && !isNaN(Number(rawWeight)) ? Number(rawWeight) : '';
  const gender = pick('Gender', 'gender', 'Sex', 'sex');
  const location = cleanLocation(
    pick(
      'Location',
      'District_Location',
      'district_location',
      'District / Location',
      'District/Location',
      'District',
      'district',
      'City',
      'city',
      'location',
      'Place',
      'place',
      'Address',
      'address'
    )
  );
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
