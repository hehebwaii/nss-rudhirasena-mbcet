import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Plus, Tent } from 'lucide-react';
import Modal from '../Modal';
import { useOperations } from '../../context/OperationsContext';

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

export default function NewCampModal({ open, onClose }) {
  const { addCamp } = useOperations();
  const [form, setForm] = useState({
    name: '',
    date: new Date().toISOString().slice(0, 10),
    venue: '',
    partnerBloodBank: 'Govt. Medical College Blood Bank',
    targetUnits: 50,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.venue.trim()) {
      setError('Camp Name and Venue are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await addCamp({
        name: form.name.trim(),
        date: form.date,
        venue: form.venue.trim(),
        partnerBloodBank: form.partnerBloodBank.trim(),
        targetUnits: Number(form.targetUnits) || 50,
        collectedUnits: 0,
        status: 'Upcoming',
        notes: form.notes.trim(),
        donorIds: [],
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to create camp.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({
      name: '',
      date: new Date().toISOString().slice(0, 10),
      venue: '',
      partnerBloodBank: 'Govt. Medical College Blood Bank',
      targetUnits: 50,
      notes: '',
    });
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Blood Donation Drive / Camp"
      maxWidth="max-w-2xl"
    >
      {success ? (
        <div className="py-6 text-center">
          <span className="animate-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900">
            Donation Camp Created
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            You can now view the camp roster and log donor participation.
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="camp-name" label="Camp / Event Title" required>
                <input
                  id="camp-name"
                  type="text"
                  required
                  maxLength={150}
                  value={form.name}
                  onChange={setField('name')}
                  placeholder="e.g. MBCET Annual NSS Blood Donation Drive 2026"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field id="camp-date" label="Camp Date" required>
              <input
                id="camp-date"
                type="date"
                value={form.date}
                onChange={setField('date')}
                className={inputClass}
              />
            </Field>

            <Field id="camp-target" label="Target Collection (Units)" required>
              <input
                id="camp-target"
                type="number"
                min={5}
                max={500}
                value={form.targetUnits}
                onChange={setField('targetUnits')}
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field id="camp-venue" label="Venue Location" required>
                <input
                  id="camp-venue"
                  type="text"
                  required
                  maxLength={150}
                  value={form.venue}
                  onChange={setField('venue')}
                  placeholder="e.g. College Auditorium, MBCET Campus"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field id="camp-bank" label="Partner Blood Bank / Hospital">
                <input
                  id="camp-bank"
                  type="text"
                  maxLength={150}
                  value={form.partnerBloodBank}
                  onChange={setField('partnerBloodBank')}
                  placeholder="e.g. Govt. Medical College Blood Bank / RCC"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field id="camp-notes" label="Notes / Organizing Details">
                <textarea
                  id="camp-notes"
                  rows={2}
                  maxLength={300}
                  value={form.notes}
                  onChange={setField('notes')}
                  placeholder="e.g. Organized by NSS Unit 232 in association with Rudhirasena."
                  className={inputClass}
                />
              </Field>
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
              Create Camp
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
