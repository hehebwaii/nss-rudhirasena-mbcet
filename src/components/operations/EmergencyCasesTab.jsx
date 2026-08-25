import { useState, useMemo } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Filter,
  MapPin,
  Phone,
  Plus,
  Search,
  Sparkles,
  User,
  UserCheck,
} from 'lucide-react';
import { useOperations } from '../../context/OperationsContext';
import SmartDonorMatchModal from './SmartDonorMatchModal';
import NewEmergencyCaseModal from './NewEmergencyCaseModal';
import EditEmergencyCaseModal from './EditEmergencyCaseModal';
import { CASE_STATUS } from '../../utils/operations';

export default function EmergencyCasesTab() {
  const { cases, updateEmergencyCase, assignDonorToCase } = useOperations();
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseForMatch, setSelectedCaseForMatch] = useState(null);
  const [selectedCaseForEdit, setSelectedCaseForEdit] = useState(null);
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchStatus = statusFilter === 'All' || c.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.patientName.toLowerCase().includes(q) ||
        c.hospital.toLowerCase().includes(q) ||
        c.bloodGroup.toLowerCase().includes(q) ||
        c.assignedDonorName?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [cases, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const openCount = cases.filter((c) => c.status === 'Open').length;
    const inProgressCount = cases.filter((c) => c.status === 'In Progress').length;
    const criticalCount = cases.filter(
      (c) => c.urgency === 'Critical' && (c.status === 'Open' || c.status === 'In Progress')
    ).length;
    return { openCount, inProgressCount, criticalCount };
  }, [cases]);

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="hover-card-lift flex items-center justify-between rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-card">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
              </span>
              Critical Urgency
            </p>
            <p className="tnum mt-1 text-2xl font-black text-red-900">
              {stats.criticalCount}
            </p>
          </div>
          <span className="animate-pulse-subtle flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700 shadow-xs">
            <AlertCircle className="h-5 w-5" />
          </span>
        </div>

        <div className="hover-card-lift flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-card">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Open Requests
            </p>
            <p className="tnum mt-1 text-2xl font-black text-amber-950">
              {stats.openCount}
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 shadow-xs">
            <Clock className="h-5 w-5" />
          </span>
        </div>

        <div className="hover-card-lift flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-card">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              In Progress / Assigned
            </p>
            <p className="tnum mt-1 text-2xl font-black text-emerald-950">
              {stats.inProgressCount}
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 shadow-xs">
            <UserCheck className="h-5 w-5" />
          </span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, hospital, or blood group..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 text-xs">
            {['All', ...CASE_STATUS].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`cursor-pointer rounded-lg px-2.5 py-1 font-semibold transition-all active:scale-95 ${
                  statusFilter === status
                    ? 'bg-white text-red-700 shadow-xs ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsNewCaseOpen(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-red-800 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          New Emergency Request
        </button>
      </div>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredCases.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              No emergency cases match your search
            </p>
          </div>
        ) : (
          filteredCases.map((c) => {
            const isCritical = c.urgency === 'Critical';
            const isFulfilled = c.status === 'Fulfilled';

            return (
              <div
                key={c.id}
                className={`hover-card-lift flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-card ${
                  isCritical && !isFulfilled
                    ? 'border-red-300 ring-1 ring-red-100'
                    : 'border-slate-200/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-700 text-sm font-bold text-white shadow-xs transition-transform hover:scale-105">
                        {c.bloodGroup}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900">{c.patientName}</h4>
                        <p className="text-xs text-slate-400">{c.id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          c.urgency === 'Critical'
                            ? 'bg-red-100 text-red-700'
                            : c.urgency === 'Urgent'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {isCritical && !isFulfilled && (
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                        )}
                        {c.urgency}
                      </span>
                      <select
                        value={c.status}
                        onChange={(e) => updateEmergencyCase(c.id, { status: e.target.value })}
                        className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700 outline-none hover:bg-white"
                      >
                        {CASE_STATUS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      <span className="font-medium text-slate-800">{c.hospital}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      Required: {c.requiredDate} · {c.unitsNeeded} {c.unitsNeeded === 1 ? 'Unit' : 'Units'}
                    </p>
                    {c.contactPerson && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {c.contactPerson}
                      </p>
                    )}
                    {c.notes && (
                      <p className="mt-2 rounded-xl bg-slate-50 p-2 text-[11px] text-slate-600 italic">
                        "{c.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="min-w-0">
                    {c.assignedDonorName ? (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                        <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="truncate">Assigned: {c.assignedDonorName}</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        No donor assigned yet
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCaseForEdit(c)}
                      title="Edit Case Details"
                      className="flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCaseForMatch(c)}
                      className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 active:scale-95"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      {c.assignedDonorId ? 'Change Donor' : 'Smart Match'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Smart Match Modal */}
      {selectedCaseForMatch && (
        <SmartDonorMatchModal
          open={Boolean(selectedCaseForMatch)}
          emergencyCase={selectedCaseForMatch}
          onClose={() => setSelectedCaseForMatch(null)}
          onAssign={assignDonorToCase}
        />
      )}

      {/* Edit Emergency Request Modal */}
      {selectedCaseForEdit && (
        <EditEmergencyCaseModal
          open={Boolean(selectedCaseForEdit)}
          emergencyCase={selectedCaseForEdit}
          onClose={() => setSelectedCaseForEdit(null)}
        />
      )}

      {/* New Emergency Request Modal */}
      <NewEmergencyCaseModal
        open={isNewCaseOpen}
        onClose={() => setIsNewCaseOpen(false)}
      />
    </div>
  );
}
