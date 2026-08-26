/**
 * Google Drive URL & Certificate Auto-Organize Utilities
 */

/**
 * Extracts a Google Drive Folder ID from various URL formats or raw ID string
 */
export function extractDriveFolderId(input) {
  if (!input) return null;
  const str = String(input).trim();

  const folderMatch = /\/folders\/([a-zA-Z0-9_-]{15,})/.exec(str);
  if (folderMatch) return folderMatch[1];

  const idParamMatch = /[?&]id=([a-zA-Z0-9_-]{15,})/.exec(str);
  if (idParamMatch) return idParamMatch[1];

  if (/^[a-zA-Z0-9_-]{15,}$/.test(str)) {
    return str;
  }

  return null;
}

/**
 * Calculates Levenshtein edit distance between two strings
 */
export function levenshteinDistance(s1, s2) {
  const a = String(s1 || '').trim();
  const b = String(s2 || '').trim();
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Calculates normalized similarity ratio between 0 and 1
 */
export function calculateStringSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Cleans a filename / string to extract pure name tokens by stripping dates, camp titles, institutional names, and noise
 */
export function cleanNameToken(raw) {
  if (!raw) return '';
  let s = String(raw)
    // Strip file extensions (.pdf, .png, .jpg, .jpeg, .webp, .docx, .xlsx)
    .replace(/\.(pdf|png|jpe?g|webp|docx?|xlsx?)$/i, '')
    // Strip URLs
    .replace(/https?:\/\/[^\s,;]+/gi, ' ')
    // Strip full dates like 06/08/2026, 06-08-2026, 29/01/2026, 2026-08-06, 06.08.2026
    .replace(/\b\d{1,2}[\/\-_.]\d{1,2}[\/\-_.]\d{2,4}\b/g, ' ')
    .replace(/\b\d{4}[\/\-_.]\d{1,2}[\/\-_.]\d{1,2}\b/g, ' ')
    .replace(/\b(202[0-9]|203[0-9])\b/g, ' ') // standalone years
    // Strip parenthesized metadata like (B+), (O+), (CSE), (RCC), (Camp 1), (06/08/2026)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    // Strip institutional & event titles
    .replace(/\b(?:blood\s*donation\s*camp|blood\s*donation\s*drive|blood\s*donation|blood\s*bank|bloodbank|certificate|cert|participation|donor|donation|camp|drive|nss|rudhirasena|mbcet|rcc|general\s*hospital|medical\s*college|hospital|copy|final|draft|scanned|scan|signed|sign|duly|filled|verified|unit|whole\s*blood|form|response|responses|photo|image|img|pic|updated)\b/gi, ' ')
    // Strip punctuation & non-name symbols
    .replace(/[-_#@$!+*~`=|[\]{}()<>:;/?^&%,]/g, ' ')
    // Strip leading index numbers like "01 - " or "1. " or "59. "
    .replace(/^\s*\d+[\s.-]*/, '')
    // Strip trailing index numbers
    .replace(/[\s.-]*\d+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

/**
 * Normalizes a name string for comparison (diacritics stripped, lowercase, alphabets & single spaces only)
 */
export function normalizeName(name) {
  if (!name) return '';
  return cleanNameToken(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accent marks like À -> A
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * High-precision, order-independent match score between an Excel donor name and
 * a certificate filename token. The certificate is the source of truth.
 *
 * Returns 0..100 (scores >= 50 are treated as valid matches by the engine).
 *
 * Precision-first: a match requires the FULL significant name to agree (word
 * order, initials and small typos tolerated), or one name to be a clean subset
 * of the other. Two different people who merely share a first name (e.g.
 * "Arjun Menon" vs "Arjun Nair") must NOT match — that returns 0, so the donor
 * is marked absent rather than mapped to the wrong certificate.
 */
export function calculateNameMatchScore(donorName, candidateFilename) {
  const normDonor = normalizeName(donorName);
  const normCand = normalizeName(candidateFilename);

  if (!normDonor || !normCand) return 0;

  // 1. Exact normalized match
  if (normDonor === normCand) return 100;

  // 2. Compact match ignoring spaces — "Niranjan S S" vs "NIRANJAN SS",
  //    "R Harikrishnan" vs "R Hari Krishnan"
  const compactDonor = normDonor.replace(/\s+/g, '');
  const compactCand = normCand.replace(/\s+/g, '');
  if (compactDonor.length >= 3 && compactDonor === compactCand) return 99;

  const dTokens = normDonor.split(/\s+/).filter(Boolean);
  const cTokens = normCand.split(/\s+/).filter(Boolean);

  // 3. Token-sort exact match — reordered names e.g. "S S Niranjan" vs "Niranjan S S"
  if (
    dTokens.length > 0 &&
    dTokens.length === cTokens.length &&
    [...dTokens].sort().join(' ') === [...cTokens].sort().join(' ')
  ) {
    return 98;
  }

  // Split each name into real words (>= 2 letters) and single-letter initials
  const dWords = dTokens.filter((t) => t.length >= 2);
  const cWords = cTokens.filter((t) => t.length >= 2);
  const dInit = dTokens.filter((t) => t.length === 1);
  const cInit = cTokens.filter((t) => t.length === 1);

  // Need at least one real word on each side; initials-only is too ambiguous
  if (dWords.length === 0 || cWords.length === 0) return 0;

  // Two real words are "the same" if identical or a near-identical spelling (typos)
  const wordEq = (a, b) => a === b || calculateStringSimilarity(a, b) >= 0.86;

  // A word is "covered" by the other name if it equals one of its words, OR
  // matches one of its initials (first letter) — this expands "S" -> "Suresh".
  const coveredBy = (word, words, inits) =>
    words.some((x) => wordEq(word, x)) || inits.some((i) => i === word[0]);

  const dAll = dWords.every((w) => coveredBy(w, cWords, cInit));
  const cAll = cWords.every((w) => coveredBy(w, dWords, dInit));

  // 4. Every real word on both sides agrees -> same person
  if (dAll && cAll) {
    return dWords.length >= 2 || cWords.length >= 2 ? 95 : 90;
  }

  // Real words shared by both names
  const sharedWords = dWords.filter((w) => cWords.some((x) => wordEq(w, x)));

  // 5. One name is a clean subset of the other with >= 2 real words in common
  //    (e.g. "Niranjan S" vs "Niranjan S Suresh")
  if ((dAll || cAll) && sharedWords.length >= 2) return 88;

  // 6. A single shared first name is accepted ONLY when neither side carries a
  //    competing distinct surname (i.e. it is just "first name + initials").
  //    This is what blocks "Arjun Menon" from matching "Arjun Nair".
  if (sharedWords.length === 1 && sharedWords[0].length >= 4) {
    const dExtraReal = dWords.some((w) => w.length >= 3 && !cWords.some((x) => wordEq(w, x)));
    const cExtraReal = cWords.some((w) => w.length >= 3 && !dWords.some((x) => wordEq(w, x)));
    if (!dExtraReal && !cExtraReal) return 80;
  }

  // Not confident enough. Certificate is the source of truth — prefer marking
  // the donor ABSENT over mapping them to the wrong certificate.
  return 0;
}

/**
 * Global 1-to-1 Bipartite Matcher
 * Guarantees that the highest-confidence matches are assigned first,
 * and every certificate file is assigned to at most ONE donor (no duplicates/collisions).
 */
export function performGlobalBipartiteMatching(activeMasterList = [], subfolders = [], manualAssignments = {}) {
  const safeList = Array.isArray(activeMasterList) ? activeMasterList : [];
  const safeSubfolders = Array.isArray(subfolders) ? subfolders : [];
  const safeManual = manualAssignments && typeof manualAssignments === 'object' ? manualAssignments : {};

  const assignedDonorIndexes = new Set();
  const claimedFiles = new Set(); // Set of "subfolderId:fileName"
  const donorMatchDetails = {}; // { [donorIndex]: { campId, certUrl, score, matchedFileName, matchType } }
  const subfolderItemsMap = {};

  // Initialize empty array for every subfolder
  safeSubfolders.forEach((sf, sfIdx) => {
    const sfId = sf?.id || `sub-${sfIdx + 1}`;
    subfolderItemsMap[sfId] = [];
  });

  if (safeList.length === 0) {
    return {
      campAssignments: safeSubfolders.map((sf, sfIdx) => ({
        campInfo: { ...sf, id: sf?.id || `sub-${sfIdx + 1}` },
        matchedDonors: [],
        detectedCount: 0,
        availableFiles: [],
      })),
      unmatched: [],
      totalMatched: 0,
      donorMatchDetails: {},
      subfolderItemsMap,
    };
  }

  // 1. Prepare indexed file lists for each subfolder
  safeSubfolders.forEach((sf, sfIdx) => {
    if (!sf) return;
    const sfId = sf.id || `sub-${sfIdx + 1}`;
    const items = [];
    const seenNames = new Set();

    // From detected Drive scan files
    if (Array.isArray(sf.detectedFiles) && sf.detectedFiles.length > 0) {
      sf.detectedFiles.forEach((f, fIdx) => {
        const name = String(f?.name || '').trim();
        const url = f?.url || '';
        const normKey = normalizeName(name);
        if (name && normKey && !seenNames.has(normKey)) {
          seenNames.add(normKey);
          items.push({
            id: f.id || `${sfId}-file-${fIdx}`,
            name,
            certUrl: url,
            subfolderId: sfId,
            uniqueKey: `${sfId}:${normKey}`,
          });
        }
      });
    }

    // From pasted text lines
    if (sf.namesText) {
      const textItems = extractNamesFromText(sf.namesText);
      textItems.forEach((ti, tIdx) => {
        const name = String(ti?.name || ti?.raw || '').trim();
        const normKey = normalizeName(name);
        if (name && normKey && !seenNames.has(normKey)) {
          seenNames.add(normKey);
          items.push({
            id: `${sfId}-text-${tIdx}`,
            name,
            certUrl: ti.certUrl || '',
            subfolderId: sfId,
            uniqueKey: `${sfId}:${normKey}`,
          });
        }
      });
    }

    subfolderItemsMap[sfId] = items;
  });

  // 2. Apply Manual Assignments Pass (User explicit overrides)
  safeList.forEach((donor, fallbackIdx) => {
    const idx = donor.index !== undefined ? donor.index : fallbackIdx;
    const donorName = donor.name || donor.Name || donor.Donor_Name || '';

    if (safeManual[idx] && safeManual[idx] !== 'excluded' && safeManual[idx] !== 'none' && safeManual[idx] !== '') {
      const targetCampId = safeManual[idx];
      const camp = safeSubfolders.find((s, sIdx) => (s.id || `sub-${sIdx + 1}`) === targetCampId);

      // Look for exact or fuzzy file match within target camp if possible
      let matchedFile = null;
      let highestScore = 0;
      const campFiles = subfolderItemsMap[targetCampId] || [];

      for (const f of campFiles) {
        if (!claimedFiles.has(f.uniqueKey)) {
          const s = calculateNameMatchScore(donorName, f.name);
          if (s > highestScore) {
            highestScore = s;
            matchedFile = f;
          }
        }
      }

      if (matchedFile && highestScore >= 50) {
        claimedFiles.add(matchedFile.uniqueKey);
      }

      const finalCert = matchedFile?.certUrl || donor.certificateUrl || camp?.driveUrl || '';

      donorMatchDetails[idx] = {
        campId: targetCampId,
        matchType: 'manual',
        certUrl: finalCert,
        matchedFileName: matchedFile?.name || '',
        score: highestScore > 0 ? highestScore : 100,
      };
      assignedDonorIndexes.add(idx);
    }
  });

  // 3. Generate all candidate (donor, file) scoring pairs
  const candidatePairs = [];

  safeList.forEach((donor, fallbackIdx) => {
    const dIdx = donor.index !== undefined ? donor.index : fallbackIdx;
    if (assignedDonorIndexes.has(dIdx)) return;
    const donorName = donor.name || donor.Name || donor.Donor_Name || '';
    if (!donorName) return;

    safeSubfolders.forEach((sf, sfIdx) => {
      const sfId = sf.id || `sub-${sfIdx + 1}`;
      const campFiles = subfolderItemsMap[sfId] || [];

      campFiles.forEach((file) => {
        if (claimedFiles.has(file.uniqueKey)) return;

        const score = calculateNameMatchScore(donorName, file.name);
        if (score >= 50) {
          candidatePairs.push({
            donorIndex: dIdx,
            donor,
            file,
            subfolderId: sfId,
            score,
          });
        }
      });
    });
  });

  // 4. Sort all candidate pairs globally by score in descending order
  candidatePairs.sort((a, b) => b.score - a.score);

  // 5. Greedy optimal 1-to-1 matching (Highest score wins first, no double claims)
  for (const pair of candidatePairs) {
    if (assignedDonorIndexes.has(pair.donorIndex)) continue;
    if (claimedFiles.has(pair.file.uniqueKey)) continue;

    // Lock in 1-to-1 assignment
    assignedDonorIndexes.add(pair.donorIndex);
    claimedFiles.add(pair.file.uniqueKey);

    donorMatchDetails[pair.donorIndex] = {
      campId: pair.subfolderId,
      matchType: 'certificate',
      certUrl: pair.file.certUrl || '',
      matchedFileName: pair.file.name,
      score: pair.score,
    };
  }

  // 6. Build final camp groupings
  const campAssignments = safeSubfolders.map((sf, sfIdx) => {
    const sfId = sf?.id || `sub-${sfIdx + 1}`;
    const campInfo = { ...sf, id: sfId };
    const matchedDonors = [];

    safeList.forEach((donor, fallbackIdx) => {
      const idx = donor.index !== undefined ? donor.index : fallbackIdx;
      const details = donorMatchDetails[idx];
      if (details && details.campId === sfId) {
        matchedDonors.push({
          ...donor,
          index: idx,
          certUrl: details.certUrl,
          matchType: details.matchType,
          matchScore: details.score,
          matchedFileName: details.matchedFileName,
        });
      }
    });

    return {
      campInfo,
      matchedDonors,
      detectedCount: (subfolderItemsMap[sfId] || []).length,
      availableFiles: subfolderItemsMap[sfId] || [],
    };
  });

  const unmatched = safeList.filter((d, fallbackIdx) => {
    const idx = d.index !== undefined ? d.index : fallbackIdx;
    return !assignedDonorIndexes.has(idx);
  });

  const totalMatched = assignedDonorIndexes.size;

  return {
    campAssignments,
    unmatched,
    totalMatched,
    donorMatchDetails,
    subfolderItemsMap,
  };
}

/**
 * Extracts donor names and certificate URLs from a pasted block of text or CSV
 */
export function extractNamesFromText(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  const seen = new Set();

  for (const line of lines) {
    // Check for URL in line
    const urlMatch = /(https?:\/\/[^\s,;]+)/.exec(line);
    const certUrl = urlMatch ? urlMatch[1] : '';

    let rawNameText = line;
    if (urlMatch) {
      rawNameText = line.replace(urlMatch[0], '').replace(/[,;\-–—]/g, ' ').trim();
    }

    const clean = cleanNameToken(rawNameText);
    const key = clean.toLowerCase();

    if (clean && !seen.has(key)) {
      seen.add(key);
      items.push({
        name: clean,
        raw: line,
        certUrl,
      });
    }
  }

  return items;
}

/**
 * Formats Drive view URL to ensure it opens reliably in web preview
 */
export function formatDrivePreviewUrl(urlOrId) {
  if (!urlOrId) return '';
  const str = String(urlOrId).trim();
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }
  // If it's a file ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(str)) {
    return `https://drive.google.com/file/d/${str}/view?usp=drivesdk`;
  }
  return str;
}
