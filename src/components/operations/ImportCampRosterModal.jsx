import { useState, useMemo, useRef } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  HelpCircle,
  Loader2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import Modal from '../Modal';
import { parseExcelOrCsv } from '../../utils/excelImport';
import { useOperations } from '../../context/OperationsContext';
import { useDonors } from '../../context/DonorContext';

export default function ImportCampRosterModal({ open, camp, onClose }) {
  const { addMultipleDonorsToCampRoster } = useOperations();
  const { donors, batchAddOrUpdateDonors } = useDonors();

  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [successReport, setSuccessReport] = useState(null);

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError('');
    setParsing(true);
    setSuccessReport(null);

    try {
      const rows = await parseExcelOrCsv(selectedFile);
      if (rows.length === 0) {
        throw new Error('No valid donor records found in this file.');
      }
      setParsedRows(rows);
    } catch (err) {
      setError(err.message || 'Failed to parse Excel file.');
      setParsedRows([]);
    } finally {
      setParsing(false);
    }
  };

  const processedData = useMemo(() => {
    if (!camp || parsedRows.length === 0) return { matched: [], newDonors: [], alreadyInCamp: [] };

    const matched = [];
    const newDonors = [];
    const alreadyInCamp = [];

    parsedRows.forEach((row, index) => {
      const cleanContact = String(row.contact || '').trim();
      const cleanName = String(row.name || '').trim().toLowerCase();

      // Find match in donors database
      const existing = donors.find((d) => {
        const dContact = String(d.Contact || d.Contact_Number || '').trim();
        const dName = String(d.Name || d.Full_Name || '').trim().toLowerCase();
        if (cleanContact && dContact && (cleanContact === dContact || dContact.endsWith(cleanContact) || cleanContact.endsWith(dContact))) {
          return true;
        }
        return cleanName && dName && cleanName === dName;
      });

      if (existing) {
        const donorId = existing.ID || existing.Donor_ID;
        if (camp.donorIds && camp.donorIds.includes(donorId)) {
          alreadyInCamp.push({ ...row, existingId: donorId, original: existing, status: 'already_in_camp' });
        } else {
          matched.push({ ...row, existingId: donorId, original: existing, status: 'existing' });
        }
      } else {
        // Will generate an ID
        const tempId = `DNR-${String(donors.length + newDonors.length + 1).padStart(3, '0')}`;
        newDonors.push({ ...row, generatedId: tempId, status: 'new' });
      }
    });

    return { matched, newDonors, alreadyInCamp };
  }, [camp, parsedRows, donors]);

  const handleImport = async () => {
    if (!camp || parsedRows.length === 0) return;
    setImporting(true);
    setError('');

    try {
      const campDate = camp.date || new Date().toISOString().slice(0, 10);
      const campVenue = `${camp.name} (${camp.venue})`;

      const donorsToSync = [];
      const rosterDonorIds = [];

      // 1. Process Existing Donors
      processedData.matched.forEach((item) => {
        const id = item.existingId;
        rosterDonorIds.push(id);
        donorsToSync.push({
          ...item.original,
          ID: id,
          Donor_ID: id,
          Name: item.original.Name || item.name,
          'Last Donated Date': campDate,
          Last_Donated_Date: campDate,
          'Last Donation Venue': campVenue,
          Last_Donation_Venue: campVenue,
          'Last Donation Type': 'Whole Blood',
          Last_Donation_Type: 'Whole Blood',
        });
      });

      // 2. Process New Donors
      processedData.newDonors.forEach((item) => {
        const id = item.generatedId;
        rosterDonorIds.push(id);
        donorsToSync.push({
          ID: id,
          Donor_ID: id,
          Name: item.name,
          'Blood Group': item.bloodGroup,
          Contact: item.contact,
          Department: item.department,
          Year: item.year,
          Age: item.age,
          Weight: item.weight,
          Gender: item.gender,
          Location: item.location,
          'Last Donated Date': campDate,
          Last_Donated_Date: campDate,
          'Last Donation Venue': campVenue,
          Last_Donation_Venue: campVenue,
          'Last Donation Type': 'Whole Blood',
          Last_Donation_Type: 'Whole Blood',
          Status: 'Active',
        });
      });

      // 3. Batch register/update donors in Directory
      if (donorsToSync.length > 0) {
        await batchAddOrUpdateDonors(donorsToSync);
      }

      // 4. Update Camp Roster
      if (rosterDonorIds.length > 0) {
        await addMultipleDonorsToCampRoster(camp.id, rosterDonorIds);
      }

      setSuccessReport({
        total: parsedRows.length,
        addedToRoster: rosterDonorIds.length,
        newRegistered: processedData.newDonors.length,
        existingUpdated: processedData.matched.length,
        alreadyPresent: processedData.alreadyInCamp.length,
      });
    } catch (err) {
      setError(err.message || 'Failed to complete roster import.');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setError('');
    setSuccessReport(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleReset}
      title={`Import Camp Donors from Excel / Google Form`}
      maxWidth="max-w-3xl"
    >
      {successReport ? (
        <div className="py-6 text-center space-y-4">
          <span className="animate-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">
              Camp Donors Roster Updated!
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Successfully processed and updated {camp?.name}.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-center">
              <p className="text-[11px] font-bold uppercase text-emerald-700">Added to Camp</p>
              <p className="text-xl font-black text-emerald-950">{successReport.addedToRoster}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-center">
              <p className="text-[11px] font-bold uppercase text-blue-700">New Registered</p>
              <p className="text-xl font-black text-blue-950">{successReport.newRegistered}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-[11px] font-bold uppercase text-slate-600">Existing Synced</p>
              <p className="text-xl font-black text-slate-900">{successReport.existingUpdated}</p>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="cursor-pointer rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              Done & View Camp Roster
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              {error}
            </div>
          )}

          {/* Upload Dropzone */}
          {!file && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center transition-colors hover:border-red-400 hover:bg-red-50/20"
            >
              <FileSpreadsheet className="h-10 w-10 text-emerald-600" />
              <p className="mt-3 text-sm font-bold text-slate-900">
                Click or Drag & Drop Excel Sheet (.xlsx, .xls, .csv)
              </p>
              <p className="mt-1 text-xs text-slate-500 max-w-md">
                Directly upload response sheets downloaded from Google Forms or registration spreadsheets.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
            </div>
          )}

          {/* File Selected & Preview */}
          {file && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <FileSpreadsheet className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{file.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {parsedRows.length} Donors detected in spreadsheet
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setParsedRows([]);
                  }}
                  className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Breakdown Metric Chips */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-2.5">
                  <UserPlus className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-blue-700 uppercase">New Donors</p>
                    <p className="text-xs font-black text-blue-900">
                      {processedData.newDonors.length} to register
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
                  <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-emerald-700 uppercase">Existing Donors</p>
                    <p className="text-xs font-black text-emerald-900">
                      {processedData.matched.length} to sync
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <Users className="h-4 w-4 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase">Already on Roster</p>
                    <p className="text-xs font-black text-slate-900">
                      {processedData.alreadyInCamp.length} skipped
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Preview Table */}
              <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b border-slate-100 bg-slate-50/90 font-bold text-slate-600 backdrop-blur-xs">
                    <tr>
                      <th className="px-3.5 py-2">Donor</th>
                      <th className="px-3.5 py-2">Group</th>
                      <th className="px-3.5 py-2">Contact</th>
                      <th className="px-3.5 py-2">Dept / Year</th>
                      <th className="px-3.5 py-2 text-right">Detection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 50).map((row, idx) => {
                      const isNew = processedData.newDonors.some((n) => n.name === row.name && n.contact === row.contact);
                      const isExisting = processedData.matched.some((m) => m.name === row.name || m.contact === row.contact);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3.5 py-2 font-bold text-slate-900">{row.name}</td>
                          <td className="px-3.5 py-2">
                            <span className="rounded bg-red-50 px-1.5 py-0.5 font-bold text-red-700">
                              {row.bloodGroup}
                            </span>
                          </td>
                          <td className="px-3.5 py-2 text-slate-600">{row.contact || '—'}</td>
                          <td className="px-3.5 py-2 text-slate-600">
                            {row.department} {row.year ? `· ${row.year}` : ''}
                          </td>
                          <td className="px-3.5 py-2 text-right">
                            {isNew ? (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                + New Donor
                              </span>
                            ) : isExisting ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                ✓ Existing
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                On Roster
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleReset}
              disabled={importing}
              className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            {file && (
              <button
                type="button"
                disabled={importing || parsing || parsedRows.length === 0}
                onClick={handleImport}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-red-800 disabled:opacity-60 shadow-xs"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Import & Sync {processedData.matched.length + processedData.newDonors.length} Donors to Camp
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
