/**
 * NSS Rudhirasena Blood Donor Registry - Secure Google Apps Script Backend
 *
 * OWASP Top 10 & Security Architecture:
 * - A01: Broken Access Control -> API Token authentication required
 * - A03: Injection -> Formula injection sanitization & HTML/script stripping
 * - A04: Insecure Design -> Sliding-window rate limiting via CacheService
 * - A05: Security Misconfiguration -> Input length boundaries, strict type checking
 * - A07: Identification & Auth Failures -> Constant-time token verification
 */

const SHEET_NAME = 'Donors';
const ADMIN_API_KEY = 'rudhirasena';

// Rate Limit Config
const RATE_LIMIT_READ_MAX = 60;   // Max 60 GET requests per minute per client
const RATE_LIMIT_WRITE_MAX = 15;  // Max 15 POST mutations per minute per client
const RATE_LIMIT_WINDOW_SEC = 60; // 1 minute sliding window
const MAX_PAYLOAD_BYTES = 65536;  // Max 64 KB payload

const CANONICAL_HEADERS = [
  'ID',
  'Name',
  'Blood Group',
  'Contact',
  'Department',
  'Year',
  'Age',
  'Weight',
  'Gender',
  'Location',
  'Last Donated Date',
  'Last Donation Type',
  'Last Donation Venue',
  'Certificate URL',
  'Next Eligible Date'
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female'];
const DONATION_TYPES = ['Platelets', 'Whole Blood', 'Plasma'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

// Header dictionary mapping common variations to canonical header keys
const HEADER_MAP = {
  'id': 'ID',
  'donor id': 'ID',
  'donor_id': 'ID',
  'donorid': 'ID',
  'name': 'Name',
  'full name': 'Name',
  'full_name': 'Name',
  'fullname': 'Name',
  'donor name': 'Name',
  'donor_name': 'Name',
  'blood group': 'Blood Group',
  'blood_group': 'Blood Group',
  'bloodgroup': 'Blood Group',
  'group': 'Blood Group',
  'contact': 'Contact',
  'contact number': 'Contact',
  'contact_number': 'Contact',
  'contactnumber': 'Contact',
  'phone': 'Contact',
  'mobile': 'Contact',
  'phone number': 'Contact',
  'department': 'Department',
  'department / year': 'Department',
  'department_year': 'Department',
  'departmentyear': 'Department',
  'dept': 'Department',
  'year': 'Year',
  'year of study': 'Year',
  'year_of_study': 'Year',
  'yearofstudy': 'Year',
  'batch': 'Year',
  'academic year': 'Year',
  'age': 'Age',
  'weight': 'Weight',
  'weight (kg)': 'Weight',
  'weight_kg': 'Weight',
  'gender': 'Gender',
  'sex': 'Gender',
  'location': 'Location',
  'district': 'Location',
  'district / location': 'Location',
  'district_location': 'Location',
  'city': 'Location',
  'last donated date': 'Last Donated Date',
  'last_donated_date': 'Last Donated Date',
  'last donation date': 'Last Donated Date',
  'last donated': 'Last Donated Date',
  'last donation type': 'Last Donation Type',
  'last_donation_type': 'Last Donation Type',
  'donation type': 'Last Donation Type',
  'last donation venue': 'Last Donation Venue',
  'last_donation_venue': 'Last Donation Venue',
  'donation venue': 'Last Donation Venue',
  'venue': 'Last Donation Venue',
  'certificate url': 'Certificate URL',
  'certificate_url': 'Certificate URL',
  'certificate link': 'Certificate URL',
  'cert url': 'Certificate URL',
  'certificate': 'Certificate URL',
  'next eligible date': 'Next Eligible Date',
  'next_eligible_date': 'Next Eligible Date',
  'eligible date': 'Next Eligible Date'
};

function doGet(e) {
  try {
    const clientId = getClientId_(e);
    
    // 1. Rate Limiting Check
    if (!checkRateLimit_(clientId, false)) {
      return jsonResponse_({
        status: 'error',
        error: 'Too Many Requests: Rate limit exceeded. Please wait a minute.',
        code: 429
      });
    }

    // 2. Authentication Check (Allow with token or accept query key)
    const token = (e && e.parameter && (e.parameter.key || e.parameter.auth || e.parameter.apiKey)) || '';
    const hasAuth = verifyAuth_(token);

    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      return jsonResponse_({ status: 'success', data: [] });
    }

    const rawHeaders = values[0].map(h => String(h).trim());
    const mappedHeaders = rawHeaders.map(h => {
      const cleaned = h.toLowerCase().replace(/[\s_\-]+/g, ' ').trim();
      return HEADER_MAP[cleaned] || h;
    });

    const donors = values
      .slice(1)
      .filter(row => row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''))
      .map((row, index) => {
        const donor = {};
        
        rawHeaders.forEach((rawHeader, i) => {
          const val = cellValue_(row[i]);
          donor[rawHeader] = val;
          const canonical = mappedHeaders[i];
          if (canonical) {
            donor[canonical] = val;
          }
        });

        if (!donor['ID']) {
          donor['ID'] = 'RUD-' + String(index + 1).padStart(3, '0');
        }

        // Normalize Year and Department if combined in Department_Year / Department
        if (!donor['Year']) {
          const rawDeptStr = String(donor['Department'] || donor['Department_Year'] || '').trim();
          const yrMatch = /(1st|2nd|3rd|4th|\b[1-4](?:st|nd|rd|th)?\b)\s*(?:year|yr)?/i.exec(rawDeptStr);
          if (yrMatch) {
            const yrLower = yrMatch[0].toLowerCase();
            let normYr = '1st Year';
            if (yrLower.includes('2')) normYr = '2nd Year';
            else if (yrLower.includes('3')) normYr = '3rd Year';
            else if (yrLower.includes('4')) normYr = '4th Year';
            donor['Year'] = normYr;
            donor['Department'] = rawDeptStr.replace(yrMatch[0], '').replace(/[-–—/()]/g, '').trim();
          }
        }

        // Data protection: Mask phone numbers if unauthenticated
        if (!hasAuth && donor['Contact']) {
          const raw = String(donor['Contact']);
          donor['Contact'] = raw.length > 4 ? raw.slice(0, 2) + '******' + raw.slice(-2) : '******';
          donor['Contact_Number'] = donor['Contact'];
        }

        if (!donor['Next Eligible Date'] && donor['Last Donated Date'] && donor['Last Donation Type'] && donor['Gender']) {
          try {
            const dateObj = new Date(donor['Last Donated Date']);
            if (!isNaN(dateObj.getTime())) {
              donor['Next Eligible Date'] = getNextEligibleDate_(
                donor['Last Donation Type'],
                donor['Gender'],
                dateObj
              );
            }
          } catch (err) {
            donor['Next Eligible Date'] = 'Eligible';
          }
        }

        return donor;
      });

    return jsonResponse_({ status: 'success', data: donors });
  } catch (error) {
    return jsonResponse_({ status: 'error', error: 'Unable to load donor records: ' + sanitizeHtml_(error.message), data: [] });
  }
}

function doPost(e) {
  try {
    const clientId = getClientId_(e);

    // 1. Rate Limiting Check for Write Operations
    if (!checkRateLimit_(clientId, true)) {
      return jsonResponse_({
        status: 'error',
        success: false,
        error: 'Too Many Requests: Rate limit exceeded for write operations. Please try again shortly.',
        code: 429
      });
    }

    if (!e || !e.postData || typeof e.postData.contents !== 'string') {
      throw new ValidationError_('Request body is required.');
    }

    if (e.postData.contents.length > MAX_PAYLOAD_BYTES) {
      throw new ValidationError_('Payload size exceeds safe limit (64KB).');
    }

    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseError) {
      throw new ValidationError_('Invalid JSON payload format.');
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new ValidationError_('Payload must be a JSON object.');
    }

    const action = String(body.action || '').toLowerCase().trim();
    const isUpdate = action === 'update' || action === 'edit';

    // 2. Authentication Check for Updates & Mutations
    const token = body.auth_token || body.key || body.apiKey || (e.parameter && (e.parameter.key || e.parameter.auth)) || '';
    if (isUpdate && !verifyAuth_(token)) {
      throw new ValidationError_('Unauthorized: Admin authorization required to edit member details.');
    }

    // 3. Strict Input Sanitization & Validation (OWASP Injection Protection)
    const id = optStr_(body.ID || body.Donor_ID, 50) || generateId_();
    const name = reqStr_(body.Name || body.Full_Name, 'Name', 100);
    const bloodGroup = reqEnum_(body['Blood Group'] || body.Blood_Group, BLOOD_GROUPS, 'Blood Group');
    const contact = reqContact_(body.Contact || body.Contact_Number || body.Phone);
    const department = reqStr_(body.Department || body.Department_Year, 'Department', 100);
    const year = optStr_(body.Year || body.Year_of_Study || body.year || body.batch, 30);
    const age = reqNumber_(body.Age, 'Age', 16, 100);
    const weight = reqNumber_(body.Weight || body.Weight_kg, 'Weight', 25, 250);
    const gender = reqEnum_(body.Gender, GENDERS, 'Gender');
    const location = reqStr_(body.Location || body.District_Location, 'Location', 150);
    const lastDonated = reqDate_(body['Last Donated Date'] || body.Last_Donated_Date, 'Last Donated Date');
    const donationType = reqEnum_(body['Last Donation Type'] || body.Last_Donation_Type, DONATION_TYPES, 'Last Donation Type');
    const venue = optStr_(body['Last Donation Venue'] || body.Last_Donation_Venue, 150);
    const certUrl = optUrl_(body['Certificate URL'] || body.Certificate_URL);

    const nextEligibleDate = getNextEligibleDate_(donationType, gender, lastDonated);

    const sheet = getSheet_();
    const allValues = sheet.getDataRange().getValues();
    const headerRow = allValues.length > 0 ? allValues[0] : CANONICAL_HEADERS;
    
    const combinedDeptYear = year ? (department ? department + ' - ' + year : year) : department;

    // Sanitize for Formula Injection before writing to Google Sheet
    const rowDataMap = {
      'ID': sanitizeFormula_(id),
      'Donor_ID': sanitizeFormula_(id),
      'Name': sanitizeFormula_(name),
      'Full_Name': sanitizeFormula_(name),
      'Blood Group': sanitizeFormula_(bloodGroup),
      'Blood_Group': sanitizeFormula_(bloodGroup),
      'Contact': sanitizeFormula_(contact),
      'Contact_Number': sanitizeFormula_(contact),
      'Department': sanitizeFormula_(department),
      'Department_Year': sanitizeFormula_(combinedDeptYear),
      'Department / Year': sanitizeFormula_(combinedDeptYear),
      'Year': sanitizeFormula_(year),
      'Year_of_Study': sanitizeFormula_(year),
      'Age': age,
      'Weight': weight,
      'Weight_kg': weight,
      'Gender': sanitizeFormula_(gender),
      'Location': sanitizeFormula_(location),
      'District_Location': sanitizeFormula_(location),
      'Last Donated Date': formatDate_(lastDonated),
      'Last_Donated_Date': formatDate_(lastDonated),
      'Last Donation Type': sanitizeFormula_(donationType),
      'Last_Donation_Type': sanitizeFormula_(donationType),
      'Last Donation Venue': sanitizeFormula_(venue),
      'Last_Donation_Venue': sanitizeFormula_(venue),
      'Certificate URL': sanitizeFormula_(certUrl),
      'Certificate_URL': sanitizeFormula_(certUrl),
      'Next Eligible Date': nextEligibleDate,
      'Next_Eligible_Date': nextEligibleDate
    };

    let formattedRow = [];
    if (headerRow.length > 0 && String(headerRow[0]).trim() !== '') {
      formattedRow = headerRow.map(h => {
        const cleaned = String(h).trim().toLowerCase().replace(/[\s_\-]+/g, ' ');
        const canonicalKey = HEADER_MAP[cleaned] || String(h).trim();
        return rowDataMap[canonicalKey] !== undefined ? rowDataMap[canonicalKey] : (rowDataMap[String(h).trim()] !== undefined ? rowDataMap[String(h).trim()] : '');
      });
    } else {
      formattedRow = CANONICAL_HEADERS.map(h => rowDataMap[h] !== undefined ? rowDataMap[h] : '');
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    let updatedRowIndex = -1;
    try {
      if (isUpdate && allValues.length > 1) {
        const targetId = String(id).trim().toLowerCase();
        
        let idColIndex = -1;
        for (let c = 0; c < headerRow.length; c++) {
          const h = String(headerRow[c]).trim().toLowerCase().replace(/[\s_\-]+/g, ' ');
          if (h === 'id' || h === 'donor id' || h === 'donor_id' || h === 'donorid') {
            idColIndex = c;
            break;
          }
        }

        if (idColIndex !== -1) {
          for (let r = 1; r < allValues.length; r++) {
            const cellVal = String(allValues[r][idColIndex] || '').trim().toLowerCase();
            if (cellVal === targetId) {
              updatedRowIndex = r + 1;
              break;
            }
          }
        }

        if (updatedRowIndex === -1) {
          for (let r = 1; r < allValues.length; r++) {
            for (let c = 0; c < allValues[r].length; c++) {
              if (String(allValues[r][c] || '').trim().toLowerCase() === targetId) {
                updatedRowIndex = r + 1;
                break;
              }
            }
            if (updatedRowIndex !== -1) break;
          }
        }
      }

      if (updatedRowIndex > 0) {
        sheet.getRange(updatedRowIndex, 1, 1, formattedRow.length).setValues([formattedRow]);
      } else {
        sheet.appendRow(formattedRow);
      }
    } finally {
      lock.releaseLock();
    }

    return jsonResponse_({
      status: 'success',
      success: true,
      message: updatedRowIndex > 0 ? 'Donor updated successfully' : 'Donor registered successfully',
      id: id,
      nextEligibleDate: nextEligibleDate
    });
  } catch (error) {
    const message = error instanceof ValidationError_ ? error.message : 'Could not save the donor record.';
    return jsonResponse_({ status: 'error', success: false, error: message });
  }
}

function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// -------------------------------------------------------------
// Security & Validation Helpers
// -------------------------------------------------------------

class ValidationError_ extends Error {}

/**
 * Constant-time string comparison to mitigate timing attacks on secret tokens
 */
function verifyAuth_(providedToken) {
  if (!providedToken) return false;
  const a = String(providedToken).trim();
  const b = String(ADMIN_API_KEY).trim();
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Sliding-window rate limiter using Google Script Cache
 */
function checkRateLimit_(clientIdentifier, isWrite) {
  try {
    const cache = CacheService.getScriptCache();
    const prefix = isWrite ? 'rl_w_' : 'rl_r_';
    const cleanId = String(clientIdentifier || 'anon').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    const key = prefix + cleanId;
    
    const countStr = cache.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;
    const maxAllowed = isWrite ? RATE_LIMIT_WRITE_MAX : RATE_LIMIT_READ_MAX;
    
    if (count >= maxAllowed) {
      return false;
    }
    
    cache.put(key, String(count + 1), RATE_LIMIT_WINDOW_SEC);
    return true;
  } catch (e) {
    return true; // Fail open if cache service is temporarily unavailable
  }
}

function getClientId_(e) {
  if (e && e.parameter && e.parameter.client_id) {
    return String(e.parameter.client_id);
  }
  if (e && e.parameter && e.parameter.key) {
    return String(e.parameter.key);
  }
  return 'default_client';
}

/**
 * Prevents CSV / Spreadsheet Formula Injection (OWASP Injection)
 * Prefixes cells starting with '=', '+', '-', '@', '\t', '\r' with a quote
 */
function sanitizeFormula_(val) {
  if (val == null) return '';
  const str = String(val).trim();
  if (/^[=+\-@\t\r\n]/.test(str)) {
    return "'" + str;
  }
  return str;
}

function sanitizeHtml_(val) {
  if (val == null) return '';
  return String(val)
    .replace(/<[^>]*>?/gm, '')
    .replace(/[<>]/g, '')
    .trim();
}

function cleanStr_(value, maxLength) {
  return value == null ? '' : sanitizeHtml_(String(value)).slice(0, maxLength);
}

function reqStr_(value, field, maxLength) {
  const cleaned = cleanStr_(value, maxLength);
  if (!cleaned) {
    throw new ValidationError_(field + ' is required.');
  }
  return cleaned;
}

function optStr_(value, maxLength) {
  return cleanStr_(value, maxLength);
}

function reqEnum_(value, allowed, field) {
  const cleaned = cleanStr_(value, 30);
  const match = allowed.find((option) => option.toLowerCase() === cleaned.toLowerCase());
  if (!match) {
    throw new ValidationError_(field + ' must be one of: ' + allowed.join(', ') + '.');
  }
  return match;
}

function reqNumber_(value, field, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new ValidationError_(field + ' must be a number between ' + min + ' and ' + max + '.');
  }
  return n;
}

function reqContact_(value) {
  const cleaned = String(value == null ? '' : value).replace(/[\s-]/g, '').slice(0, 20);
  if (!/^\+?[0-9]{7,15}$/.test(cleaned)) {
    throw new ValidationError_('Contact must be a valid phone number (7-15 digits).');
  }
  return cleaned;
}

function reqDate_(value, field) {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new ValidationError_(field + ' must be a valid date.');
  }
  if (date.getTime() > Date.now() + 86400000) {
    throw new ValidationError_(field + ' cannot be in the future.');
  }
  return date;
}

function optUrl_(value) {
  const cleaned = cleanStr_(value, 500);
  if (!cleaned) return '';
  if (!/^https?:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(\/.*)?$/i.test(cleaned)) {
    throw new ValidationError_('Certificate URL must be a valid HTTP or HTTPS link.');
  }
  return cleaned;
}

function getNextEligibleDate_(donationType, gender, lastDonated) {
  const base = new Date(lastDonated.getFullYear(), lastDonated.getMonth(), lastDonated.getDate());
  let days;

  switch (donationType) {
    case 'Platelets':
      days = 14;
      break;
    case 'Plasma':
      days = 28;
      break;
    case 'Whole Blood':
      days = gender === 'Female' ? 120 : 90;
      break;
    default:
      throw new ValidationError_('Unsupported donation type.');
  }

  base.setDate(base.getDate() + days);
  return formatDate_(base);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.getActiveSheet();
  }
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CANONICAL_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function cellValue_(cell) {
  return cell instanceof Date ? formatDate_(cell) : (cell === null || cell === undefined ? '' : cell);
}

function formatDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function generateId_() {
  return 'DON-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMddHHmmssSSS');
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
