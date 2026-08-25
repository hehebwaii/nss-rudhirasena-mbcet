import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Loader2,
  Save,
  TriangleAlert,
} from 'lucide-react';
import Modal from './Modal';
import { useDonors } from '../context/DonorContext';
import { BLOOD_GROUPS, todayISO } from '../utils/donor';

const DONATION_TYPES = ['Whole Blood', 'Platelets', 'Plasma'];
const GENDERS = ['Male', 'Female'];

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

export default function EditDonorModal({ open, donor, onClose, onUpdated }) {
  const { updateDonor } = useDonors();
  const [form, setForm] = useState({
    Name: '',
    'Blood Group': '',
    Contact: '',
    Department: '',
    Age: '',
    Weight: '',
    Gender: '',
    Location: '',
    'Last Donated Date': '',
    'Last Donation Type': '',
    'Last Donation Venue': '',
    'Certificate URL': '',
  });

  const [phase, setPhase] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (donor && open) {
      setForm({
        Name: donor.Name || donor.Full_Name || '',
        'Blood Group': donor['Blood Group'] || donor.Blood_Group || '',
        Contact: donor.Contact ? String(donor.Contact) : '',
        Department: donor.Department || donor.Department_Year || '',
        Age: donor.Age != null && donor.Age !== '' ? donor.Age : '',
        Weight: donor.Weight != null && donor.Weight !== '' ? donor.Weight : '',
        Gender: donor.Gender || '',
        Location: donor.Location || donor.District_Location || '',
        'Last Donated Date': donor['Last Donated Date'] ? String(donor['Last Donated Date']).slice(0, 10) : '',
        'Last Donation Type': donor['Last Donation Type'] || '',
        'Last Donation Venue': donor['Last Donation Venue'] || '',
        'Certificate URL': donor['Certificate URL'] ? String(donor['Certificate URL']) : '',
      });
      setPhase('idle');
      setErrorMessage('');
      setResult(null);
    }
  }, [donor, open]);

  const setField = (key) => (event) => {
    const value = event.target.value;
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!donor) return;

    setPhase('submitting');
    setErrorMessage('');

    try {
      const payload = {
        action: 'update',
        ID: donor.ID || donor.Donor_ID,
        Donor_ID: donor.ID || donor.Donor_ID,
        Full_Name: form.Name.trim(),
        Blood_Group: form['Blood Group'],
        Contact_Number: form.Contact.replace(/[\s-]/g, ''),
        Department_Year: form.Department.trim(),
        Age: form.Age ? Number(form.Age) : '',
        Weight_kg: form.Weight ? Number(form.Weight) : '',
        Gender: form.Gender,
        District_Location: form.Location.trim(),
        Last_Donated_Date: form['Last Donated Date'],
        Last_Donation_Type: form['Last Donation Type'],
        Last_Donation_Venue: form['Last Donation Venue'].trim(),
        Certificate_URL: form['Certificate URL'].trim(),

        Name: form.Name.trim(),
        'Blood Group': form['Blood Group'],
        Contact: form.Contact.replace(/[\s-]/g, ''),
        Department: form.Department.trim(),
        Weight: form.Weight ? Number(form.Weight) : '',
        Location: form.Location.trim(),
        'Last Donated Date': form['Last Donated Date'],
        'Last Donation Type': form['Last Donation Type'],
        'Last Donation Venue': form['Last Donation Venue'].trim(),
        'Certificate URL': form['Certificate URL'].trim(),
      };

      const res = await updateDonor(donor.ID || donor.Donor_ID, payload);
      setResult(res);
      setPhase('success');
      if (typeof onUpdated === 'function') onUpdated();
    } catch (err) {
      setErrorMessage(err.message || 'Could not update donor details.');
      setPhase('idle');
    }
  };

  const submitting = phase === 'submitting';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit Details · ${donor ? donor.ID || donor.Donor_ID : 'Member'}`}
      maxWidth="max-w-2xl"
    >
      {phase === 'success' ? (
        <div className="py-6 text-center">
          <span className="animate-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900">
            Donor Details Updated
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Changes for <span className="font-semibold text-slate-800">{form.Name.trim() || donor?.ID}</span> have been saved.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-slate-900 active:scale-[0.98]"
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
              <Field id="edit-name" label="Full Name" required>
                <input
                  id="edit-name"
                  type="text"
                  required
                  maxLength={100}
                  value={form.Name}
                  onChange={setField('Name')}
                  placeholder="e.g. Arjun Menon"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field id="edit-blood-group" label="Blood Group" required>
              <select
                id="edit-blood-group"
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

            <Field id="edit-contact" label="Contact Number" required>
              <input
                id="edit-contact"
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

            <Field id="edit-department" label="Department" required>
              <input
                id="edit-department"
                type="text"
                required
                maxLength={100}
                value={form.Department}
                onChange={setField('Department')}
                placeholder="e.g. Computer Science"
                className={inputClass}
              />
            </Field>

            <Field id="edit-age" label="Age" required>
              <input
                id="edit-age"
                type="number"
                required
                min={16}
                max={100}
                value={form.Age}
                onChange={setField('Age')}
                placeholder="19"
                className={inputClass}
              />
            </Field>

            <Field id="edit-weight" label="Weight (kg)" required>
              <input
                id="edit-weight"
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

            <Field id="edit-gender" label="Gender" required>
              <select
                id="edit-gender"
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

            <Field id="edit-location" label="Location" required>
              <input
                id="edit-location"
                type="text"
                required
                maxLength={150}
                value={form.Location}
                onChange={setField('Location')}
                placeholder="e.g. Kochi"
                className={inputClass}
              />
            </Field>

            <Field id="edit-last-date" label="Last Donated Date">
              <input
                id="edit-last-date"
                type="date"
                max={todayISO()}
                value={form['Last Donated Date']}
                onChange={setField('Last Donated Date')}
                className={`${inputClass} cursor-pointer`}
              >
              </input>
            </Field>

            <Field id="edit-donation-type" label="Last Donation Type">
              <select
                id="edit-donation-type"
                value={form['Last Donation Type']}
                onChange={setField('Last Donation Type')}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">None / Not Donated Yet</option>
                {DONATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <div className="sm:col-span-2">
              <Field id="edit-venue" label="Last Donation Venue">
                <input
                  id="edit-venue"
                  type="text"
                  maxLength={150}
                  value={form['Last Donation Venue']}
                  onChange={setField('Last Donation Venue')}
                  placeholder="e.g. NSS Blood Donation Camp"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field id="edit-certificate" label="Certificate Link">
                <input
                  id="edit-certificate"
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
              onClick={onClose}
              disabled={submitting}
              className="cursor-pointer rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-400 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-red-700 disabled:opacity-70"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {submitting ? 'Saving Changes…' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
