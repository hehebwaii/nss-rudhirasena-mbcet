import * as XLSX from 'xlsx';
import { BLOOD_GROUPS, YEARS, normalizeYear, formatDonorName } from './donor';

const GENDERS = ['Male', 'Female'];

const HEADER_ALIASES = {
  name: [
    'name',
    'full name',
    'fullname',
    'donor name',
    'donor_name',
    'student name',
    'name of the donor',
    'name of donor',
    'volunteer name',
  ],
  bloodGroup: [
    'blood group',
    'blood_group',
    'bloodgroup',
    'blood group (with rh)',
    'blood type',
    'blood',
    'group',
    'rh group',
  ],
  contact: [
    'contact',
    'contact number',
    'contact_number',
    'contactnumber',
    'phone',
    'phone number',
    'mobile',
    'mobile number',
    'whatsapp number',
    'ph no',
    'mob no',
    'tel',
  ],
  department: [
    'department',
    'dept',
    'branch',
    'department / branch',
    'course',
    'stream',
  ],
  year: [
    'year',
    'year of study',
    'year_of_study',
    'current year',
    'batch',
    'semester',
    'sem',
    'class',
  ],
  age: ['age', 'your age', 'age (in years)', 'age in years'],
  weight: [
    'weight',
    'weight (kg)',
    'weight in kg',
    'weight(kg)',
    'weight_kg',
    'body weight',
  ],
  gender: ['gender', 'sex'],
  location: [
    'location',
    'district',
    'place',
    'address',
    'city',
    'district / location',
    'residence',
    'native place',
  ],
};

/**
 * Find matching canonical key for a given column header name
 */
function matchHeader(header) {
  if (!header) return null;
  const clean = String(header).trim().toLowerCase().replace(/[\r\n\t]+/g, ' ');

  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((alias) => clean === alias || clean.startsWith(alias) || clean.includes(alias))) {
      return key;
    }
  }
  return null;
}

/**
 * Normalize blood group string from Excel (e.g., "O +ve", "O POSITIVE", "A+ ve")
 */
function normalizeBloodGroup(val) {
  if (!val) return 'O+';
  let s = String(val).trim().toUpperCase();
  s = s.replace(/\s+/g, '');
  s = s.replace(/POSITIVE|\+VE|\+V/g, '+');
  s = s.replace(/NEGATIVE|\-VE|\-V/g, '-');

  if (BLOOD_GROUPS.includes(s)) return s;
  const match = s.match(/(A|B|AB|O)[\+\-]/);
  if (match && BLOOD_GROUPS.includes(match[0])) return match[0];
  return 'O+';
}

/**
 * Normalize contact number (keep digits, strip +91 / prefixes if standard 10 digit)
 */
function normalizeContact(val) {
  if (!val) return '9876543210';
  const digits = String(val).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits || '9876543210';
}

/**
 * Normalize gender string
 */
function normalizeGender(val) {
  if (!val) return 'Male';
  const s = String(val).trim().toLowerCase();
  if (s.startsWith('f') || s.includes('female') || s.includes('woman')) return 'Female';
  return 'Male';
}

/**
 * Parse an Excel / CSV File into normalized donor objects
 */
export async function parseExcelOrCsv(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('No sheets found in the uploaded file.');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawJson || rawJson.length < 2) {
          throw new Error('Spreadsheet must contain at least a header row and data rows.');
        }

        const headerRow = rawJson[0];
        const headerMapping = {};

        headerRow.forEach((colName, idx) => {
          const canonical = matchHeader(colName);
          if (canonical && !headerMapping[canonical]) {
            headerMapping[canonical] = idx;
          }
        });

        if (headerMapping.name === undefined) {
          // Fallback: try finding first column with text names
          headerMapping.name = 1;
        }

        const parsedDonors = [];

        for (let r = 1; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!row || row.every((c) => String(c).trim() === '')) continue;

          const rawName = headerMapping.name !== undefined ? String(row[headerMapping.name] || '').trim() : '';
          if (!rawName) continue;

          const rawBg = headerMapping.bloodGroup !== undefined ? row[headerMapping.bloodGroup] : 'O+';
          const rawContact = headerMapping.contact !== undefined ? row[headerMapping.contact] : '';
          const rawDept = headerMapping.department !== undefined ? row[headerMapping.department] : 'General';
          const rawYear = headerMapping.year !== undefined ? row[headerMapping.year] : '1st Year';
          const rawAge = headerMapping.age !== undefined ? Number(row[headerMapping.age]) : 20;
          const rawWeight = headerMapping.weight !== undefined ? Number(row[headerMapping.weight]) : 60;
          const rawGender = headerMapping.gender !== undefined ? row[headerMapping.gender] : 'Male';
          const rawLocation = headerMapping.location !== undefined ? row[headerMapping.location] : 'Trivandrum';

          parsedDonors.push({
            name: formatDonorName(rawName),
            bloodGroup: normalizeBloodGroup(rawBg),
            contact: normalizeContact(rawContact),
            department: String(rawDept || 'General').trim(),
            year: normalizeYear(rawYear) || '1st Year',
            age: rawAge >= 17 && rawAge <= 65 ? rawAge : 20,
            weight: rawWeight >= 45 && rawWeight <= 200 ? rawWeight : 55,
            gender: normalizeGender(rawGender),
            location: String(rawLocation || 'Trivandrum').trim(),
          });
        }

        resolve(parsedDonors);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}
