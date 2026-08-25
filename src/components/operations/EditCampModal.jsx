import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Edit3, Loader2, Save, Trash2 } from 'lucide-react';
import Modal from '../Modal';
import { useOperations } from '../../context/OperationsContext';
import { CAMP_STATUS } from '../../utils/operations';

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

export default function EditCampModal({ open, camp, onClose }) {
  const { updateCamp, deleteCamp } = useOperations();
  const [form, setForm] = useState({
    name: '',
    date: '',
    venue: '',
    partnerBloodBank: '',
    targetUnits: 50,
    status: 'Upcoming',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (camp && open) {
      setForm({
        name: camp.name || '',
        date: camp.date || '',
        venue: camp.venue || '',
        partnerBloodBank: camp.partnerBloodBank || '',
        targetUnits: camp.targetUnits || 50,
        status: camp.status || 'Upcoming',
        notes: camp.notes || '',
      });
      setError('');
      setSuccess(false);
      setConfirmDelete(false);
    }
  }, [camp, open]);

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!camp) return;
    if (!form.name.trim() || !form.venue.trim()) {
      setError('Camp Title and Venue are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updateCamp(camp.id, {
        name: form.name.trim(),
        date: form.date,
        venue: form.venue.trim(),
        partnerBloodBank: form.partnerBloodBank.trim(),
        targetUnits: Number(form.targetUnits) || 50,
        status: form.status,
        notes: form.notes.trim(),
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to update camp.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!camp) return;
    setLoading(true);
    try {
      await deleteCamp(camp.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete camp.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit Donation Camp · ${camp?.id || ''}`}
      maxWidth="max-w-2xl"
    >
      {success ? (
        <div className="py-6 text-center">
          <span className="animate-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900">
            Camp Details Updated
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
            Delete Donation Camp?
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Are you sure you want to delete the camp <span className="font-semibold text-slate-800">{camp?.name}</span> ({camp?.id})?
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
              {loading ? 'Deleting...' : 'Yes, Delete Camp'}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="edit-camp-name" label="Camp Title" required>
                <input
                  id="edit-camp-name"
                  type="text"
                  required
                  maxLength={150}
                  value={form.name}
                  onChange={setField('name')}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field id="edit-camp-date" label="Camp Date" required>
              <input
                id="edit-camp-date"
                type="date"
                value={form.date}
                onChange={setField('date')}
                className={inputClass}
              />
            </Field>

            <Field id="edit-camp-target" label="Target Collection (Units)" required>
              <input
                id="edit-camp-target"
                type="number"
                min={5}
                max={500}
                value={form.targetUnits}
                onChange={setField('targetUnits')}
                className={inputClass}
              />
            </Field>

            <Field id="edit-camp-status" label="Status" required>
              <select
                id="edit-camp-status"
                value={form.status}
                onChange={setField('status')}
                className={`${inputClass} cursor-pointer`}
              >
                {CAMP_STATUS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </Field>

            <div className="sm:col-span-2">
              <Field id="edit-camp-venue" label="Venue Location" required>
                <input
                  id="edit-camp-venue"
                  type="text"
                  required
                  maxLength={150}
                  value={form.venue}
                  onChange={setField('venue')}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field id="edit-camp-bank" label="Partner Blood Bank">
                <input
                  id="edit-camp-bank"
                  type="text"
                  maxLength={150}
                  value={form.partnerBloodBank}
                  onChange={setField('partnerBloodBank')}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field id="edit-camp-notes" label="Organizing Notes">
                <textarea
                  id="edit-camp-notes"
                  rows={2}
                  maxLength={300}
                  value={form.notes}
                  onChange={setField('notes')}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex cursor-pointer items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Camp
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
