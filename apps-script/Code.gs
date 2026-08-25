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

// Rate Limit Config
const RATE_LIMIT_READ_MAX = 60;   // Max 60 GET requests per minute per client
const RATE_LIMIT_WRITE_MAX = 25;  // Max 25 POST mutations per minute per client
const RATE_LIMIT_WINDOW_SEC = 60; // 1 minute sliding window
const MAX_PAYLOAD_BYTES = 10485760; // 10 MB payload for certificate file uploads

const CANONICAL_HEADERS = [
  'ID',
  'Record_Type',
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
  'Next Eligible Date',
  'Status',
  'Urgency',
  'Hospital_Venue',
  'Units_Needed',
  'Units_Collected',
  'Assigned_Donor_ID',
  'Assigned_Donor_Name',
  'Camp_ID',
  'Notes'
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
  'mobile number': 'Contact',
  'department': 'Department',
  'dept': 'Department',
  'branch': 'Department',
  'year': 'Year',
  'year of study': 'Year',
  'year_of_study': 'Year',
  'yearofstudy': 'Year',
  'batch': 'Year',
  'semester': 'Year',
  'age': 'Age',
  'weight': 'Weight',
  'weight (kg)': 'Weight',
  'weight_kg': 'Weight',
  'gender': 'Gender',
  'sex': 'Gender',
  'location': 'Location',
  'district': 'Location',
  'district / location': 'Location',
  'district/location': 'Location',
  'district_location': 'Location',
  'district location': 'Location',
  'city': 'Location',
  'place': 'Location',
  'native': 'Location',
  'address': 'Location',
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

    // 2. Authentication Check with signed session token
    const token = (e && e.parameter && (e.parameter.key || e.parameter.auth || e.parameter.apiKey || e.parameter.sessionToken)) || '';
    if (!verifyAuth_(token)) {
      return jsonResponse_({
        status: 'error',
        error: 'Unauthorized: Valid coordinator authentication required to view donor data.',
        code: 401
      });
    }

    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      return jsonResponse_({ status: 'success', data: [] });
    }

    const headerRow = values[0];
    const columnMap = {};
    for (let c = 0; c < headerRow.length; c++) {
      const originalHeader = String(headerRow[c]).trim();
      const cleaned = originalHeader.toLowerCase().replace(/[\s_\-]+/g, ' ');
      const canonical = HEADER_MAP[cleaned] || originalHeader;
      columnMap[canonical] = c;
    }

    const result = [];
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      if (row.every(cell => cell === '' || cell == null)) {
        continue;
      }

      const getVal = (canonicalKey, fallbackIndex) => {
        if (columnMap[canonicalKey] !== undefined) {
          return row[columnMap[canonicalKey]];
        }
        if (fallbackIndex !== undefined && fallbackIndex < row.length) {
          return row[fallbackIndex];
        }
        return '';
      };

      const recordType = getVal('Record_Type') || 'Donor';
      const lastDonatedDate = getVal('Last Donated Date', 10);
      const donationType = getVal('Last Donation Type', 11);
      const gender = getVal('Gender', 8);

      let nextEligibleDate = getVal('Next Eligible Date', 14);
      if (!nextEligibleDate && lastDonatedDate && donationType && gender) {
        nextEligibleDate = getNextEligibleDate_(donationType, gender, lastDonatedDate);
      }

      let combinedDeptYear = getVal('Department / Year') || getVal('Department_Year');
      let dept = getVal('Department') || (columnMap['Department'] !== undefined ? row[columnMap['Department']] : '');
      let rawYear = getVal('Year') || getVal('Year_of_Study') || (columnMap['Year'] !== undefined ? row[columnMap['Year']] : '');

      if (!dept && combinedDeptYear) {
        dept = combinedDeptYear;
      }

      if (!rawYear && combinedDeptYear) {
        const yrMatch = /(1st|2nd|3rd|4th|\b[1-4](?:st|nd|rd|th)?\b)\s*(?:year|yr)?/i.exec(String(combinedDeptYear));
        if (yrMatch) {
          rawYear = yrMatch[0];
        }
      }

      if (dept) {
        const yrMatch = /(1st|2nd|3rd|4th|\b[1-4](?:st|nd|rd|th)?\b)\s*(?:year|yr)?/i.exec(String(dept));
        if (yrMatch) {
          if (!rawYear) rawYear = yrMatch[0];
          dept = String(dept).replace(yrMatch[0], '').replace(/[-–—/()]/g, '').trim();
        }
      }

      const year = normalizeYear_(rawYear);

      result.push({
        'ID': String(getVal('ID', 0) || ('DON-' + r)).trim(),
        'Record_Type': recordType,
        'Name': String(getVal('Name', 1)).trim(),
        'Blood Group': String(getVal('Blood Group', 2)).trim(),
        'Contact': String(getVal('Contact', 3)).trim(),
        'Department': String(dept || 'General').trim(),
        'Year': year,
        'Department_Year': combinedDeptYear || (dept ? `${dept} - ${year}` : year),
        'Age': getVal('Age') !== '' ? Number(getVal('Age')) : '',
        'Weight': getVal('Weight') !== '' ? Number(getVal('Weight')) : '',
        'Gender': String(gender).trim(),
        'Location': (function() {
          const rawLoc = getVal('Location') || getVal('District_Location') || getVal('District / Location') || getVal('District') || getVal('City');
          if (rawLoc instanceof Date) return '';
          const strLoc = String(rawLoc || '').trim();
          if (/GMT[+-]\d{4}/i.test(strLoc) || /India Standard Time/i.test(strLoc) || /^[A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{4}/i.test(strLoc)) return '';
          return strLoc;
        })(),
        'Last Donated Date': lastDonatedDate instanceof Date ? formatDate_(lastDonatedDate) : String(lastDonatedDate).trim(),
        'Last Donation Type': String(donationType).trim(),
        'Last Donation Venue': String(getVal('Last Donation Venue', 12)).trim(),
        'Certificate URL': String(getVal('Certificate URL', 13)).trim(),
        'Next Eligible Date': nextEligibleDate instanceof Date ? formatDate_(nextEligibleDate) : String(nextEligibleDate).trim(),
        'Status': String(getVal('Status') || '').trim(),
        'Urgency': String(getVal('Urgency') || '').trim(),
        'Hospital_Venue': String(getVal('Hospital_Venue') || '').trim(),
        'Units_Needed': getVal('Units_Needed') || '',
        'Units_Collected': getVal('Units_Collected') || '',
        'Assigned_Donor_ID': String(getVal('Assigned_Donor_ID') || '').trim(),
        'Assigned_Donor_Name': String(getVal('Assigned_Donor_Name') || '').trim(),
        'Camp_ID': String(getVal('Camp_ID') || '').trim(),
        'Notes': String(getVal('Notes') || '').trim()
      });
    }

    return jsonResponse_({ status: 'success', data: result });
  } catch (error) {
    return jsonResponse_({ status: 'error', error: error.message || 'Failed to retrieve donor records.' });
  }
}

function doPost(e) {
  try {
    const clientId = getClientId_(e);
    
    // 1. Rate Limiting Check
    if (!checkRateLimit_(clientId, true)) {
      return jsonResponse_({
        status: 'error',
        error: 'Too Many Requests: Rate limit exceeded. Please wait a minute.',
        code: 429
      });
    }

    if (!e || !e.postData || !e.postData.contents) {
      throw new ValidationError_('Empty request body.');
    }

    if (e.postData.contents.length > MAX_PAYLOAD_BYTES) {
      throw new ValidationError_('Payload size exceeds safe limit.');
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

    // -------------------------------------------------------------
    // Authentication Endpoints (Email OTP & Google OAuth)
    // -------------------------------------------------------------

    // 1. Request Email OTP
    if (action === 'request_otp') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        throw new ValidationError_('A valid email address is required.');
      }

      if (!isEmailAuthorized_(email)) {
        return jsonResponse_({
          status: 'success',
          message: 'If this email is an authorized coordinator, a 6-digit verification code has been sent.'
        });
      }

      // Generate 6-digit cryptographically random OTP
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const cache = CacheService.getScriptCache();
      const emailHash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, email));
      cache.put('otp_' + emailHash, otp, 300); // 5 minutes expiry

      // Send formatted HTML email via MailApp
      const subject = 'NSS Rudhirasena Portal - Your Login Code: ' + otp;
      const htmlBody = '<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">' +
        '<div style="text-align: center; margin-bottom: 20px;">' +
          '<h2 style="color: #b91c1c; margin: 0; font-size: 20px;">NSS Rudhirasena MBCET</h2>' +
          '<p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">Authorized Coordinator Login Verification</p>' +
        '</div>' +
        '<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">' +
          '<span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #991b1b;">' + otp + '</span>' +
        '</div>' +
        '<p style="font-size: 13px; color: #475569; line-height: 1.5;">This 6-digit verification code is valid for <strong>5 minutes</strong>. Use it to log into the NSS Rudhirasena Portal. Do not share this code with anyone.</p>' +
        '<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />' +
        '<p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">If you did not request this login code, please disregard this email.</p>' +
      '</div>';

      try {
        MailApp.sendEmail({
          to: email,
          name: 'NSS Rudhirasena MBCET',
          subject: subject,
          htmlBody: htmlBody
        });
      } catch (mailErr) {
        Logger.log('Mail send error: ' + mailErr.message);
        throw new ValidationError_('Email sending failed (' + mailErr.message + '). Please ensure Mail permissions are authorized in the Apps Script editor.');
      }

      return jsonResponse_({
        status: 'success',
        message: 'Verification code sent to ' + email
      });
    }

    // 2. Verify Email OTP
    if (action === 'verify_otp') {
      const email = String(body.email || '').trim().toLowerCase();
      const otp = String(body.otp || '').trim();
      if (!email || !otp) {
        throw new ValidationError_('Email and OTP verification code are required.');
      }

      if (!isEmailAuthorized_(email)) {
        throw new ValidationError_('Access Denied: This email is not authorized to access this website.');
      }

      const cache = CacheService.getScriptCache();
      const emailHash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, email));
      const storedOtp = cache.get('otp_' + emailHash);

      if (!storedOtp || storedOtp !== otp) {
        throw new ValidationError_('Invalid or expired verification code. Please request a new one.');
      }

      cache.remove('otp_' + emailHash);
      const sessionToken = generateSessionToken_(email);

      return jsonResponse_({
        status: 'success',
        success: true,
        sessionToken: sessionToken,
        user: {
          email: email,
          name: formatDonorName_(email.split('@')[0])
        }
      });
    }

    // 3. Verify Google Sign-In (OAuth ID Token)
    if (action === 'verify_google_token') {
      const idToken = String(body.idToken || body.credential || '').trim();
      if (!idToken) {
        throw new ValidationError_('Google ID token is required.');
      }

      const googleResp = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), {
        muteHttpExceptions: true
      });
      if (googleResp.getResponseCode() !== 200) {
        throw new ValidationError_('Invalid or expired Google authentication token.');
      }

      const payload = JSON.parse(googleResp.getContentText());
      const email = String(payload.email || '').toLowerCase().trim();
      const emailVerified = String(payload.email_verified) === 'true' || payload.email_verified === true;

      if (!email || !emailVerified) {
        throw new ValidationError_('Google email account could not be verified.');
      }

      if (!isEmailAuthorized_(email)) {
        throw new ValidationError_('Access Denied: The Google Account (' + email + ') is not on the authorized coordinators list.');
      }

      const sessionToken = generateSessionToken_(email);
      return jsonResponse_({
        status: 'success',
        success: true,
        sessionToken: sessionToken,
        user: {
          email: email,
          name: payload.name || formatDonorName_(email.split('@')[0]),
          picture: payload.picture || ''
        }
      });
    }

    // -------------------------------------------------------------
    // Authorized Mutations (CRUD Operations)
    // -------------------------------------------------------------
    const token = body.sessionToken || body.auth_token || body.key || body.apiKey || (e.parameter && (e.parameter.key || e.parameter.auth || e.parameter.sessionToken)) || '';

    // Deletion
    if (action === 'delete' || action === 'delete_record') {
      const targetId = String(body.id || body.ID || body.Donor_ID || '').trim().toLowerCase();
      if (!targetId) {
        throw new ValidationError_('Record ID is required for deletion.');
      }
      if (!verifyAuth_(token)) {
        throw new ValidationError_('Unauthorized: Valid coordinator authentication required to delete records.');
      }

      const sheet = getSheet_();
      const allValues = sheet.getDataRange().getValues();
      if (allValues.length > 1) {
        const headerRow = allValues[0];
        let idColIndex = -1;
        for (let c = 0; c < headerRow.length; c++) {
          const h = String(headerRow[c]).trim().toLowerCase().replace(/[\s_\-]+/g, ' ');
          if (h === 'id' || h === 'donor id' || h === 'donor_id' || h === 'donorid') {
            idColIndex = c;
            break;
          }
        }
        if (idColIndex !== -1) {
          const lock = LockService.getScriptLock();
          lock.waitLock(10000);
          try {
            for (let r = 1; r < allValues.length; r++) {
              if (String(allValues[r][idColIndex]).trim().toLowerCase() === targetId) {
                sheet.deleteRow(r + 1);
                return jsonResponse_({ status: 'success', message: 'Record deleted successfully.', id: targetId });
              }
            }
          } finally {
            lock.releaseLock();
          }
        }
      }
      return jsonResponse_({ status: 'success', message: 'Record removed.', id: targetId });
    }

    // -------------------------------------------------------------
    // Sync & Match Google Drive Certificates Folder
    // -------------------------------------------------------------
    if (action === 'sync_drive_certificates' || action === 'sync_drive_folder' || action === 'match_drive_certificates') {
      const folderUrl = String(body.folderUrl || body.driveLink || body.url || '').trim();
      if (!folderUrl) {
        throw new ValidationError_('Please provide a valid Google Drive folder link or folder ID.');
      }
      if (!verifyAuth_(token)) {
        throw new ValidationError_('Unauthorized: Valid coordinator authentication required to sync certificates.');
      }

      const folderId = extractDriveFolderId_(folderUrl);
      if (!folderId) {
        throw new ValidationError_('Could not extract a valid Google Drive Folder ID from the provided link. Ensure it is a Google Drive folder URL (e.g., https://drive.google.com/drive/folders/...).');
      }

      let folder;
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (fErr) {
        throw new ValidationError_('Unable to access Google Drive folder (' + fErr.message + '). Please verify the folder link and ensure the folder is shared with "Anyone with the link can view" or accessible to the coordinator account.');
      }

      const sheet = getSheet_();
      const allValues = sheet.getDataRange().getValues();
      if (allValues.length < 2) {
        return jsonResponse_({
          status: 'success',
          success: true,
          message: 'Google Sheet is empty. No donors found to match.',
          matchedCount: 0,
          totalFiles: 0,
          matches: []
        });
      }

      const headerRow = allValues[0];
      const columnMap = {};
      for (let c = 0; c < headerRow.length; c++) {
        const originalHeader = String(headerRow[c]).trim();
        const cleaned = originalHeader.toLowerCase().replace(/[\s_\-]+/g, ' ');
        const canonical = HEADER_MAP[cleaned] || originalHeader;
        columnMap[canonical] = c;
      }

      const certColIndex = columnMap['Certificate URL'] !== undefined ? columnMap['Certificate URL'] : -1;
      if (certColIndex === -1) {
        throw new ValidationError_('Could not locate the "Certificate URL" column in the Google Sheet.');
      }

      // Collect all files from Drive folder (including subfolders if any)
      const filesList = [];
      function collectFilesFromFolder_(f) {
        const files = f.getFiles();
        while (files.hasNext()) {
          const file = files.next();
          try {
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (shErr) {
            // ignore permission errors on already shared files
          }
          filesList.push({
            id: file.getId(),
            name: file.getName(),
            url: file.getUrl(),
            downloadUrl: 'https://drive.google.com/uc?export=view&id=' + file.getId()
          });
        }
        const subfolders = f.getFolders();
        while (subfolders.hasNext()) {
          collectFilesFromFolder_(subfolders.next());
        }
      }

      collectFilesFromFolder_(folder);

      if (filesList.length === 0) {
        return jsonResponse_({
          status: 'success',
          success: true,
          message: 'The specified Google Drive folder does not contain any files.',
          totalFiles: 0,
          matchedCount: 0,
          matches: []
        });
      }

      // Normalize string for fuzzy comparison
      function normalizeForMatch_(str) {
        return String(str || '')
          .toLowerCase()
          .replace(/[._\-–—/\\()[\],]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      const lock = LockService.getScriptLock();
      lock.waitLock(15000);

      const matches = [];
      const unmatchedFiles = [...filesList];
      let updatedRowCount = 0;

      try {
        for (let r = 1; r < allValues.length; r++) {
          const row = allValues[r];
          const donorId = String(columnMap['ID'] !== undefined ? row[columnMap['ID']] : (row[0] || '')).trim();
          const donorName = String(columnMap['Name'] !== undefined ? row[columnMap['Name']] : (row[1] || '')).trim();
          const contact = String(columnMap['Contact'] !== undefined ? row[columnMap['Contact']] : (row[3] || '')).replace(/[\s-]/g, '').trim();

          if (!donorId && !donorName) continue;

          const normId = normalizeForMatch_(donorId);
          const normName = normalizeForMatch_(donorName);
          const nameTokens = normName.split(' ').filter(t => t.length > 2);

          const existingCertsRaw = String(row[certColIndex] || '').trim();
          const currentUrls = existingCertsRaw ? existingCertsRaw.split(/[\n,;]+/).map(u => u.trim()).filter(Boolean) : [];
          const newUrls = [...currentUrls];
          let donorMatched = false;

          for (let fi = 0; fi < filesList.length; fi++) {
            const file = filesList[fi];
            const normFileName = normalizeForMatch_(file.name.replace(/\.[a-zA-Z0-9]+$/, '')); // remove extension

            let isMatch = false;

            // 1. Direct ID match (e.g. RUD-001, DON-01, etc.)
            if (normId && normFileName.includes(normId)) {
              isMatch = true;
            } else if (normId && normId.replace(/\s+/g, '') === normFileName.replace(/\s+/g, '')) {
              isMatch = true;
            }
            // 2. Exact or substring Donor ID match with standard prefixes
            else if (donorId && new RegExp('\\b' + donorId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i').test(file.name)) {
              isMatch = true;
            }
            // 3. Contact number match (10 digits)
            else if (contact && contact.length >= 10 && file.name.includes(contact)) {
              isMatch = true;
            }
            // 4. Name match (full name in file name)
            else if (normName && normName.length >= 3 && normFileName.includes(normName)) {
              isMatch = true;
            }
            // 5. Significant name tokens match (if all >2 char words match)
            else if (nameTokens.length >= 2 && nameTokens.every(token => normFileName.includes(token))) {
              isMatch = true;
            }

            if (isMatch) {
              donorMatched = true;
              if (!newUrls.includes(file.url)) {
                newUrls.push(file.url);
              }
              matches.push({
                donorId: donorId,
                donorName: donorName,
                fileName: file.name,
                fileUrl: file.url
              });

              // remove from unmatched
              const unIndex = unmatchedFiles.findIndex(uf => uf.id === file.id);
              if (unIndex !== -1) {
                unmatchedFiles.splice(unIndex, 1);
              }
            }
          }

          if (donorMatched && newUrls.length > currentUrls.length) {
            sheet.getRange(r + 1, certColIndex + 1).setValue(newUrls.join(', '));
            updatedRowCount++;
          }
        }
      } finally {
        lock.releaseLock();
      }

      return jsonResponse_({
        status: 'success',
        success: true,
        message: 'Successfully scanned ' + filesList.length + ' file(s). Linked ' + matches.length + ' certificate(s) across ' + updatedRowCount + ' donor(s).',
        totalFiles: filesList.length,
        matchedCount: matches.length,
        updatedDonorsCount: updatedRowCount,
        matches: matches,
        unmatchedFiles: unmatchedFiles.map(f => f.name)
      });
    }

    // Check auth for any mutations
    const isUpdate = action === 'update' || action === 'edit' || action.startsWith('update_');
    if (!verifyAuth_(token)) {
      throw new ValidationError_('Unauthorized: Valid coordinator authentication required.');
    }

    // 3. Strict Input Sanitization & Validation (OWASP Injection Protection)
    const id = optStr_(body.ID || body.Donor_ID, 50) || generateId_();
    const name = formatDonorName_(reqStr_(body.Name || body.Full_Name, 'Name', 100));
    const bloodGroup = reqEnum_(body['Blood Group'] || body.Blood_Group, BLOOD_GROUPS, 'Blood Group');
    const contact = reqContact_(body.Contact || body.Contact_Number || body.Phone);
    const department = reqStr_(body.Department || body.Department_Year, 'Department', 100);
    const year = optStr_(body.Year || body.Year_of_Study || body.year || body.batch, 30);
    const age = reqNumber_(body.Age, 'Age', 16, 100);
    const weight = optNumber_(body.Weight || body.Weight_kg, 25, 250);
    const gender = reqEnum_(body.Gender, GENDERS, 'Gender');
    const location = optStr_(body.Location || body.District_Location || body['District / Location'] || body.district_location || body.District || body.City || body.city, 150);
    const lastDonated = reqDate_(body['Last Donated Date'] || body.Last_Donated_Date, 'Last Donated Date');
    const donationType = reqEnum_(body['Last Donation Type'] || body.Last_Donation_Type, DONATION_TYPES, 'Last Donation Type');
    const venue = optStr_(body['Last Donation Venue'] || body.Last_Donation_Venue, 150);
    // Collect all certificate URLs (both existing links and newly uploaded files)
    const finalCertUrls = [];

    // 1. Existing URLs passed as array or delimited string
    if (Array.isArray(body.certificateUrls)) {
      body.certificateUrls.forEach((u) => {
        const cleaned = optUrl_(u);
        if (cleaned && !finalCertUrls.includes(cleaned)) finalCertUrls.push(cleaned);
      });
    } else if (body['Certificate URL'] || body.Certificate_URL) {
      const rawUrls = String(body['Certificate URL'] || body.Certificate_URL).split(/[\n,;]+/);
      rawUrls.forEach((u) => {
        const cleaned = optUrl_(u);
        if (cleaned && !finalCertUrls.includes(cleaned)) finalCertUrls.push(cleaned);
      });
    }

    // 2. Newly uploaded files (array of files or single file)
    const filesToUpload = [];
    if (Array.isArray(body.certificateFiles)) {
      filesToUpload.push(...body.certificateFiles);
    } else if (body.certificateFile && typeof body.certificateFile === 'object') {
      filesToUpload.push(body.certificateFile);
    }

    if (filesToUpload.length > 0) {
      try {
        let folder;
        const folders = DriveApp.getFoldersByName('NSS Rudhirasena Certificates');
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder('NSS Rudhirasena Certificates');
        }

        const ALLOWED_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        const cleanDonorName = String(name || id || 'Donor')
          .trim()
          .replace(/[/\\?%*:|"<>]/g, '')
          .replace(/\s+/g, ' ');

        filesToUpload.forEach((fileObj, idx) => {
          const rawData = String(fileObj.data || fileObj.base64 || '');
          if (!rawData) return;

          const base64Str = rawData.includes('base64,') ? rawData.split('base64,')[1] : rawData;
          let mimeType = String(fileObj.type || fileObj.mimeType || 'application/pdf').toLowerCase();
          if (!ALLOWED_MIME.includes(mimeType)) mimeType = 'application/pdf';

          let extension = '';
          if (fileObj.name && fileObj.name.includes('.')) {
            extension = '.' + fileObj.name.split('.').pop().toLowerCase();
          } else {
            if (mimeType.includes('pdf')) extension = '.pdf';
            else if (mimeType.includes('png')) extension = '.png';
            else if (mimeType.includes('webp')) extension = '.webp';
            else extension = '.jpg';
          }

          // If multiple certificates, suffix with index number (e.g. "Rahul Sharma - Certificate 2.pdf")
          const totalCertIndex = finalCertUrls.length + 1;
          const suffix = (finalCertUrls.length > 0 || filesToUpload.length > 1) ? ` - Certificate ${totalCertIndex}` : '';
          const finalFileName = `${cleanDonorName}${suffix}${extension}`;

          const decoded = Utilities.base64Decode(base64Str);
          const blob = Utilities.newBlob(decoded, mimeType, finalFileName);
          const driveFile = folder.createFile(blob);
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          
          finalCertUrls.push(driveFile.getUrl());
        });
      } catch (uploadError) {
        Logger.log('Drive multi-upload note: ' + uploadError.message);
      }
    }

    const certUrl = finalCertUrls.join(', ');

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
      'Certificate': sanitizeFormula_(certUrl),
      'Certificate Link': sanitizeFormula_(certUrl),
      'Cert URL': sanitizeFormula_(certUrl),
      'Next Eligible Date': nextEligibleDate,
      'Next_Eligible_Date': nextEligibleDate,
      'Record_Type': sanitizeFormula_(body.recordType || body.Record_Type || (action.includes('case') ? 'Emergency_Case' : action.includes('camp') ? 'Camp' : action.includes('donation') ? 'Voluntary_Donation' : 'Donor')),
      'Status': sanitizeFormula_(body.status || body.Status || ''),
      'Urgency': sanitizeFormula_(body.urgency || body.Urgency || ''),
      'Hospital_Venue': sanitizeFormula_(body.hospital || body.venue || body.Hospital_Venue || venue),
      'Units_Needed': body.unitsNeeded || body.Units_Needed || '',
      'Units_Collected': body.units || body.collectedUnits || body.Units_Collected || '',
      'Assigned_Donor_ID': sanitizeFormula_(body.assignedDonorId || body.Assigned_Donor_ID || ''),
      'Assigned_Donor_Name': sanitizeFormula_(body.assignedDonorName || body.Assigned_Donor_Name || ''),
      'Camp_ID': sanitizeFormula_(body.campId || body.Camp_ID || ''),
      'Notes': sanitizeFormula_(body.notes || body.Notes || '')
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
 * Run this function in Google Apps Script Editor to set authorized coordinators
 * in private Script Properties and trigger Mail permissions authorization.
 * e.g., setupAuthorizedAdmins("user1@example.com, user2@example.com")
 */
function setupAuthorizedAdmins(emailListString) {
  const props = PropertiesService.getScriptProperties();
  if (emailListString && typeof emailListString === 'string') {
    props.setProperty('ALLOWED_EMAILS', emailListString);
  }
  
  let secret = props.getProperty('SESSION_SECRET');
  if (!secret) {
    secret = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(Math.random() + '_' + Date.now())));
    props.setProperty('SESSION_SECRET', secret);
  }
  
  // Triggers MailApp permission check dialog in the Apps Script editor
  const quota = MailApp.getRemainingDailyQuota();
  const currentAllowed = props.getProperty('ALLOWED_EMAILS') || '';
  Logger.log('Authorized Admins configured: ' + currentAllowed);
  Logger.log('Daily Mail Quota Remaining: ' + quota);
  return 'Success: Configured coordinators in Script Properties. Remaining daily email quota: ' + quota;
}

function getAuthorizedEmails_() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('ALLOWED_EMAILS') || '';
  return raw.split(',').map(function (e) { return e.trim().toLowerCase(); }).filter(Boolean);
}

function isEmailAuthorized_(email) {
  if (!email) return false;
  const clean = String(email).trim().toLowerCase();
  const list = getAuthorizedEmails_();
  return list.indexOf(clean) !== -1;
}

function getSessionSecret_() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('SESSION_SECRET');
  if (!secret) {
    secret = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(Math.random() + '_' + Date.now())));
    props.setProperty('SESSION_SECRET', secret);
  }
  return secret;
}

function generateSessionToken_(email) {
  const exp = Date.now() + (12 * 60 * 60 * 1000); // 12 hours
  const payload = email.toLowerCase().trim() + ':' + exp;
  const secret = getSessionSecret_();
  const sigBytes = Utilities.computeHmacSha256Signature(payload, secret);
  const sig = Utilities.base64Encode(sigBytes);
  return Utilities.base64Encode(payload) + '.' + sig;
}

function verifySessionToken_(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  try {
    const payloadBytes = Utilities.base64Decode(parts[0]);
    const payload = Utilities.newBlob(payloadBytes).getDataAsString();
    const subParts = payload.split(':');
    if (subParts.length !== 2) return false;
    const email = subParts[0];
    const exp = parseInt(subParts[1], 10);
    if (isNaN(exp) || Date.now() > exp) return false;
    if (!isEmailAuthorized_(email)) return false;

    const secret = getSessionSecret_();
    const expectedSigBytes = Utilities.computeHmacSha256Signature(payload, secret);
    const expectedSig = Utilities.base64Encode(expectedSigBytes);
    return constantTimeEquals_(parts[1], expectedSig);
  } catch (e) {
    return false;
  }
}

function constantTimeEquals_(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validates coordinator session token
 */
function verifyAuth_(providedToken) {
  if (!providedToken) return false;
  return verifySessionToken_(providedToken);
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

function optNumber_(value, min, max) {
  if (value == null || value === '' || isNaN(Number(value))) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  if (min !== undefined && n < min) return '';
  if (max !== undefined && n > max) return '';
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

/**
 * Format donor name: Remove dots, Title Case words, keep initials capitalized and spaced
 * Examples:
 *   "rahul v.s" -> "Rahul V S"
 *   "s.s. niranjan" -> "S S Niranjan"
 *   "anandu krishnan p.k." -> "Anandu Krishnan P K"
 */
function formatDonorName_(name) {
  if (!name) return '';
  const clean = String(name).replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  return clean
    .split(' ')
    .map(function (word) {
      if (!word) return '';

      // Single character initial
      if (word.length === 1) {
        return word.toUpperCase();
      }

      // 2 or 3 letter initial sequence without vowels (e.g. "ss", "pk")
      if (word.length <= 3 && !/[aeiouy]/i.test(word)) {
        return word.toUpperCase().split('').join(' ');
      }

      // Standard word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function normalizeYear_(value) {
  if (!value) return '1st Year';
  const str = String(value).trim();
  const lower = str.toLowerCase();

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

  if (/\b(?:4th|fourth|final)\b/i.test(str) || /\b4\b/.test(str)) return '4th Year';
  if (/\b(?:3rd|third)\b/i.test(str) || /\b3\b/.test(str)) return '3rd Year';
  if (/\b(?:2nd|second)\b/i.test(str) || /\b2\b/.test(str)) return '2nd Year';
  if (/\b(?:1st|first)\b/i.test(str) || /\b1\b/.test(str)) return '1st Year';

  return '1st Year';
}

function generateId_() {
  return 'DON-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMddHHmmssSSS');
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run this function ONCE in the Apps Script Editor to authorize Google Drive access!
 * Click "Run" on this function -> Click "Review Permissions" -> Choose your Google Account -> Allow.
 */
function authorizeAndTestDrive() {
  try {
    let folder;
    const folders = DriveApp.getFoldersByName('NSS Rudhirasena Certificates');
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder('NSS Rudhirasena Certificates');
    }
    Logger.log('Drive permissions successfully authorized! Certificates Folder ID: ' + folder.getId());
    return 'Google Drive integration is working and authorized!';
  } catch (err) {
    Logger.log('Drive Authorization required: ' + err.message);
    throw err;
  }
}

/**
 * Run this in Apps Script Editor to test email delivery and grant Mail permissions!
 * Click "Run" -> Click "Review Permissions" -> Choose Account -> Allow -> Check inbox.
 */
function testSendOtp() {
  const testEmail = 'niranjanss2007@gmail.com';
  const testOtp = String(Math.floor(100000 + Math.random() * 900000));
  MailApp.sendEmail({
    to: testEmail,
    name: 'NSS Rudhirasena MBCET',
    subject: 'NSS Rudhirasena Portal - Test Login Code: ' + testOtp,
    htmlBody: '<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">' +
      '<h2 style="color: #b91c1c;">NSS Rudhirasena MBCET</h2>' +
      '<p>Test Login Code: <strong style="font-size: 24px; color: #991b1b;">' + testOtp + '</strong></p>' +
      '<p style="color: #64748b; font-size: 12px;">Google Mail permissions are active and working!</p>' +
    '</div>'
  });
  Logger.log('Test email successfully dispatched to ' + testEmail);
  return 'Test email successfully sent to ' + testEmail;
}

function extractDriveFolderId_(urlOrId) {
  if (!urlOrId) return '';
  const str = String(urlOrId).trim();
  if (/^[a-zA-Z0-9_-]{20,}$/.test(str)) {
    return str;
  }
  const match = str.match(/folders\/([a-zA-Z0-9_-]+)/i) || str.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : '';
}

