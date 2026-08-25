import { useState, useMemo } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Plus, Search, User } from 'lucide-react';
import Modal from '../Modal';
import CertificateUploader from '../CertificateUploader';
import { useOperations } from '../../context/OperationsContext';
import { useDonors } from '../../context/DonorContext';

const DONATION_TYPES = ['Whole Blood', 'Platelets', 'Plasma'];

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100';

function Field({ id, label, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function LogVoluntaryDonationModal({ open, onClose }) {
  const { addVoluntaryDonation } = useOperations();
  const { donors } = useDonors();

  const [selectedDonor, setSelectedDonor] = useState(null);
  const [donorSearch, setDonorSearch] = useState('');
  const [venue, setVenue] = useState('');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().slice(0, 10));
  const [donationType, setDonationType] = useState('Whole Blood');
  const [units, setUnits] = useState(1);
  const [notes, setNotes] = useState('');
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const filteredDonors = useMemo(() => {
    const q = donorSearch.toLowerCase().trim();
    if (!q) return donors.slice(0, 8);
    return donors.filter((d) => {
      const name = String(d.Name || d.Full_Name || '').toLowerCase();
      const id = String(d.ID || d.Donor_ID || '').toLowerCase();
      const bg = String(d['Blood Group'] || '').toLowerCase();
      return name.includes(q) || id.includes(q) || bg.includes(q);
    });
  }, [donors, donorSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDonor) {
      setError('Please select a registered donor from the database.');
      return;
    }
    if (!venue.trim()) {
      setError('Hospital or venue name is required.');
      return;
    }

    setLoading(true);
    setError('');

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

      await addVoluntaryDonation({
        donorId: selectedDonor.ID || selectedDonor.Donor_ID,
        donorName: selectedDonor.Name || selectedDonor.Full_Name,
        bloodGroup: selectedDonor['Blood Group'],
        donationDate,
        venue: venue.trim(),
        donationType,
        units: Number(units) || 1,
        notes: notes.trim(),
        certificateUrl: certString,
        certificateUrls,
        certificateFiles,
      });

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to log donation.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDonor(null);
    setDonorSearch('');
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
            Voluntary Donation Recorded
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Donor record has been updated with the latest donation date and cooling cycle.
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
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              {error}
            </div>
          )}

          {/* Select Registered Donor */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Select Registered Donor <span className="text-red-600">*</span>
            </label>

            {selectedDonor ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-700 text-xs font-bold text-white">
                    {selectedDonor['Blood Group']}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {selectedDonor.Name || selectedDonor.Full_Name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      ID: {selectedDonor.ID || selectedDonor.Donor_ID} · {selectedDonor.Department}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDonor(null)}
                  className="cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-white"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={donorSearch}
                    onChange={(e) => setDonorSearch(e.target.value)}
                    placeholder="Type name, ID or blood group to search registered donors..."
                    className={inputClass}
                  />
                </div>

                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1">
                  {filteredDonors.map((d) => {
                    const donorId = d.ID || d.Donor_ID;
                    return (
                      <button
                        key={donorId}
                        type="button"
                        onClick={() => {
                          setSelectedDonor(d);
                          setDonorSearch('');
                        }}
                        className="flex w-full cursor-pointer items-center justify-between rounded-lg p-2 text-left hover:bg-red-50/50"
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
                  })}
                </div>
              </div>
            )}
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

            <Field id="vol-type" label="Donation Type" required>
              <select
                id="vol-type"
                value={donationType}
                onChange={(e) => setDonationType(e.target.value)}
                className={`${inputClass} cursor-pointer`}
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

            <Field id="vol-notes" label="Notes / Reason">
              <input
                id="vol-notes"
                type="text"
                maxLength={200}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Voluntary walk-in donation."
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2">
              <CertificateUploader
                certificates={certificates}
                onChange={setCertificates}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-800 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Log Donation
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
