import { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  FileSpreadsheet,
  MapPin,
  Plus,
  QrCode,
  Search,
  Tent,
  Users,
} from 'lucide-react';
import { useOperations } from '../../context/OperationsContext';
import NewCampModal from './NewCampModal';
import EditCampModal from './EditCampModal';
import CampDetailsModal from './CampDetailsModal';
import ImportCampRosterModal from './ImportCampRosterModal';
import CampQRScannerModal from '../CampQRScannerModal';
import { formatShortDate } from '../../utils/donor';
import { CAMP_STATUS } from '../../utils/operations';

export default function CampsTab({ onRegisterNewDonor }) {
  const { camps, updateCamp } = useOperations();
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewCampOpen, setIsNewCampOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerCampId, setScannerCampId] = useState(null);
  const [selectedCampId, setSelectedCampId] = useState(null);
  const [selectedCampForEditId, setSelectedCampForEditId] = useState(null);
  const [selectedCampForImportId, setSelectedCampForImportId] = useState(null);

  const filteredCamps = useMemo(() => {
    return camps.filter((c) => {
      const matchStatus = statusFilter === 'All' || c.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.venue.toLowerCase().includes(q) ||
        c.partnerBloodBank.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [camps, statusFilter, searchQuery]);

  const activeCamp = useMemo(() => {
    if (!selectedCampId) return null;
    return camps.find((c) => c.id === selectedCampId) || null;
  }, [camps, selectedCampId]);

  const activeCampForEdit = useMemo(() => {
    if (!selectedCampForEditId) return null;
    return camps.find((c) => c.id === selectedCampForEditId) || null;
  }, [camps, selectedCampForEditId]);

  const activeCampForImport = useMemo(() => {
    if (!selectedCampForImportId) return null;
    return camps.find((c) => c.id === selectedCampForImportId) || null;
  }, [camps, selectedCampForImportId]);

  const stats = useMemo(() => {
    const totalCollected = camps.reduce((acc, c) => acc + (Number(c.collectedUnits) || 0), 0);
    const upcomingCount = camps.filter((c) => c.status === 'Upcoming' || c.status === 'Ongoing').length;
    return { totalCollected, upcomingCount };
  }, [camps]);

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="hover-card-lift flex items-center justify-between rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-card">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-600">
              Total Units Collected in Camps
            </p>
            <p className="tnum mt-1 text-2xl font-black text-red-900">
              {stats.totalCollected} Units
            </p>
          </div>
          <span className="animate-pulse-subtle flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700 shadow-xs">
            <Tent className="h-5 w-5" />
          </span>
        </div>

        <div className="hover-card-lift flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Upcoming / Active Drives
            </p>
            <p className="tnum mt-1 text-2xl font-black text-slate-900">
              {stats.upcomingCount} Camps
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow-xs">
            <Calendar className="h-5 w-5" />
          </span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-[14rem] flex-1 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search camp by name, venue or partner blood bank..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setScannerCampId(null);
              setIsScannerOpen(true);
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 shadow-xs transition-all hover:bg-red-100 active:scale-95"
          >
            <QrCode className="h-4 w-4 text-red-700" />
            <span>Scan Donor QR</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewCampOpen(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-red-800 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Schedule New Camp Drive
          </button>
        </div>
      </div>

      {/* Camps Cards Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredCamps.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Tent className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              No blood donation camps found
            </p>
          </div>
        ) : (
          filteredCamps.map((camp) => {
            const target = Number(camp.targetUnits) || 50;
            const collected = Number(camp.collectedUnits) || (camp.donorIds ? camp.donorIds.length : 0);
            const percentage = Math.min(100, Math.round((collected / target) * 100));
            const isOngoing = camp.status === 'Ongoing';

            return (
              <div
                key={camp.id}
                className={`hover-card-lift flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-card ${
                  isOngoing ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900">{camp.name}</h4>
                        {isOngoing && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                            Live Now
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{camp.id}</p>
                    </div>

                    <select
                      value={camp.status}
                      onChange={(e) => updateCamp(camp.id, { status: e.target.value })}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700 outline-none hover:bg-white transition-colors"
                    >
                      {CAMP_STATUS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      <span className="font-medium text-slate-800">{camp.venue}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      Date: {formatShortDate(camp.date)} · Partner: {camp.partnerBloodBank}
                    </p>
                    {camp.notes && (
                      <p className="text-[11px] text-slate-500 italic mt-1">
                        "{camp.notes}"
                      </p>
                    )}
                  </div>

                  {/* Progress Meter with smooth animation */}
                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                      <span>Collection Metric</span>
                      <span className="tnum font-bold text-slate-900">
                        {collected} / {target} units ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-700 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="text-xs font-medium text-slate-500">
                    {camp.donorIds ? camp.donorIds.length : 0} Donors on Roster
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setScannerCampId(camp.id);
                        setIsScannerOpen(true);
                      }}
                      title="Quick Scan Donor QR Check-in for this Camp"
                      className="flex cursor-pointer items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 active:scale-95 transition-colors"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>Scan QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCampForImportId(camp.id)}
                      title="Import Excel / Google Form Responses"
                      className="flex cursor-pointer items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-colors"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
                      Import Form
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCampForEditId(camp.id)}
                      title="Edit Camp Details"
                      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCampId(camp.id)}
                      className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-800 active:scale-95"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Manage Roster
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Camp Modal */}
      <NewCampModal
        open={isNewCampOpen}
        onClose={() => setIsNewCampOpen(false)}
      />

      {/* Edit Camp Modal */}
      {activeCampForEdit && (
        <EditCampModal
          open={Boolean(activeCampForEdit)}
          camp={activeCampForEdit}
          onClose={() => setSelectedCampForEditId(null)}
        />
      )}

      {/* Import Excel / Form Modal */}
      {activeCampForImport && (
        <ImportCampRosterModal
          open={Boolean(activeCampForImport)}
          camp={activeCampForImport}
          onClose={() => setSelectedCampForImportId(null)}
        />
      )}

      {/* Camp Details & Roster Modal */}
      {activeCamp && (
        <CampDetailsModal
          open={Boolean(activeCamp)}
          camp={activeCamp}
          onClose={() => setSelectedCampId(null)}
          onRegisterNewDonor={onRegisterNewDonor}
        />
      )}

      {/* Camp QR Scanner Modal */}
      <CampQRScannerModal
        open={isScannerOpen}
        defaultCampId={scannerCampId}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
}
