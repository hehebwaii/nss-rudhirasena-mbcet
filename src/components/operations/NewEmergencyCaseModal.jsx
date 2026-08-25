import { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ClipboardPaste, Loader2, Plus, Sparkles } from 'lucide-react';
import Modal from '../Modal';
import { useOperations } from '../../context/OperationsContext';
import { BLOOD_GROUPS, formatDonorName } from '../../utils/donor';
import { URGENCY_LEVELS, parseBroadcastMessage } from '../../utils/operations';

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

export default function NewEmergencyCaseModal({ open, onClose }) {
  const { addEmergencyCase } = useOperations();
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [form, setForm] = useState({
    patientName: '',
    hospital: '',
    bloodGroup: 'O+',
    unitsNeeded: 1,
    urgency: 'Urgent',
    requiredDate: new Date().toISOString().slice(0, 10),
    contactPerson: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleApplyBroadcast = () => {
    if (!pasteText.trim()) return;
    const parsed = parseBroadcastMessage(pasteText);
    if (parsed) {
      setForm((prev) => ({
        ...prev,
        patientName: parsed.patientName || prev.patientName,
        hospital: parsed.hospital || prev.hospital,
        bloodGroup: parsed.bloodGroup || prev.bloodGroup,
        unitsNeeded: parsed.unitsNeeded || prev.unitsNeeded,
        urgency: parsed.urgency || prev.urgency,
        requiredDate: parsed.requiredDate || prev.requiredDate,
        contactPerson: parsed.contactPerson || prev.contactPerson,
        notes: parsed.notes || prev.notes,
      }));
      setShowPasteBox(false);
      setPasteText('');
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patientName.trim() || !form.hospital.trim()) {
      setError('Patient Name and Hospital location are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await addEmergencyCase({
        patientName: formatDonorName(form.patientName.trim()),
        hospital: form.hospital.trim(),
        bloodGroup: form.bloodGroup,
        unitsNeeded: Number(form.unitsNeeded) || 1,
        urgency: form.urgency,
        requiredDate: form.requiredDate,
        contactPerson: form.contactPerson.trim(),
        notes: form.notes.trim(),
        status: 'Open',
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to create emergency case.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({
      patientName: '',
      hospital: '',
      bloodGroup: 'O+',
      unitsNeeded: 1,
      urgency: 'Urgent',
      requiredDate: new Date().toISOString().slice(0, 10),
      contactPerson: '',
      notes: '',
    });
    setShowPasteBox(false);
    setPasteText('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Emergency Blood Request"
      maxWidth="max-w-2xl"
    >
      {success ? (
        <div className="py-6 text-center">
          <span className="animate-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900">
            Emergency Case Registered
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            You can now use Smart Match to find eligible donors from the database.
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
        <div className="space-y-4">
          {/* WhatsApp / KTU Broadcast Message Quick-Parser */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Sparkles className="h-4 w-4 text-red-600" />
                KTU NSS Broadcast / WhatsApp Message Auto-Fill
              </span>
              <button
                type="button"
                onClick={() => setShowPasteBox((prev) => !prev)}
                className="cursor-pointer text-xs font-bold text-red-700 hover:underline"
              >
                {showPasteBox ? 'Hide Paste Box' : '+ Paste Broadcast Text'}
              </button>
            </div>

            {showPasteBox && (
              <div className="mt-3 space-y-2">
                <textarea
                  rows={4}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste standard KTU NSS Blood Cell message here..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleApplyBroadcast}
                    disabled={!pasteText.trim()}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-red-800 disabled:opacity-50"
                  >
                    <ClipboardPaste className="h-3.5 w-3.5" />
                    Auto-Fill Form
                  </button>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="case-patient" label="Patient Name" required>
                <input
                  id="case-patient"
                  type="text"
                  required
                  maxLength={100}
                  value={form.patientName}
                  onChange={setField('patientName')}
                  placeholder="e.g. Karthik Narayanan"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field id="case-hospital" label="Hospital / Blood Bank Venue" required>
                <input
                  id="case-hospital"
                  type="text"
                  required
                  maxLength={150}
                  value={form.hospital}
                  onChange={setField('hospital')}
                  placeholder="e.g. Regional Cancer Centre (RCC), Trivandrum"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field id="case-bg" label="Required Blood Group" required>
              <select
                id="case-bg"
                value={form.bloodGroup}
                onChange={setField('bloodGroup')}
                className={`${inputClass} cursor-pointer`}
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="case-units" label="Units Needed" required>
              <input
                id="case-units"
                type="number"
                min={1}
                max={20}
                value={form.unitsNeeded}
                onChange={setField('unitsNeeded')}
                className={inputClass}
              />
            </Field>

            <Field id="case-urgency" label="Urgency Level" required>
              <select
                id="case-urgency"
                value={form.urgency}
                onChange={setField('urgency')}
                className={`${inputClass} cursor-pointer`}
              >
                {URGENCY_LEVELS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="case-date" label="Required Date" required>
              <input
                id="case-date"
                type="date"
                value={form.requiredDate}
                onChange={setField('requiredDate')}
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field id="case-contact" label="Contact Person & Phone Number" required>
                <input
                  id="case-contact"
                  type="text"
                  maxLength={150}
                  value={form.contactPerson}
                  onChange={setField('contactPerson')}
                  placeholder="e.g. +91 94471 23456 (Dr. Mathew)"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field id="case-notes" label="Case Details & Clinical Notes">
                <textarea
                  id="case-notes"
                  rows={2}
                  maxLength={300}
                  value={form.notes}
                  onChange={setField('notes')}
                  placeholder="e.g. Platelet requirement for emergency surgery."
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
              Create Case
            </button>
          </div>
        </form>
        </div>
      )}
    </Modal>
  );
}
