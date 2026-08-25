import { useState, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Droplet,
  HeartHandshake,
  Loader2,
  Plus,
  Search,
  User,
  UserPlus,
} from 'lucide-react';
import Modal from '../Modal';
import CertificateUploader from '../CertificateUploader';
import { useOperations } from '../../context/OperationsContext';
import { useDonors } from '../../context/DonorContext';
import { formatDonorName } from '../../utils/donor';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const DONATION_TYPES = ['Whole Blood', 'Platelets', 'Plasma'];
const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'ME', 'CE', 'AD', 'AIDS', 'MBA', 'MCA', 'Faculty', 'Staff', 'Other'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Alumni', 'Staff', 'Other'];
const GENDERS = ['Male', 'Female'];

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100';

function Field({ id, label, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function LogVoluntaryDonationModal({ open, onClose }) {
  const { addVoluntaryDonation } = useOperations();
  const { donors, addDonor } = useDonors();

  // Mode: 'existing' | 'new_donor'
  const [mode, setMode] = useState('existing');

  // Existing donor selection state
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [donorSearch, setDonorSearch] = useState('');

  // New donor registration state
  const [newName, setNewName] = useState('');
  const [newBloodGroup, setNewBloodGroup] = useState('A+');
  const [newContact, setNewContact] = useState('');
  const [newDepartment, setNewDepartment] = useState('CSE');
  const [newYear, setNewYear] = useState('1st Year');
  const [newGender, setNewGender] = useState('Male');
  const [newLocation, setNewLocation] = useState('');

  // Donation log state
  const [venue, setVenue] = useState('');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().slice(0, 10));
  const [donationType, setDonationType] = useState('Whole Blood');
  const [units, setUnits] = useState(1);
  const [notes, setNotes] = useState('');
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdDonorName, setCreatedDonorName] = useState('');

  const filteredDonors = useMemo(() => {
    const q = donorSearch.toLowerCase().trim();
    if (!q) return donors.slice(0, 8);
    return donors.filter((d) => {
      const name = String(d.Name || d.Full_Name || '').toLowerCase();
      const id = String(d.ID || d.Donor_ID || '').toLowerCase();
      const bg = String(d['Blood Group'] || '').toLowerCase();
      const contact = String(d.Contact || d.Contact_Number || '');
      return name.includes(q) || id.includes(q) || bg.includes(q) || contact.includes(q);
    });
  }, [donors, donorSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!venue.trim()) {
      setError('Hospital or venue name is required.');
      return;
    }

    setLoading(true);

    try {
      const certificateFiles = certificates
        .filter((c) => c.type === 'file')
        .map((c) => ({
          data: c.fileData,
          name: c.fileName,
          type: c.fileType,
        }));
      const certificateUrls = certificates
        .filter((c) => c.type === 'url')
        .map((c) => c.url);

      const certString = certificateUrls.join(', ');

      let donorId = '';
      let donorName = '';
      let bloodGroup = '';

      if (mode === 'existing') {
        if (!selectedDonor) {
          setError('Please select a registered donor from the list, or choose "Register New Donor".');
          setLoading(false);
          return;
        }
        donorId = selectedDonor.ID || selectedDonor.Donor_ID;
        donorName = selectedDonor.Name || selectedDonor.Full_Name;
        bloodGroup = selectedDonor['Blood Group'];
      } else {
        // Registering a brand new donor
        const formattedName = formatDonorName(newName);
        if (!formattedName) {
          setError('Donor name is required.');
          setLoading(false);
          return;
        }

        const cleanContact = newContact.replace(/\D/g, '').slice(0, 10);
        if (cleanContact.length < 10) {
          setError('Please enter a valid 10-digit mobile number for the donor.');
          setLoading(false);
          return;
        }

        donorName = formattedName;
        bloodGroup = newBloodGroup;
        const generatedId = `DON-${Date.now().toString().slice(-6)}`;
        donorId = generatedId;

        // Save to central directory
        await addDonor({
          ID: generatedId,
          Donor_ID: generatedId,
          Name: formattedName,
          'Blood Group': newBloodGroup,
          Contact: cleanContact,
          Department: newDepartment,
          Year: newYear,
          Gender: newGender,
          Location: newLocation.trim(),
          'Last Donated Date': donationDate,
          Last_Donated_Date: donationDate,
          'Last Donation Venue': venue.trim(),
          Last_Donation_Venue: venue.trim(),
          'Last Donation Type': donationType,
          Last_Donation_Type: donationType,
          'Certificate URL': certString,
          certificateFiles,
        });
      }

      // Record voluntary donation log
      await addVoluntaryDonation({
        donorId,
        donorName,
        bloodGroup,
        donationDate,
        venue: venue.trim(),
        donationType,
        units: Number(units) || 1,
        notes: notes.trim(),
        certificateUrl: certString,
        certificateUrls,
        certificateFiles,
      });

      setCreatedDonorName(donorName);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to log donation.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMode('existing');
    setSelectedDonor(null);
    setDonorSearch('');
    setNewName('');
    setNewBloodGroup('A+');
    setNewContact('');
    setNewDepartment('CSE');
    setNewYear('1st Year');
    setNewGender('Male');
    setNewLocation('');
    setVenue('');
    setDonationDate(new Date().toISOString().slice(0, 10));
    setDonationType('Whole Blood');
    setUnits(1);
    setNotes('');
    setCertificates([]);
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Log Voluntary Blood Donation"
      maxWidth="max-w-2xl"
    >
      {success ? (
        <div className="py-6 text-center">
          <span className="animate-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900">
            Voluntary Donation Recorded!
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'new_donor' ? (
              <>
                <strong>{createdDonorName}</strong> was registered into the directory and their voluntary donation logged.
              </>
            ) : (
              <>
                <strong>{createdDonorName}</strong>'s donation record and cooling cycle have been updated.
              </>
            )}
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              {error}
            </div>
          )}

          {/* Mode Selector Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('existing');
                setError('');
              }}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
                mode === 'existing'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              Existing Donor
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('new_donor');
                setError('');
              }}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
                mode === 'new_donor'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Register New Donor
            </button>
          </div>

          {/* Mode 1: Select Existing Registered Donor */}
          {mode === 'existing' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Select Donor from Directory <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMode('new_donor')}
                  className="cursor-pointer text-xs font-bold text-red-700 hover:underline"
                >
                  + Unregistered Donor?
                </button>
              </div>

              {selectedDonor ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-700 text-xs font-bold text-white shadow-xs">
                      {selectedDonor['Blood Group']}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {selectedDonor.Name || selectedDonor.Full_Name}
                      </p>
                      <p className="text-xs text-slate-500">
                        ID: {selectedDonor.ID || selectedDonor.Donor_ID} · {selectedDonor.Department} ({selectedDonor.Year})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDonor(null)}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={donorSearch}
                      onChange={(e) => setDonorSearch(e.target.value)}
                      placeholder="Search donor by name, mobile number, ID or blood group..."
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1">
                    {filteredDonors.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        No donors found.
                        <button
                          type="button"
                          onClick={() => setMode('new_donor')}
                          className="ml-1 cursor-pointer font-bold text-red-700 hover:underline"
                        >
                          Click to Register New Donor
                        </button>
                      </div>
                    ) : (
                      filteredDonors.map((d) => {
                        const donorId = d.ID || d.Donor_ID;
                        return (
                          <button
                            key={donorId}
                            type="button"
                            onClick={() => {
                              setSelectedDonor(d);
                              setDonorSearch('');
                            }}
                            className="flex w-full cursor-pointer items-center justify-between rounded-lg p-2 text-left hover:bg-red-50/60"
                          >
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                                {d['Blood Group']}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {d.Name || d.Full_Name}
                              </span>
                              <span className="text-[11px] text-slate-400">({donorId})</span>
                            </div>
                            <span className="text-[11px] text-slate-500">{d.Department}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Register Brand New Donor */}
          {mode === 'new_donor' && (
            <div className="rounded-2xl border border-red-200 bg-red-50/30 p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-red-100 pb-2">
                <UserPlus className="h-4 w-4 text-red-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-950">
                  New Donor Details (Will be added to Central Directory)
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field id="new-donor-name" label="Donor Full Name" required>
                    <input
                      id="new-donor-name"
                      type="text"
                      required
                      placeholder="e.g. S S Niranjan or Rahul V S"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field id="new-donor-bg" label="Blood Group" required>
                  <select
                    id="new-donor-bg"
                    value={newBloodGroup}
                    onChange={(e) => setNewBloodGroup(e.target.value)}
                    className={inputClass}
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field id="new-donor-contact" label="10-Digit Mobile Number" required>
                  <input
                    id="new-donor-contact"
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value.replace(/\D/g, ''))}
                    className={inputClass}
                  />
                </Field>

                <Field id="new-donor-dept" label="Department / Branch">
                  <select
                    id="new-donor-dept"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className={inputClass}
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field id="new-donor-year" label="Year of Study">
                  <select
                    id="new-donor-year"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className={inputClass}
                  >
                    {YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field id="new-donor-gender" label="Gender">
                  <select
                    id="new-donor-gender"
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                    className={inputClass}
                  >
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field id="new-donor-loc" label="Location / City">
                  <input
                    id="new-donor-loc"
                    type="text"
                    placeholder="e.g. Trivandrum"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Donation Log Details */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <HeartHandshake className="h-4 w-4 text-slate-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Donation Details
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field id="vol-venue" label="Donation Venue / Hospital / Blood Bank" required>
                  <input
                    id="vol-venue"
                    type="text"
                    required
                    maxLength={150}
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Regional Cancer Centre (RCC), Trivandrum"
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field id="vol-date" label="Donation Date" required>
                <input
                  id="vol-date"
                  type="date"
                  value={donationDate}
                  onChange={(e) => setDonationDate(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field id="vol-type" label="Donation Type">
                <select
                  id="vol-type"
                  value={donationType}
                  onChange={(e) => setDonationType(e.target.value)}
                  className={inputClass}
                >
                  {DONATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="vol-units" label="Units Donated">
                <input
                  id="vol-units"
                  type="number"
                  min={1}
                  max={5}
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field id="vol-notes" label="Notes / Reference (Optional)">
                <input
                  id="vol-notes"
                  type="text"
                  maxLength={200}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Voluntary walk-in donation"
                  className={inputClass}
                />
              </Field>
            </div>

            {/* Certificate Uploads */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Donation Certificates
              </label>
              <CertificateUploader
                certificates={certificates}
                onChange={setCertificates}
                donorName={mode === 'new_donor' ? newName || 'Voluntary Donor' : selectedDonor?.Name || 'Voluntary Donor'}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-red-800 active:scale-98 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Donation...
                </>
              ) : mode === 'new_donor' ? (
                <>
                  <UserPlus className="h-4 w-4" />
                  Register Donor & Record Donation
                </>
              ) : (
                <>
                  <HeartHandshake className="h-4 w-4" />
                  Record Voluntary Donation
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
