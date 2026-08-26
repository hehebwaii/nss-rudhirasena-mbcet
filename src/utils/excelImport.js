import * as XLSX from 'xlsx';
import { BLOOD_GROUPS, normalizeYear, formatDonorName } from './donor.js';

/**
 * Match a raw spreadsheet column header to canonical donor field
 */
export function matchHeader(header) {
  if (!header) return null;
  const clean = String(header)
    .trim()
    .toLowerCase()
    .replace(/[\r\n\t_]+/g, ' ')
    .replace(/[^\w\s/().-]/g, '')
    .trim();

  if (!clean) return null;

  // 1. Camp / Drive / Event column (Must check before Name to prevent "Camp Name" -> Name collision!)
  if (/\b(?:camp\s*name|camp|event\s*name|event|drive\s*name|drive|venue|program)\b/i.test(clean)) {
    return 'camp';
  }

  // 2. Certificate / File link
  if (/\b(?:certificate\s*url|certificate\s*link|certificate|cert\s*url|cert\s*link|drive\s*link|file\s*link|file\s*url)\b/i.test(clean)) {
    return 'certificateUrl';
  }

  // 3. Blood Group
  if (
    /\b(?:blood\s*group|bloodgroup|blood_group|blood\s*type|bg|rh\s*group)\b/i.test(clean) ||
    clean === 'group' ||
    clean === 'blood'
  ) {
    return 'bloodGroup';
  }

  // 4. Contact / Mobile / Phone
  if (/\b(?:contact\s*number|contact|phone\s*number|phone|mobile\s*number|mobile|whatsapp\s*number|whatsapp|ph\s*no|mob\s*no|tel|phone\s*no)\b/i.test(clean)) {
    return 'contact';
  }

  // 5. Department / Branch
  if (/\b(?:department\s*\/\s*branch|department|dept|branch|course|stream)\b/i.test(clean)) {
    return 'department';
  }

  // 6. Year of study
  if (/\b(?:year\s*of\s*study|year|current\s*year|batch|semester|sem|class)\b/i.test(clean)) {
    return 'year';
  }

  // 7. Age
  if (/\b(?:your\s*age|age\s*\(in\s*years\)|age\s*in\s*years|age)\b/i.test(clean)) {
    return 'age';
  }

  // 8. Weight
  if (/\b(?:weight\s*\(kg\)|weight\s*in\s*kg|weight_kg|weight|body\s*weight)\b/i.test(clean)) {
    return 'weight';
  }

  // 9. Gender / Sex
  if (/\b(?:gender|sex)\b/i.test(clean)) {
    return 'gender';
  }

  // 10. Location / District / Place
  if (/\b(?:district\s*\/\s*location|district|location|place|address|city|residence|native\s*place|native)\b/i.test(clean)) {
    return 'location';
  }

  // 11. Donor Name (Only when NOT a parent, hospital, college, or camp column!)
  if (
    /\b(?:donor\s*name|student\s*name|volunteer\s*name|candidate\s*name|participant\s*name|full\s*name|fullname|name\s*of\s*(?:the\s*)?(?:donor|student|volunteer|candidate|participant)|name)\b/i.test(clean)
  ) {
    // Avoid false positives like Father's Name, Mother's Name, College Name, Hospital Name
    if (!/\b(?:father|mother|parent|guardian|college|hospital|venue|camp|event|file|sheet|org|institution|school)\b/i.test(clean)) {
      return 'name';
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
 * Checks if a string looks like a human person's name (not a date, timestamp, URL, or number)
 */
function looksLikePersonName(val) {
  if (!val) return false;
  const str = String(val).trim();
  if (str.length < 2 || str.length > 80) return false;
  // If all digits or looks like a timestamp/date/URL/email
  if (/^\d+$/.test(str)) return false;
  if (/https?:\/\//i.test(str)) return false;
  if (/@/.test(str)) return false;
  if (/^\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4}/.test(str)) return false; // Date / Timestamp
  if (/^(A|B|AB|O)[\+\-]/i.test(str) && str.length <= 4) return false; // Just a blood group
  // Must have at least 2 letters
  const letterCount = (str.match(/[a-zA-Z]/g) || []).length;
  return letterCount >= 2;
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

        // Auto-detect header row (check first 6 rows for highest match count)
        let bestHeaderRowIdx = 0;
        let bestHeaderMapping = {};
        let maxMatches = 0;

        for (let r = 0; r < Math.min(rawJson.length, 6); r++) {
          const row = rawJson[r];
          if (!Array.isArray(row)) continue;
          const currentMapping = {};
          let matches = 0;

          row.forEach((colName, idx) => {
            const canonical = matchHeader(colName);
            if (canonical && currentMapping[canonical] === undefined) {
              currentMapping[canonical] = idx;
              matches++;
            }
          });

          if (matches > maxMatches) {
            maxMatches = matches;
            bestHeaderRowIdx = r;
            bestHeaderMapping = currentMapping;
          }
        }

        const headerMapping = { ...bestHeaderMapping };

        // Fallback or verification for the Name column:
        // If Name is missing or points to a non-name column, scan sample data rows for the best person name column
        const sampleRows = rawJson.slice(bestHeaderRowIdx + 1, bestHeaderRowIdx + 6).filter((row) => Array.isArray(row) && row.length > 0);
        
        let needsNameScan = headerMapping.name === undefined;
        if (!needsNameScan && sampleRows.length > 0) {
          const nameColIdx = headerMapping.name;
          const validNameRatio = sampleRows.filter((r) => looksLikePersonName(r[nameColIdx])).length / sampleRows.length;
          if (validNameRatio < 0.5) {
            needsNameScan = true;
          }
        }

        if (needsNameScan && sampleRows.length > 0) {
          // Scan all columns in sample rows and find the column with the highest person name score
          const maxCols = Math.max(...sampleRows.map((r) => r.length));
          let bestCol = -1;
          let bestScore = 0;

          for (let c = 0; c < maxCols; c++) {
            // Skip columns already claimed by bloodGroup or contact
            if (headerMapping.bloodGroup === c || headerMapping.contact === c) continue;

            const nameCount = sampleRows.filter((r) => looksLikePersonName(r[c])).length;
            if (nameCount > bestScore) {
              bestScore = nameCount;
              bestCol = c;
            }
          }

          if (bestCol !== -1) {
            headerMapping.name = bestCol;
          } else {
            headerMapping.name = 0;
          }
        }

        const parsedDonors = [];

        for (let r = bestHeaderRowIdx + 1; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!row || !Array.isArray(row) || row.every((c) => String(c).trim() === '')) continue;

          const rawName = headerMapping.name !== undefined ? String(row[headerMapping.name] || '').trim() : '';
          // Skip empty or header repeated rows
          if (!rawName || !looksLikePersonName(rawName)) continue;
          if (rawName.toLowerCase() === 'name' || rawName.toLowerCase() === 'donor name' || rawName.toLowerCase() === 'full name') continue;

          const rawBg = headerMapping.bloodGroup !== undefined ? row[headerMapping.bloodGroup] : 'O+';
          const rawContact = headerMapping.contact !== undefined ? row[headerMapping.contact] : '';
          const rawDept = headerMapping.department !== undefined ? row[headerMapping.department] : 'General';
          const rawYear = headerMapping.year !== undefined ? row[headerMapping.year] : '1st Year';
          const rawAge = headerMapping.age !== undefined && row[headerMapping.age] !== '' ? Number(row[headerMapping.age]) : 20;
          const rawWeight = headerMapping.weight !== undefined && row[headerMapping.weight] !== '' && !isNaN(Number(row[headerMapping.weight])) ? Number(row[headerMapping.weight]) : '';
          const rawGender = headerMapping.gender !== undefined ? row[headerMapping.gender] : 'Male';
          const rawLocation = headerMapping.location !== undefined ? row[headerMapping.location] : 'Trivandrum';
          const rawCamp = headerMapping.camp !== undefined ? String(row[headerMapping.camp] || '').trim() : '';
          const rawCertUrl = headerMapping.certificateUrl !== undefined ? String(row[headerMapping.certificateUrl] || '').trim() : '';

          const formattedName = formatDonorName(rawName) || String(rawName).trim();

          parsedDonors.push({
            name: formattedName,
            bloodGroup: normalizeBloodGroup(rawBg),
            contact: normalizeContact(rawContact),
            department: String(rawDept || 'General').trim(),
            year: normalizeYear(rawYear) || '1st Year',
            age: !isNaN(rawAge) && rawAge >= 16 && rawAge <= 70 ? rawAge : 20,
            weight: rawWeight !== '' && !isNaN(rawWeight) && rawWeight >= 30 && rawWeight <= 200 ? rawWeight : '',
            gender: normalizeGender(rawGender),
            location: String(rawLocation || 'Trivandrum').trim(),
            campName: rawCamp,
            certificateUrl: rawCertUrl,
          });
        }

        if (parsedDonors.length === 0) {
          throw new Error('No donor records could be extracted from this spreadsheet. Please ensure the sheet has a Name column.');
        }

        resolve(parsedDonors);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read spreadsheet file.'));
    reader.readAsArrayBuffer(file);
  });
}
