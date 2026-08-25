import { useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  TriangleAlert,
  UserPlus,
} from 'lucide-react';
import Modal from './Modal';
import { useDonors } from '../context/DonorContext';
import { BLOOD_GROUPS, YEARS, todayISO } from '../utils/donor';

const DONATION_TYPES = ['Whole Blood', 'Platelets', 'Plasma'];
const GENDERS = ['Male', 'Female'];

const initialForm = {
  Name: '',
  'Blood Group': '',
  Contact: '',
  Department: '',
  Year: '1st Year',
  Age: '',
  Weight: '',
  Gender: '',
  Location: '',
  'Last Donated Date': '',
  'Last Donation Type': '',
  'Last Donation Venue': '',
  'Certificate URL': '',
};

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100';

function Field({ id, label, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="text-red-600"> *</span> : ''}
      </label>
      {children}
    </div>
  );
}

export default function RegisterDonorModal({ open, onClose, onRegistered }) {
  const { addDonor } = useDonors();
  const [form, setForm] = useState(initialForm);
  const [phase, setPhase] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);

  const setField = (key) => (event) => {
    const value = event.target.value;
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const resetAndClose = () => {
    setForm(initialForm);
    setPhase('idle');
    setErrorMessage('');
    setResult(null);
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setPhase('submitting');
    setErrorMessage('');
    try {
      const payload = {
        // Compatibility snake_case keys
        Full_Name: form.Name.trim(),
        Blood_Group: form['Blood Group'],
        Contact_Number: form.Contact.replace(/[\s-]/g, ''),
        Department_Year: form.Department.trim() + (form.Year ? ` - ${form.Year}` : ''),
        Year_of_Study: form.Year,
        Year: form.Year,
        Weight_kg: Number(form.Weight),
        District_Location: form.Location.trim(),
        Last_Donated_Date: form['Last Donated Date'],
        Last_Donation_Type: form['Last Donation Type'],
        Last_Donation_Venue: form['Last Donation Venue'].trim(),
        Certificate_URL: form['Certificate URL'].trim(),

        // Canonical keys
        Name: form.Name.trim(),
        'Blood Group': form['Blood Group'],
        Contact: form.Contact.replace(/[\s-]/g, ''),
        Department: form.Department.trim(),
        Weight: Number(form.Weight),
        Location: form.Location.trim(),
        'Last Donated Date': form['Last Donated Date'],
        'Last Donation Type': form['Last Donation Type'],
        'Last Donation Venue': form['Last Donation Venue'].trim(),
        'Certificate URL': form['Certificate URL'].trim(),
      };
      const data = await addDonor(payload);
      setResult(data);
      setPhase('success');
      if (typeof onRegistered === 'function') onRegistered();
    } catch (err) {
      setErrorMessage(err.message || 'Could not register the donor.');
      setPhase('idle');
    }
  };

  const submitting = phase === 'submitting';

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title="Register New Donor"
      maxWidth="max-w-2xl"
    >
      {phase === 'success' ? (
        <div className="py-6 text-center">
          <span className="animate-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900">
            Donor registered
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {form.Name.trim()} has been added to the registry.
          </p>
          {result && result.nextEligibleDate ? (
            <p className="tnum mt-4 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
              Next eligible: {result.nextEligibleDate}
            </p>
          ) : null}
          <div className="mt-6">
            <button
              type="button"
              onClick={resetAndClose}
              className="cursor-pointer rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="reg-name" label="Full Name" required>
                <input
                  id="reg-name"
                  type="text"
                  required
                  maxLength={100}
                  value={form.Name}
                  onChange={setField('Name')}
                  placeholder="e.g. Arjun Menon"
                  autoComplete="off"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field id="reg-blood-group" label="Blood Group" required>
              <select
                id="reg-blood-group"
                required
                value={form['Blood Group']}
                onChange={setField('Blood Group')}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="" disabled>
                  Select blood group
                </option>
                {BLOOD_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="reg-contact" label="Contact Number" required>
              <input
                id="reg-contact"
                type="tel"
                required
                inputMode="tel"
                minLength={7}
                maxLength={15}
                value={form.Contact}
                onChange={setField('Contact')}
                placeholder="9876543210"
                className={inputClass}
              />
            </Field>

            <Field id="reg-department" label="Department" required>
              <input
                id="reg-department"
                type="text"
                required
                maxLength={100}
                value={form.Department}
                onChange={setField('Department')}
                placeholder="e.g. Computer Science"
                className={inputClass}
              />
            </Field>

            <Field id="reg-year" label="Year of Study" required>
              <select
                id="reg-year"
                required
                value={form.Year}
                onChange={setField('Year')}
                className={`${inputClass} cursor-pointer`}
              >
                {YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="reg-age" label="Age" required>
              <input
                id="reg-age"
                type="number"
                required
                min={16}
                max={100}
                value={form.Age}
                onChange={setField('Age')}
                placeholder="18"
                className={inputClass}
              />
            </Field>

            <Field id="reg-weight" label="Weight (kg)" required>
              <input
                id="reg-weight"
                type="number"
                required
                min={25}
                max={250}
                value={form.Weight}
                onChange={setField('Weight')}
                placeholder="55"
                className={inputClass}
              />
            </Field>

            <Field id="reg-gender" label="Gender" required>
              <select
                id="reg-gender"
                required
                value={form.Gender}
                onChange={setField('Gender')}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="" disabled>
                  Select gender
                </option>
                {GENDERS.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="reg-location" label="Location" required>
              <input
                id="reg-location"
                type="text"
                required
                maxLength={150}
                value={form.Location}
                onChange={setField('Location')}
                placeholder="e.g. Kochi"
                className={inputClass}
              />
            </Field>

            <Field id="reg-last-date" label="Last Donated Date" required>
              <input
                id="reg-last-date"
                type="date"
                required
                max={todayISO()}
                value={form['Last Donated Date']}
                onChange={setField('Last Donated Date')}
                className={`${inputClass} cursor-pointer`}
              />
            </Field>

            <Field id="reg-donation-type" label="Last Donation Type" required>
              <select
                id="reg-donation-type"
                required
                value={form['Last Donation Type']}
                onChange={setField('Last Donation Type')}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="" disabled>
                  Select type
                </option>
                {DONATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <div className="sm:col-span-2">
              <Field id="reg-venue" label="Last Donation Venue" required>
                <input
                  id="reg-venue"
                  type="text"
                  required
                  maxLength={150}
                  value={form['Last Donation Venue']}
                  onChange={setField('Last Donation Venue')}
                  placeholder="e.g. NSS Camp, Govt. College"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field id="reg-certificate" label="Certificate Link">
                <input
                  id="reg-certificate"
                  type="url"
                  maxLength={500}
                  value={form['Certificate URL']}
                  onChange={setField('Certificate URL')}
                  placeholder="https://drive.google.com/…"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={resetAndClose}
              disabled={submitting}
              className="cursor-pointer rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-[color,background-color,transform] duration-150 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-[background-color,transform,box-shadow] duration-150 hover:bg-red-800 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {submitting ? 'Registering…' : 'Register Donor'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
