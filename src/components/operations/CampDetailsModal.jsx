import { useState, useMemo, useRef } from 'react';
import {
  Calendar,
  CheckCircle2,
  Edit3,
  FileSpreadsheet,
  MapPin,
  Plus,
  Search,
  Tent,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import Modal from '../Modal';
import EditCampModal from './EditCampModal';
import ImportCampRosterModal from './ImportCampRosterModal';
import { useOperations } from '../../context/OperationsContext';
import { useDonors } from '../../context/DonorContext';
import { formatShortDate } from '../../utils/donor';

export default function CampDetailsModal({ open, camp, onClose, onRegisterNewDonor }) {
  const lastCampRef = useRef(camp);
  if (camp) lastCampRef.current = camp;
  const activeCamp = camp || lastCampRef.current;

  const { addDonorToCampRoster, removeDonorFromCampRoster, updateCamp } = useOperations();
  const { donors } = useDonors();

  const [donorSearch, setDonorSearch] = useState('');
  const [isAddingDonor, setIsAddingDonor] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const participatingDonors = useMemo(() => {
    if (!activeCamp || !activeCamp.donorIds) return [];
    return donors.filter((d) => {
      const id = d.ID || d.Donor_ID;
      return activeCamp.donorIds.includes(id);
    });
  }, [activeCamp, donors]);

  const availableDonors = useMemo(() => {
    if (!activeCamp) return [];
    const q = donorSearch.toLowerCase().trim();
    return donors.filter((d) => {
      const id = d.ID || d.Donor_ID;
      const notInCamp = !activeCamp.donorIds.includes(id);
      if (!notInCamp) return false;
      if (!q) return true;
      const name = String(d.Name || d.Full_Name || '').toLowerCase();
      const bg = String(d['Blood Group'] || '').toLowerCase();
      return name.includes(q) || id.toLowerCase().includes(q) || bg.includes(q);
    });
  }, [donors, activeCamp, donorSearch]);

  if (!activeCamp) return null;

  const target = Number(activeCamp.targetUnits) || 50;
  const collected = Number(activeCamp.collectedUnits) || participatingDonors.length;
  const percentage = Math.min(100, Math.round((collected / target) * 100));

  const handleAddDonor = async (donor) => {
    await addDonorToCampRoster(activeCamp.id, donor);
  };

  const handleRemoveDonor = async (donorId) => {
    await removeDonorFromCampRoster(activeCamp.id, donorId);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={activeCamp.name}
      maxWidth="max-w-3xl"
    >
      {/* Camp Header Details */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                  {camp.id}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    camp.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : camp.status === 'Ongoing'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {camp.status}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit Camp
                </button>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-red-600 shrink-0" />
                {camp.venue}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                {formatShortDate(camp.date)} · Partner: {camp.partnerBloodBank}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">Total Collected</p>
              <p className="tnum text-2xl font-black text-slate-900">
                {collected} <span className="text-sm font-semibold text-slate-400">/ {target} units</span>
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
              <span>Collection Progress</span>
              <span>{percentage}% of target</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-red-600 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Camp Donors Roster */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Users className="h-4 w-4 text-red-600" />
              Camp Donors Roster ({participatingDonors.length} Donors)
            </h4>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-xs transition-colors"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
                Import Excel / Form
              </button>
              <button
                type="button"
                onClick={() => setIsAddingDonor(!isAddingDonor)}
                className="cursor-pointer rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                {isAddingDonor ? 'Close Search' : '+ Add Registered Donor'}
              </button>
              {onRegisterNewDonor && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRegisterNewDonor();
                  }}
                  className="flex cursor-pointer items-center gap-1 rounded-xl bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800 shadow-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  New Spot Registration
                </button>
              )}
            </div>
          </div>

          {/* Search & Add Roster Section */}
          {isAddingDonor && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={donorSearch}
                  onChange={(e) => setDonorSearch(e.target.value)}
                  placeholder="Search registered donors to add to this camp roster..."
                  className="w-full rounded-xl border border-slate-200 py-1.5 pr-3 pl-8 text-xs text-slate-800 outline-none focus:border-red-500"
                />
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1">
                {availableDonors.length === 0 ? (
                  <p className="p-3 text-center text-xs text-slate-400">
                    No matching donors available to add.
                  </p>
                ) : (
                  availableDonors.slice(0, 6).map((d) => {
                    const id = d.ID || d.Donor_ID;
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                            {d['Blood Group']}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {d.Name || d.Full_Name}
                          </span>
                          <span className="text-[11px] text-slate-400">({id})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddDonor(d)}
                          className="flex cursor-pointer items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800"
                        >
                          <Plus className="h-3 w-3" />
                          Add to Roster
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Roster List Table */}
          <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
            {participatingDonors.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No donors logged on this camp roster yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-slate-100 bg-slate-50/90 font-bold text-slate-600 backdrop-blur-xs">
                  <tr>
                    <th className="px-3.5 py-2.5">Donor</th>
                    <th className="px-3.5 py-2.5">Group</th>
                    <th className="px-3.5 py-2.5">Department & Year</th>
                    <th className="px-3.5 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {participatingDonors.map((donor, idx) => {
                    const donorId = donor.ID || donor.Donor_ID;
                    return (
                      <tr key={donorId || idx} className="hover:bg-slate-50/50">
                        <td className="px-3.5 py-2">
                          <p className="font-bold text-slate-900">
                            {donor.Name || donor.Full_Name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {donorId}
                          </p>
                        </td>
                        <td className="px-3.5 py-2">
                          <span className="rounded bg-red-50 px-1.5 py-0.5 font-bold text-red-700">
                            {donor['Blood Group']}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 text-slate-600">
                          {donor.Department}
                          {donor.Year ? ` · ${donor.Year}` : ''}
                        </td>
                        <td className="px-3.5 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> 1 Unit
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDonor(donorId)}
                              title="Remove from Camp Roster"
                              className="cursor-pointer rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      {/* Edit Camp Modal */}
      {isEditOpen && (
        <EditCampModal
          open={isEditOpen}
          camp={camp}
          onClose={() => {
            setIsEditOpen(false);
          }}
        />
      )}

      {/* Excel / Google Form Import Modal */}
      {isImportOpen && (
        <ImportCampRosterModal
          open={isImportOpen}
          camp={camp}
          onClose={() => setIsImportOpen(false)}
        />
      )}
    </Modal>
  );
}
