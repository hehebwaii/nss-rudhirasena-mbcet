import { useState, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  AlertTriangle,
} from 'lucide-react';
import Modal from '../Modal';
import { useDonors } from '../../context/DonorContext';
import { findMatchingDonors } from '../../utils/operations';
import { formatShortDate, normalizeGroup } from '../../utils/donor';

export default function SmartDonorMatchModal({
  open,
  emergencyCase,
  onClose,
  onAssign,
}) {
  const lastCaseRef = useRef(emergencyCase);
  if (emergencyCase) lastCaseRef.current = emergencyCase;
  const activeCase = emergencyCase || lastCaseRef.current;

  const { donors } = useDonors();
  const [search, setSearch] = useState('');
  const [assigningId, setAssigningId] = useState(null);

  const matchedDonors = useMemo(() => {
    if (!activeCase) return [];
    return findMatchingDonors(
      activeCase.bloodGroup,
      activeCase.hospital,
      donors
    );
  }, [activeCase, donors]);

  const filteredMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return matchedDonors;
    return matchedDonors.filter((d) => {
      const name = String(d.Name || d.Full_Name || '').toLowerCase();
      const loc = String(d.Location || d.District_Location || '').toLowerCase();
      const dept = String(d.Department || '').toLowerCase();
      const bg = String(d['Blood Group'] || '').toLowerCase();
      return name.includes(q) || loc.includes(q) || dept.includes(q) || bg.includes(q);
    });
  }, [matchedDonors, search]);

  if (!activeCase) return null;

  const isAssigned = (donorId) => activeCase.assignedDonorId === donorId;

  const handleAssign = async (donor) => {
    const donorId = donor.ID || donor.Donor_ID;
    setAssigningId(donorId);
    try {
      await onAssign(activeCase.id, donor, 'In Progress');
      onClose();
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Smart Donor Match · ${activeCase.bloodGroup} Needed`}
      maxWidth="max-w-3xl"
    >
      {/* Case Overview Header */}
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-red-700 px-2 py-0.5 text-xs font-bold text-white">
                {emergencyCase.bloodGroup}
              </span>
              <h3 className="font-bold text-slate-900">
                {emergencyCase.patientName}
              </h3>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {emergencyCase.unitsNeeded} {emergencyCase.unitsNeeded === 1 ? 'Unit' : 'Units'}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-red-600 shrink-0" />
              {emergencyCase.hospital}
            </p>
          </div>

          <div className="text-right">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                emergencyCase.urgency === 'Critical'
                  ? 'bg-red-100 text-red-700 ring-1 ring-red-300'
                  : emergencyCase.urgency === 'Urgent'
                    ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                    : 'bg-blue-100 text-blue-800'
              }`}
            >
              {emergencyCase.urgency} Urgency
            </span>
            <p className="mt-1 text-[11px] text-slate-400">
              Needed by: {emergencyCase.requiredDate}
            </p>
          </div>
        </div>
      </div>

      {/* Matching Algorithm Summary */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>
            {matchedDonors.length} Eligible Compatible Donors in Database
          </span>
        </div>
        <div className="relative w-48 sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter matching donors..."
            className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pr-2.5 pl-8 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-1 focus:ring-red-100"
          />
        </div>
      </div>

      {/* Donors List */}
      <div className="mt-3 max-h-[22rem] space-y-2.5 overflow-y-auto pr-1">
        {filteredMatches.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              No eligible {emergencyCase.bloodGroup} donors found right now
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Registered donors may currently be in their cooling period.
            </p>
          </div>
        ) : (
          filteredMatches.map((donor) => {
            const donorId = donor.ID || donor.Donor_ID;
            const donorName = donor.Name || donor.Full_Name;
            const donorGroup = normalizeGroup(donor['Blood Group']);
            const isExact = donorGroup === normalizeGroup(emergencyCase.bloodGroup);
            const contact = String(donor.Contact || '').replace(/[\s-]/g, '');
            const assigned = isAssigned(donorId);

            return (
              <div
                key={donorId}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all ${
                  assigned
                    ? 'border-emerald-300 bg-emerald-50/60 shadow-xs'
                    : isExact
                      ? 'border-slate-200 bg-white hover:border-red-200 hover:shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                      isExact
                        ? 'bg-red-700 text-white'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {donorGroup}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {donorName}
                      </p>
                      {assigned && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> Assigned Donor
                        </span>
                      )}
                      {isExact && !assigned && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-inset ring-red-200">
                          Exact Match
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {donor.Department}
                      {donor.Year ? ` · ${donor.Year}` : ''} ·{' '}
                      <span className="text-slate-700 font-medium">
                        {donor.Location || 'Trivandrum'}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      ID: {donorId} · Last Donated:{' '}
                      {formatShortDate(donor['Last Donated Date'])}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {contact && (
                    <>
                      <a
                        href={`tel:${contact}`}
                        title="Call Donor"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                      <a
                        href={`https://wa.me/${contact}?text=${encodeURIComponent(
                          `Hello ${donorName}, urgent blood requirement for patient ${emergencyCase.patientName} (${emergencyCase.bloodGroup}) at ${emergencyCase.hospital}. Are you available to donate? - NSS Rudhirasena`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="WhatsApp Donor"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </>
                  )}

                  <button
                    type="button"
                    disabled={assigningId === donorId}
                    onClick={() => handleAssign(donor)}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-60 ${
                      assigned
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-red-700 text-white hover:bg-red-800 shadow-xs'
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    {assigned ? 'Re-assign' : 'Assign to Case'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
