import { useState, useMemo } from 'react';
import {
  Calendar,
  Droplet,
  Edit3,
  ExternalLink,
  MapPin,
  Plus,
  Search,
  User,
  HeartHandshake,
} from 'lucide-react';
import { useOperations } from '../../context/OperationsContext';
import LogVoluntaryDonationModal from './LogVoluntaryDonationModal';
import EditVoluntaryDonationModal from './EditVoluntaryDonationModal';
import { formatShortDate } from '../../utils/donor';

export default function VoluntaryDonationsTab() {
  const { voluntaryLogs } = useOperations();
  const [search, setSearch] = useState('');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState(null);

  const filteredLogs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return voluntaryLogs;
    return voluntaryLogs.filter((log) => {
      return (
        log.donorName.toLowerCase().includes(q) ||
        log.donorId.toLowerCase().includes(q) ||
        log.venue.toLowerCase().includes(q) ||
        log.bloodGroup.toLowerCase().includes(q)
      );
    });
  }, [voluntaryLogs, search]);

  const totalUnits = useMemo(() => {
    return voluntaryLogs.reduce((acc, curr) => acc + (Number(curr.units) || 1), 0);
  }, [voluntaryLogs]);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-card">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-600">
              Total Voluntary Donations
            </p>
            <p className="tnum mt-1 text-2xl font-black text-red-900">
              {voluntaryLogs.length}
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
            <HeartHandshake className="h-5 w-5" />
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Units Contributed
            </p>
            <p className="tnum mt-1 text-2xl font-black text-slate-900">
              {totalUnits} Units
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Droplet className="h-5 w-5" />
          </span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-[14rem] flex-1 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search donor name, ID, hospital venue..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsLogModalOpen(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-red-800 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Log Voluntary Donation
        </button>
      </div>

      {/* Logs Table / List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <HeartHandshake className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              No voluntary donations recorded yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3">Donor</th>
                  <th className="px-4 py-3">Blood Group</th>
                  <th className="px-4 py-3">Hospital / Venue</th>
                  <th className="px-4 py-3">Donation Type</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Units</th>
                  <th className="px-4 py-3">Certificate</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{log.donorName}</p>
                        <p className="text-xs text-slate-400">{log.donorId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-200">
                          {log.bloodGroup || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {log.venue}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {log.donationType}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {formatShortDate(log.donationDate)}
                      </td>
                      <td className="tnum px-4 py-3 font-bold text-slate-900">
                        {log.units} {log.units === 1 ? 'Unit' : 'Units'}
                      </td>
                      <td className="px-4 py-3">
                        {log.certificateUrl ? (
                          <a
                            href={log.certificateUrl.split(',')[0].trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLogForEdit(log)}
                          title="Edit Donation Log"
                          className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Modal */}
      <LogVoluntaryDonationModal
        open={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
      />

      {/* Edit Modal */}
      {selectedLogForEdit && (
        <EditVoluntaryDonationModal
          open={Boolean(selectedLogForEdit)}
          donationLog={selectedLogForEdit}
          onClose={() => setSelectedLogForEdit(null)}
        />
      )}
    </div>
  );
}
