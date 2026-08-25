import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Edit3, Loader2, Save, Trash2 } from 'lucide-react';
import Modal from '../Modal';
import CertificateUploader from '../CertificateUploader';
import { useOperations } from '../../context/OperationsContext';
import { formatDonorName } from '../../utils/donor';

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

export default function EditVoluntaryDonationModal({ open, donationLog, onClose }) {
  const { updateVoluntaryDonation, deleteVoluntaryDonation } = useOperations();
  const [venue, setVenue] = useState('');
  const [donationDate, setDonationDate] = useState('');
  const [donationType, setDonationType] = useState('Whole Blood');
  const [units, setUnits] = useState(1);
  const [notes, setNotes] = useState('');
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (donationLog && open) {
      setVenue(donationLog.venue || '');
      setDonationDate(donationLog.donationDate || '');
      setDonationType(donationLog.donationType || 'Whole Blood');
      setUnits(donationLog.units || 1);
      setNotes(donationLog.notes || '');

      const existingUrls = donationLog.certificateUrl
        ? String(donationLog.certificateUrl)
            .split(/[\n,;]+/)
            .map((u) => u.trim())
            .filter((u) => u.startsWith('http://') || u.startsWith('https://'))
            .map((u) => ({ type: 'url', url: u }))
        : [];
      setCertificates(existingUrls);

      setError('');
      setSuccess(false);
      setConfirmDelete(false);
    }
  }, [donationLog, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!donationLog) return;
    if (!venue.trim()) {
      setError('Hospital or venue is required.');
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

      await updateVoluntaryDonation(donationLog.id, {
        venue: venue.trim(),
        donationDate,
        donationType,
        units: Number(units) || 1,
        notes: notes.trim(),
        certificateUrl: certString,
        certificateUrls,
        certificateFiles,
      });

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to update voluntary donation log.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!donationLog) return;
    setLoading(true);
    try {
      await deleteVoluntaryDonation(donationLog.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete donation record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit Voluntary Donation · ${donationLog?.donorName ? formatDonorName(donationLog.donorName) : ''}`}
      maxWidth="max-w-2xl"
    >
      {success ? (
        <div className="py-6 text-center">
          <span className="animate-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900">
            Donation Log Updated
          </h3>
          <div className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        </div>
      ) : confirmDelete ? (
        <div className="py-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Trash2 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Delete Voluntary Donation Record?
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Are you sure you want to delete this donation log for{' '}
            <span className="font-semibold text-slate-800">{donationLog?.donorName}</span> ({donationLog?.id})?
          </p>
          <div className="flex justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleDelete}
              className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? 'Deleting...' : 'Yes, Delete Record'}
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

          {/* Donor Info Header */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-900">
              Donor: {donationLog?.donorName} ({donationLog?.donorId})
            </p>
            <p className="text-[11px] text-slate-500">
              Blood Group: <span className="font-bold text-red-700">{donationLog?.bloodGroup}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="edit-vol-venue" label="Donation Venue / Hospital" required>
                <input
                  id="edit-vol-venue"
                  type="text"
                  required
                  maxLength={150}
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field id="edit-vol-date" label="Donation Date" required>
              <input
                id="edit-vol-date"
                type="date"
                value={donationDate}
                onChange={(e) => setDonationDate(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field id="edit-vol-type" label="Donation Type" required>
              <select
                id="edit-vol-type"
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

            <Field id="edit-vol-units" label="Units Donated">
              <input
                id="edit-vol-units"
                type="number"
                min={1}
                max={5}
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field id="edit-vol-notes" label="Notes / Reason">
              <input
                id="edit-vol-notes"
                type="text"
                maxLength={200}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex cursor-pointer items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Record
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Changes
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
