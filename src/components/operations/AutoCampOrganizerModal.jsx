import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileSpreadsheet,
  FolderGit2,
  FolderOpen,
  FolderPlus,
  HelpCircle,
  Info,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import Modal from '../Modal';
import { API_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useOperations } from '../../context/OperationsContext';
import { useDonors } from '../../context/DonorContext';
import { parseExcelOrCsv } from '../../utils/excelImport';
import { formatDonorName } from '../../utils/donor';
import {
  extractDriveFolderId,
  normalizeName,
  cleanNameToken,
  calculateNameMatchScore,
  extractNamesFromText,
  formatDrivePreviewUrl,
  performGlobalBipartiteMatching,
} from '../../utils/driveOrganizer';

export default function AutoCampOrganizerModal({ open, onClose }) {
  const { authToken } = useAuth();
  const { addMultipleCamps, addMultipleDonorsToCampRoster } = useOperations();
  const { donors, batchAddOrUpdateDonors } = useDonors();

  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [masterRows, setMasterRows] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [useExistingDirectory, setUseExistingDirectory] = useState(false);
  
  // Google Drive scanning state
  const [mainDriveUrl, setMainDriveUrl] = useState('');
  const [isScanningDrive, setIsScanningDrive] = useState(false);
  const [driveScanMessage, setDriveScanMessage] = useState('');
  const [driveScanError, setDriveScanError] = useState('');

  const [error, setError] = useState('');
  const [executing, setExecuting] = useState(false);
  const [successReport, setSuccessReport] = useState(null);
  
  // Table filtering & selection state
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all' | 'matched' | 'unassigned' | subfolderId
  const [donorSearch, setDonorSearch] = useState('');
  const [selectedDonorIndexes, setSelectedDonorIndexes] = useState([]);

  // Subfolders (Camps) definition
  const [subfolders, setSubfolders] = useState([
    {
      id: 'sub-1',
      name: 'Camp 1 - Blood Donation Drive',
      venue: 'MBCET College Auditorium',
      date: new Date().toISOString().slice(0, 10),
      driveUrl: '',
      namesText: '',
      detectedFiles: [],
    },
    {
      id: 'sub-2',
      name: 'Camp 2 - Special Blood Drive',
      venue: 'Seminar Hall 1, Admin Block',
      date: new Date().toISOString().slice(0, 10),
      driveUrl: '',
      namesText: '',
      detectedFiles: [],
    },
  ]);

  // Explicit manual assignment overrides: { [donorIndex]: subfolderId }
  const [manualAssignments, setManualAssignments] = useState({});

  // Master donor dataset
  const activeMasterList = useMemo(() => {
    if (useExistingDirectory) {
      return donors.map((d, idx) => ({
        index: idx,
        name: d.Name || d.Full_Name,
        bloodGroup: d['Blood Group'] || 'O+',
        contact: d.Contact || d.Contact_Number || '',
        department: d.Department || 'General',
        year: d.Year || '1st Year',
        age: d.Age || 20,
        gender: d.Gender || 'Male',
        location: d.Location || '',
        campName: d['Last Donation Venue'] || '',
        certificateUrl: d['Certificate URL'] || '',
        existingId: d.ID || d.Donor_ID,
        original: d,
      }));
    }
    return masterRows.map((r, idx) => ({ ...r, index: idx }));
  }, [useExistingDirectory, donors, masterRows]);

  // Handle Excel/CSV File Upload
  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError('');
    setParsing(true);
    setSuccessReport(null);
    setManualAssignments({});

    try {
      const rows = await parseExcelOrCsv(selectedFile);
      if (rows.length === 0) {
        throw new Error('No valid donor records found in this Excel sheet.');
      }
      setMasterRows(rows);
      setUseExistingDirectory(false);
    } catch (err) {
      setError(err.message || 'Failed to parse Excel file.');
      setMasterRows([]);
    } finally {
      setParsing(false);
    }
  };

  // Google Drive Auto-Scanner Handler
  const handleScanDriveFolder = async () => {
    const trimmedUrl = mainDriveUrl.trim();
    if (!trimmedUrl) {
      setDriveScanError('Please enter a Google Drive folder link.');
      return;
    }

    setIsScanningDrive(true);
    setDriveScanError('');
    setDriveScanMessage('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'scan_drive_folder',
          folderUrl: trimmedUrl,
          sessionToken: authToken,
          auth_token: authToken,
        }),
      });

      const result = await response.json();
      if (!response.ok || result.status === 'error' || result.success === false) {
        throw new Error(result.error || 'Failed to scan Google Drive folder.');
      }

      const scanData = result.data || {};
      const detectedSubfolders = scanData.subfolders || [];

      if (detectedSubfolders.length === 0) {
        throw new Error('No subfolders or certificate files found in this Drive folder.');
      }

      // Convert detected subfolders to camp configs
      const formattedCamps = detectedSubfolders.map((sf, index) => {
        const fileNamesText = (sf.files || [])
          .map((f) => `${f.name}, ${f.url}`)
          .join('\n');

        // Extract date from folder name if available (e.g. 06/08/2026 or 29/01/2026)
        let campDate = new Date().toISOString().slice(0, 10);
        const dateMatch = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/.exec(sf.name || '');
        if (dateMatch) {
          const d = dateMatch[1].padStart(2, '0');
          const m = dateMatch[2].padStart(2, '0');
          const y = dateMatch[3];
          campDate = `${y}-${m}-${d}`;
        }

        return {
          id: sf.id || `sub-${index + 1}`,
          name: sf.name || `Camp ${index + 1}`,
          venue: 'MBCET Campus',
          date: campDate,
          driveUrl: sf.driveUrl || trimmedUrl,
          namesText: fileNamesText,
          detectedFiles: sf.files || [],
        };
      });

      setSubfolders(formattedCamps);
      setDriveScanMessage(
        `Successfully auto-detected ${formattedCamps.length} camps with ${scanData.totalFiles || 0} certificate files from Google Drive!`
      );
    } catch (err) {
      setDriveScanError(
        err.message || 'Could not scan Drive folder. Ensure folder sharing is public ("Anyone with link") or paste filenames manually below.'
      );
    } finally {
      setIsScanningDrive(false);
    }
  };

  const addSubfolder = () => {
    setSubfolders((prev) => [
      ...prev,
      {
        id: 'sub-' + (prev.length + 1),
        name: 'Camp ' + (prev.length + 1),
        venue: 'MBCET Campus',
        date: new Date().toISOString().slice(0, 10),
        driveUrl: '',
        namesText: '',
        detectedFiles: [],
      },
    ]);
  };

  const removeSubfolder = (id) => {
    if (subfolders.length <= 1) return;
    setSubfolders((prev) => prev.filter((s) => s.id !== id));
    setManualAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k] === id) delete next[k];
      });
      return next;
    });
  };

  const updateSubfolder = (id, field, val) => {
    setSubfolders((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  // High-Precision Auto-Matching Engine
  const sortingResult = useMemo(() => {
    if (!activeMasterList || activeMasterList.length === 0) {
      return {
        campAssignments: (subfolders || []).map((sf) => ({
          campInfo: sf,
          matchedDonors: [],
          detectedCount: 0,
          availableFiles: [],
        })),
        unmatched: [],
        totalMatched: 0,
        donorMatchDetails: {},
        subfolderItemsMap: {},
      };
    }
    try {
      return performGlobalBipartiteMatching(activeMasterList, subfolders, manualAssignments);
    } catch (err) {
      console.error('Auto match calculation error:', err);
      return {
        campAssignments: (subfolders || []).map((sf) => ({
          campInfo: sf,
          matchedDonors: [],
          detectedCount: 0,
          availableFiles: [],
        })),
        unmatched: activeMasterList || [],
        totalMatched: 0,
        donorMatchDetails: {},
        subfolderItemsMap: {},
      };
    }
  }, [activeMasterList, subfolders, manualAssignments]);

  // Bulk Quick Action Helpers
  const handleAssignAllToCamp = (campId) => {
    const next = {};
    (activeMasterList || []).forEach((d) => {
      next[d.index] = campId;
    });
    setManualAssignments(next);
  };

  const handleAssignUnmatchedToCamp = (campId) => {
    setManualAssignments((prev) => {
      const next = { ...prev };
      (sortingResult?.unmatched || []).forEach((d) => {
        next[d.index] = campId;
      });
      return next;
    });
  };

  const handleSplitEvenly = () => {
    if (!subfolders || subfolders.length < 2 || !activeMasterList || activeMasterList.length === 0) return;
    const next = {};
    const count = subfolders.length;
    const chunkSize = Math.ceil(activeMasterList.length / count);

    activeMasterList.forEach((d, idx) => {
      const folderIndex = Math.min(count - 1, Math.floor(idx / chunkSize));
      next[d.index] = subfolders[folderIndex].id;
    });
    setManualAssignments(next);
  };

  const handleAssignByFolderCounts = () => {
    if (!subfolders || subfolders.length === 0 || !activeMasterList || activeMasterList.length === 0) return;
    const next = {};
    let currentIndex = 0;

    subfolders.forEach((sf) => {
      const count = sf.detectedFiles?.length || extractNamesFromText(sf.namesText).length || 0;
      for (let i = 0; i < count && currentIndex < activeMasterList.length; i++) {
        const donor = activeMasterList[currentIndex];
        next[donor.index] = sf.id;
        currentIndex++;
      }
    });

    setManualAssignments(next);
  };

  const handleAssignSelectedToCamp = (campId) => {
    if (selectedDonorIndexes.length === 0) return;
    setManualAssignments((prev) => {
      const next = { ...prev };
      selectedDonorIndexes.forEach((idx) => {
        next[idx] = campId;
      });
      return next;
    });
    setSelectedDonorIndexes([]);
  };

  const handleClearAssignments = () => {
    setManualAssignments({});
    setSelectedDonorIndexes([]);
  };

  const handleSetIndividualAssignment = (donorIdx, campId) => {
    setManualAssignments((prev) => {
      const next = { ...prev };
      if (!campId) delete next[donorIdx];
      else next[donorIdx] = campId;
      return next;
    });
  };

  // Filtered donor list for table view
  const filteredMasterList = useMemo(() => {
    let list = Array.isArray(activeMasterList) ? activeMasterList : [];
    const details = sortingResult?.donorMatchDetails || {};

    // Apply Tab filter
    if (activeFilterTab === 'matched') {
      list = list.filter((d) => Boolean(details[d.index]));
    } else if (activeFilterTab === 'unassigned') {
      list = list.filter((d) => !details[d.index]);
    } else if (activeFilterTab !== 'all') {
      list = list.filter((d) => details[d.index]?.campId === activeFilterTab);
    }

    // Apply Search filter
    if (donorSearch) {
      const q = donorSearch.toLowerCase().trim();
      list = list.filter((d) => {
        const n = String(d.name || '').toLowerCase();
        const bg = String(d.bloodGroup || '').toLowerCase();
        const dept = String(d.department || '').toLowerCase();
        return n.includes(q) || bg.includes(q) || dept.includes(q);
      });
    }

    return list;
  }, [activeMasterList, activeFilterTab, donorSearch, sortingResult]);

  // Execute Creation & Fast Batch Sync
  const handleExecuteAutoOrganize = async () => {
    if (activeMasterList.length === 0) {
      setError('Please upload a combined Excel sheet or choose the existing directory.');
      return;
    }

    if (sortingResult.totalMatched === 0) {
      setError('0 donors are assigned to camps. Please scan Google Drive, paste certificate names, or use "Split Evenly".');
      return;
    }

    setExecuting(true);
    setError('');

    try {
      // 1. Prepare and filter all non-empty camp definitions
      const activeAssignments = sortingResult.campAssignments.filter((a) => a.matchedDonors.length > 0);
      const campsToCreate = activeAssignments.map((assignment) => {
        const { campInfo, matchedDonors } = assignment;
        return {
          name: campInfo.name || 'Blood Donation Drive',
          venue: campInfo.venue || 'MBCET Campus',
          date: campInfo.date || new Date().toISOString().slice(0, 10),
          partnerBloodBank: 'Govt. Medical College Blood Bank',
          targetUnits: Math.max(20, matchedDonors.length),
          collectedUnits: matchedDonors.length,
          status: 'Completed',
          driveFolderUrl: campInfo.driveUrl || mainDriveUrl || '',
          notes: `Auto-created from Drive subfolder import. Total ${matchedDonors.length} donors assigned.`,
        };
      });

      // 2. Create camps all at once with guaranteed unique IDs
      const createdCampsList = await addMultipleCamps(campsToCreate);

      // 3. Prepare donors and roster IDs
      const allDonorsToSync = [];
      let totalSyncedDonors = 0;
      const createdSummary = [];

      for (let i = 0; i < activeAssignments.length; i++) {
        const assignment = activeAssignments[i];
        const newCamp = createdCampsList[i];
        if (!newCamp) continue;

        const { campInfo, matchedDonors } = assignment;
        const rosterIds = [];

        matchedDonors.forEach((item, idx) => {
          const donorId =
            item.existingId ||
            'DNR-' + String(donors.length + totalSyncedDonors + idx + 1).padStart(3, '0');
          rosterIds.push(donorId);

          const venueStr = newCamp.venue ? `${newCamp.name} (${newCamp.venue})` : newCamp.name;
          const assignedCert = item.certUrl || campInfo.driveUrl || mainDriveUrl || item.certificateUrl || '';

          allDonorsToSync.push({
            ID: donorId,
            Donor_ID: donorId,
            Name: item.name,
            'Blood Group': item.bloodGroup,
            Blood_Group: item.bloodGroup,
            Contact: item.contact,
            Contact_Number: item.contact,
            Department: item.department,
            Year: item.year,
            Age: item.age,
            Gender: item.gender,
            Location: item.location,
            'Last Donated Date': newCamp.date,
            Last_Donated_Date: newCamp.date,
            'Last Donation Venue': venueStr,
            Last_Donation_Venue: venueStr,
            'Last Donation Type': 'Whole Blood',
            Last_Donation_Type: 'Whole Blood',
            'Certificate URL': assignedCert,
            Certificate_URL: assignedCert,
            Camp_ID: newCamp.id,
            Status: 'Active',
          });
        });

        // 4. Update Camp Roster with all IDs
        if (rosterIds.length > 0) {
          await addMultipleDonorsToCampRoster(newCamp.id, rosterIds);
        }

        totalSyncedDonors += matchedDonors.length;
        createdSummary.push({
          name: newCamp.name,
          id: newCamp.id,
          count: matchedDonors.length,
          venue: newCamp.venue,
        });
      }

      // 5. Batch Save All Donors in ONE Fast Request
      if (allDonorsToSync.length > 0) {
        await batchAddOrUpdateDonors(allDonorsToSync);
      }

      setSuccessReport({
        createdCamps: createdSummary,
        totalSyncedDonors,
        unmatchedCount: sortingResult.unmatched.length,
      });
    } catch (err) {
      setError(err.message || 'Failed to complete auto-organizing camps.');
    } finally {
      setExecuting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setMasterRows([]);
    setError('');
    setSuccessReport(null);
    setManualAssignments({});
    setSelectedDonorIndexes([]);
    setDriveScanError('');
    setDriveScanMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleReset}
      title="Auto-Organize Camps from Drive & Combined Excel"
      maxWidth="max-w-5xl"
    >
      {successReport ? (
        <div className="py-8 text-center space-y-5">
          <span className="animate-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="h-9 w-9" />
          </span>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">
              Camps Created & Donors Organized Successfully!
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 max-w-lg mx-auto">
              Created <strong>{successReport.createdCamps.length} camps</strong> with <strong>{successReport.totalSyncedDonors} verified donors</strong> who have certificates. The <strong>{successReport.unmatchedCount} absent people</strong> without certificates were excluded from the camp rosters.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-w-3xl mx-auto pt-2">
            {successReport.createdCamps.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left shadow-xs transition-transform hover:scale-[1.01]"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="rounded-md bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                    {c.id}
                  </span>
                  <span className="text-xs font-bold text-emerald-800">
                    {c.count} Donors
                  </span>
                </div>
                <p className="text-xs font-bold text-emerald-950 truncate">{c.name}</p>
                <p className="text-[11px] text-emerald-700 mt-0.5 truncate">{c.venue}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="cursor-pointer rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-slate-800 active:scale-95 transition-all"
            >
              Done & View Camps
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div>{error}</div>
            </div>
          )}

          {/* STEP 1: Excel / Directory Source */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-700 text-xs font-bold text-white shadow-xs">
                  1
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  Step 1: Choose Master Donor Source (Combined Excel or Directory)
                </h4>
              </div>

              {donors.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-xs hover:border-red-300">
                  <input
                    type="checkbox"
                    checked={useExistingDirectory}
                    onChange={(e) => setUseExistingDirectory(e.target.checked)}
                    className="rounded border-slate-300 text-red-700 focus:ring-red-500 cursor-pointer"
                  />
                  Use existing Donor Directory ({donors.length} donors)
                </label>
              )}
            </div>

            {!useExistingDirectory && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer flex flex-col sm:flex-row items-center justify-between rounded-xl border border-dashed border-slate-300 bg-white p-4 hover:border-red-400 hover:bg-red-50/20 transition-colors gap-3"
              >
                <div className="flex items-center gap-3.5">
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 border border-emerald-100">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {file ? file.name : 'Click to Upload Combined Master Excel Sheet (.xlsx, .csv)'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {masterRows.length > 0
                        ? `${masterRows.length} donors successfully loaded from Excel file`
                        : 'Upload the combined spreadsheet containing donor details across all conducted camps'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200">
                    Browse File
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
              </div>
            )}

            {/* Source Data Quick Stats */}
            {activeMasterList.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">Source Loaded:</span>
                  <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    {activeMasterList.length} Total Donors
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    Ready for matching
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700">Sample Extracted Donors:</span>
                  {activeMasterList.slice(0, 4).map((d, i) => (
                    <span key={i} className="rounded-md bg-slate-50 px-2 py-0.5 text-[10.5px] font-semibold text-slate-800 border border-slate-200">
                      👤 {d.name} <span className="text-red-700 font-bold">({d.bloodGroup})</span>
                    </span>
                  ))}
                  {activeMasterList.length > 4 && (
                    <span className="text-slate-400 italic text-[10px]">
                      +{activeMasterList.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Google Drive Folders & Camp Subfolders */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-700 text-xs font-bold text-white shadow-xs">
                  2
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  Step 2: Google Drive Auto-Scan & Camps Setup
                </h4>
              </div>
              <button
                type="button"
                onClick={addSubfolder}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Another Camp
              </button>
            </div>

            {/* Google Drive Folder Auto-Scanner Input */}
            <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3.5 space-y-2.5">
              <label className="flex items-center justify-between text-xs font-bold text-purple-950">
                <span className="flex items-center gap-1.5">
                  <FolderOpen className="h-4 w-4 text-purple-700" />
                  Parent Google Drive Folder Link (Auto-Scans All Subfolders & Certificates)
                </span>
                <span className="text-[11px] font-semibold text-purple-600">1-Click Auto Scan</span>
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="url"
                  value={mainDriveUrl}
                  onChange={(e) => setMainDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/1abcxyz..."
                  className="w-full flex-1 rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
                <button
                  type="button"
                  onClick={handleScanDriveFolder}
                  disabled={isScanningDrive || !mainDriveUrl.trim()}
                  className="w-full sm:w-auto flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-800 disabled:opacity-50 transition-all shrink-0"
                >
                  {isScanningDrive ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  {isScanningDrive ? 'Scanning Drive...' : 'Auto-Scan Drive'}
                </button>
              </div>

              {driveScanMessage && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  {driveScanMessage}
                </div>
              )}

              {driveScanError && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs font-semibold text-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p>{driveScanError}</p>
                    <p className="text-[11px] text-amber-700 font-normal mt-0.5">
                      Tip: You can also paste filenames or certificate URLs directly into the camp cards below.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Camps Subfolders Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-80 overflow-y-auto pr-1">
              {subfolders.map((sf, idx) => {
                const assignment = sortingResult.campAssignments.find((a) => a.campInfo.id === sf.id);
                const matchedCount = assignment ? assignment.matchedDonors.length : 0;
                const fileCount = sf.detectedFiles?.length || extractNamesFromText(sf.namesText).length;

                return (
                  <div
                    key={sf.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 shadow-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold text-white">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={sf.name}
                          onChange={(e) => updateSubfolder(sf.id, 'name', e.target.value)}
                          placeholder="Camp Name (e.g. Oct 2025 Drive)"
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 outline-none focus:border-red-500"
                        />
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          matchedCount > 0
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {matchedCount} Assigned
                      </span>

                      {subfolders.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSubfolder(sf.id)}
                          className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                          title="Remove camp"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Venue</label>
                        <input
                          type="text"
                          value={sf.venue}
                          onChange={(e) => updateSubfolder(sf.id, 'venue', e.target.value)}
                          placeholder="Venue (e.g. Auditorium)"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Date</label>
                        <input
                          type="date"
                          value={sf.date}
                          onChange={(e) => updateSubfolder(sf.id, 'date', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-600">
                          Certificate Filenames / Drive URLs:
                        </label>
                        {fileCount > 0 && (
                          <span className="text-[10px] font-bold text-purple-700">
                            {fileCount} files detected
                          </span>
                        )}
                      </div>
                      <textarea
                        value={sf.namesText}
                        onChange={(e) => updateSubfolder(sf.id, 'namesText', e.target.value)}
                        placeholder={
                          'Paste filenames or lines, e.g.:\nNiranjan S S.pdf\nRahul V S, https://drive.google.com/file/d/...\nArjun Menon'
                        }
                        rows={2.5}
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-mono text-slate-800 outline-none focus:border-red-500 resize-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Review & Fine-Tune Donor Distribution Matrix */}
          {activeMasterList.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3.5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-700 text-xs font-bold text-white shadow-xs">
                    3
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 3: Review & Fine-Tune Donor Distribution
                  </h4>
                </div>

                {/* Quick Split & Assignment Action Bar */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-semibold mr-1">Quick Tools:</span>
                  <button
                    type="button"
                    onClick={handleAssignByFolderCounts}
                    className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                    title="Fill camps sequentially according to detected certificate counts"
                  >
                    <CheckCircle2 className="inline h-3 w-3 mr-1" />
                    Auto-Fill by File Counts
                  </button>

                  <button
                    type="button"
                    onClick={handleSplitEvenly}
                    className="cursor-pointer rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-800 hover:bg-purple-100 transition-colors"
                    title="Evenly split master donors across all configured camps"
                  >
                    <ArrowRightLeft className="inline h-3 w-3 mr-1" />
                    Split Evenly
                  </button>

                  {subfolders.map((sf, idx) => (
                    <button
                      key={sf.id}
                      type="button"
                      onClick={() => handleAssignAllToCamp(sf.id)}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      All → Camp #{idx + 1}
                    </button>
                  ))}

                  {(sortingResult?.unmatched?.length || 0) > 0 && subfolders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleAssignUnmatchedToCamp(subfolders[0].id)}
                      className="cursor-pointer rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors"
                    >
                      Unassigned → Camp #1
                    </button>
                  )}

                  {selectedDonorIndexes.length > 0 && (
                    <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                      <span className="text-[11px] font-bold text-red-700 px-1">
                        {selectedDonorIndexes.length} selected →
                      </span>
                      {subfolders.map((sf, idx) => (
                        <button
                          key={sf.id}
                          type="button"
                          onClick={() => handleAssignSelectedToCamp(sf.id)}
                          className="cursor-pointer rounded bg-red-700 text-white px-2 py-0.5 text-[10px] font-bold hover:bg-red-800"
                        >
                          Camp #{idx + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  {Object.keys(manualAssignments).length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAssignments}
                      className="cursor-pointer text-[11px] font-semibold text-slate-500 hover:text-red-600 underline ml-1"
                    >
                      Reset Overrides
                    </button>
                  )}
                </div>
              </div>

              {/* Absent Donor Policy Notification */}
              <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
                <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                <div>
                  <span className="font-bold">Absent Donor Protection Active:</span> Only people with verified Google Drive certificates are added to the camp roster ({sortingResult?.totalMatched || 0} matched). The {sortingResult?.unmatched?.length || 0} pre-registered people without certificates are treated as absent and will <strong>NOT</strong> be added to the camp.
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab('all')}
                    className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      activeFilterTab === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({activeMasterList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab('matched')}
                    className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      activeFilterTab === 'matched'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    With Certs ({sortingResult?.totalMatched || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab('unassigned')}
                    className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      activeFilterTab === 'unassigned'
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Absent / Excluded ({sortingResult?.unmatched?.length || 0})
                  </button>
                  {subfolders.map((sf, idx) => {
                    const count =
                      sortingResult?.campAssignments?.find((a) => a.campInfo.id === sf.id)?.matchedDonors
                        ?.length || 0;
                    return (
                      <button
                        key={sf.id}
                        type="button"
                        onClick={() => setActiveFilterTab(sf.id)}
                        className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                          activeFilterTab === sf.id
                            ? 'bg-red-700 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Camp #{idx + 1} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={donorSearch}
                    onChange={(e) => setDonorSearch(e.target.value)}
                    placeholder="Search donors by name, blood group..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pr-3 pl-8 text-xs text-slate-800 outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Donors Interactive Table */}
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b border-slate-200 bg-slate-100/90 font-bold text-slate-700 backdrop-blur-xs">
                    <tr>
                      <th className="px-3 py-2 w-8">
                        <input
                          type="checkbox"
                          className="cursor-pointer rounded text-red-600"
                          checked={
                            filteredMasterList.length > 0 &&
                            filteredMasterList.every((d) => selectedDonorIndexes.includes(d.index))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const newIndexes = Array.from(
                                new Set([...selectedDonorIndexes, ...filteredMasterList.map((d) => d.index)])
                              );
                              setSelectedDonorIndexes(newIndexes);
                            } else {
                              const filteredSet = new Set(filteredMasterList.map((d) => d.index));
                              setSelectedDonorIndexes((prev) => prev.filter((i) => !filteredSet.has(i)));
                            }
                          }}
                        />
                      </th>
                      <th className="px-3 py-2">Donor Name</th>
                      <th className="px-3 py-2">Blood Group</th>
                      <th className="px-3 py-2">Dept / Year</th>
                      <th className="px-3 py-2">Matched Certificate File</th>
                      <th className="px-3 py-2">Match Status</th>
                      <th className="px-3 py-2 text-right">Assigned Camp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMasterList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-semibold">
                          No donors found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredMasterList.slice(0, 150).map((donor) => {
                        const idx = donor.index;
                        const isSelected = selectedDonorIndexes.includes(idx);
                        const matchDetails = sortingResult?.donorMatchDetails?.[idx] || null;
                        const assignedCampId = matchDetails ? matchDetails.campId : '';
                        const certLink = matchDetails ? matchDetails.certUrl : donor.certificateUrl;

                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isSelected ? 'bg-red-50/60' : ''
                            }`}
                          >
                            <td className="px-3 py-2 w-8">
                              <input
                                type="checkbox"
                                className="cursor-pointer rounded text-red-600"
                                checked={isSelected}
                                onChange={() =>
                                  setSelectedDonorIndexes((prev) =>
                                    prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
                                  )
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-bold text-slate-900">{donor.name}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="rounded bg-red-50 px-1.5 py-0.5 font-bold text-red-700 text-[10px] border border-red-100">
                                {donor.bloodGroup}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-600 text-[11px]">
                              {donor.department} {donor.year ? `· ${donor.year}` : ''}
                            </td>
                            <td className="px-3 py-2">
                              {matchDetails?.matchedFileName ? (
                                <div className="flex items-center gap-1.5 max-w-[220px]">
                                  <span
                                    className="truncate text-[11px] font-mono text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200"
                                    title={matchDetails.matchedFileName}
                                  >
                                    📄 {matchDetails.matchedFileName}
                                  </span>
                                  {certLink && (
                                    <a
                                      href={formatDrivePreviewUrl(certLink)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-purple-600 hover:text-purple-800 p-0.5 shrink-0"
                                      title="Open Certificate Preview"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">No File (Absent)</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {matchDetails ? (
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                    matchDetails.matchType === 'certificate'
                                      ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                      : matchDetails.matchType === 'excel_column'
                                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {matchDetails.matchType === 'certificate'
                                    ? `🎯 ${matchDetails.score}% Match`
                                    : matchDetails.matchType === 'excel_column'
                                      ? '📋 Excel Col'
                                      : '✋ Manual'}
                                </span>
                              ) : (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">
                                  🚫 Absent (Excluded)
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <select
                                value={assignedCampId}
                                onChange={(e) => handleSetIndividualAssignment(idx, e.target.value)}
                                className={`rounded-lg border px-2 py-1 text-[11px] font-bold outline-none cursor-pointer ${
                                  assignedCampId
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                    : 'border-slate-200 bg-slate-50 text-slate-500'
                                }`}
                              >
                                <option value="">-- Excluded (Absent) --</option>
                                {subfolders.map((sf, sfIdx) => (
                                  <option key={sf.id} value={sf.id}>
                                    Camp #{sfIdx + 1}: {sf.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {filteredMasterList.length > 150 && (
                <p className="text-[11px] text-slate-400 text-center">
                  Showing first 150 of {filteredMasterList.length} donors. Use search to refine.
                </p>
              )}
            </div>
          )}

          {/* Live Breakdown Summary Bar */}
          {activeMasterList.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 flex flex-wrap items-center justify-between text-xs font-semibold text-slate-700 gap-2">
              <div className="flex items-center gap-4">
                <span>
                  Total in Excel: <strong>{activeMasterList.length}</strong>
                </span>
                <span>
                  With Certificates (To Add):{' '}
                  <strong className="text-emerald-700">{sortingResult.totalMatched}</strong>
                </span>
                <span>
                  Absent / Excluded:{' '}
                  <strong className="text-slate-600">{sortingResult.unmatched.length}</strong>
                </span>
              </div>

              <div className="text-[11px] text-slate-500">
                Ready to organize {subfolders.length} camp drives
              </div>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleReset}
              disabled={executing}
              className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteAutoOrganize}
              disabled={executing || activeMasterList.length === 0 || sortingResult.totalMatched === 0}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-700 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-800 disabled:opacity-50 active:scale-95 transition-all"
            >
              {executing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {executing
                ? 'Creating Camps & Syncing Donors...'
                : `Create & Organize ${sortingResult.totalMatched} Donors into ${subfolders.length} Camps`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
