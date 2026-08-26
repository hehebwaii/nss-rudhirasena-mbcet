import { useMemo, useState } from 'react';
import {
  Check,
  CheckSquare,
  Download,
  Grid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  TriangleAlert,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useDonors } from '../context/DonorContext';
import DonorTable from '../components/DonorTable';
import DonorCard from '../components/DonorCard';
import DonorProfileModal from '../components/DonorProfileModal';
import RegisterDonorModal from '../components/RegisterDonorModal';
import EditDonorModal from '../components/EditDonorModal';
import DigitalDonorCardModal from '../components/DigitalDonorCardModal';
import Modal from '../components/Modal';
import {
  BLOOD_GROUPS,
  YEARS,
  getEligibility,
  getEligibilityDetails,
  normalizeGroup,
  uniqueLocations,
} from '../utils/donor';

export default function DonorsPage() {
  const { donors, status, error, loadDonors, deleteDonor, bulkDeleteDonors } = useDonors();
  const isLoading = status === 'loading';

  const [search, setSearch] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [eligibility, setEligibility] = useState('all');
  const [gender, setGender] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Selection & Bulk Actions State
  const [selectedDonorIds, setSelectedDonorIds] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [donorsToDelete, setDonorsToDelete] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Modals
  const [registerOpen, setRegisterOpen] = useState(false);
  const [profileDonor, setProfileDonor] = useState(null);
  const [editingDonor, setEditingDonor] = useState(null);
  const [idCardDonor, setIdCardDonor] = useState(null);
  const [idCardFromProfile, setIdCardFromProfile] = useState(false);

  const locations = useMemo(() => uniqueLocations(donors), [donors]);

  const departments = useMemo(() => {
    const set = new Set();
    donors.forEach((d) => {
      const dept = d.Department && String(d.Department).trim();
      if (dept) set.add(dept);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [donors]);

  // Group counts for blood group pills
  const groupCounts = useMemo(() => {
    const map = {};
    BLOOD_GROUPS.forEach((g) => (map[g] = 0));
    donors.forEach((d) => {
      const bg = normalizeGroup(d['Blood Group']);
      if (map[bg] !== undefined) {
        map[bg] += 1;
      }
    });
    return map;
  }, [donors]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return donors.filter((donor) => {
      if (query) {
        const haystack = [
          donor.Name,
          donor.ID,
          donor.Contact,
          donor.Department,
          donor.Year,
          donor.Location,
          donor['Blood Group'],
        ].map((value) => String(value ?? '').toLowerCase());
        if (!haystack.some((value) => value.includes(query))) return false;
      }
      if (
        selectedGroups.length > 0 &&
        !selectedGroups.includes(normalizeGroup(donor['Blood Group']))
      ) {
        return false;
      }
      if (eligibility !== 'all' && getEligibility(donor) !== eligibility) {
        return false;
      }
      if (
        gender !== 'all' &&
        String(donor.Gender ?? '').toLowerCase() !== gender.toLowerCase()
      ) {
        return false;
      }
      if (
        selectedYear !== 'all' &&
        String(donor.Year ?? '').toLowerCase() !== selectedYear.toLowerCase()
      ) {
        return false;
      }
      if (
        selectedLocation !== 'all' &&
        String(donor.Location ?? '').trim().toLowerCase() !== selectedLocation.toLowerCase()
      ) {
        return false;
      }
      if (
        selectedDept !== 'all' &&
        String(donor.Department ?? '').trim().toLowerCase() !== selectedDept.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [donors, search, selectedGroups, eligibility, gender, selectedYear, selectedLocation, selectedDept]);

  const activeCount = [
    search.trim() !== '',
    selectedGroups.length > 0,
    eligibility !== 'all',
    gender !== 'all',
    selectedYear !== 'all',
    selectedLocation !== 'all',
    selectedDept !== 'all',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearch('');
    setSelectedGroups([]);
    setEligibility('all');
    setGender('all');
    setSelectedYear('all');
    setSelectedLocation('all');
    setSelectedDept('all');
  };

  const toggleGroup = (group) =>
    setSelectedGroups((previous) =>
      previous.includes(group)
        ? previous.filter((item) => item !== group)
        : [...previous, group]
    );

  // Selection Handlers
  const handleToggleSelect = (id) => {
    setSelectedDonorIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allFilteredIds = filtered
        .map((d) => d.ID || d.Donor_ID)
        .filter(Boolean);
      setSelectedDonorIds(allFilteredIds);
    } else {
      setSelectedDonorIds([]);
    }
  };

  const handleClearSelection = () => {
    setSelectedDonorIds([]);
  };

  // Trigger Bulk Deletion Modal
  const handleTriggerBulkDelete = () => {
    if (selectedDonorIds.length === 0) return;
    const selectedDonorsList = donors.filter((d) =>
      selectedDonorIds.includes(d.ID || d.Donor_ID)
    );
    setDonorsToDelete(selectedDonorsList);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  // Trigger Single Deletion Modal
  const handleTriggerSingleDelete = (donor) => {
    setDonorsToDelete([donor]);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  // Execute Deletion
  const handleConfirmDelete = async () => {
    if (donorsToDelete.length === 0) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const idsToDelete = donorsToDelete.map((d) => d.ID || d.Donor_ID).filter(Boolean);
      if (idsToDelete.length === 1) {
        await deleteDonor(idsToDelete[0]);
      } else {
        await bulkDeleteDonors(idsToDelete);
      }

      // Remove deleted IDs from current selection
      const deletedSet = new Set(idsToDelete);
      setSelectedDonorIds((prev) => prev.filter((id) => !deletedSet.has(id)));
      setDeleteModalOpen(false);
      setDonorsToDelete([]);

      // Close profile modal if viewing deleted donor
      if (profileDonor && deletedSet.has(profileDonor.ID || profileDonor.Donor_ID)) {
        setProfileDonor(null);
      }
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete donors. Please check connection and try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export CSV Helper
  const exportCSVData = (records, filename) => {
    if (records.length === 0) return;
    const headers = [
      'ID',
      'Name',
      'Blood Group',
      'Contact',
      'Department',
      'Age',
      'Weight',
      'Gender',
      'Location',
      'Last Donated Date',
      'Last Donation Type',
      'Last Donation Venue',
      'Next Eligible Date',
      'Status',
    ];

    const rows = records.map((d) => [
      `"${d.ID || ''}"`,
      `"${d.Name || ''}"`,
      `"${d['Blood Group'] || ''}"`,
      `"${d.Contact || ''}"`,
      `"${d.Department || ''}"`,
      d.Age ?? '',
      d.Weight ?? '',
      `"${d.Gender || ''}"`,
      `"${d.Location || ''}"`,
      `"${d['Last Donated Date'] || ''}"`,
      `"${d['Last Donation Type'] || ''}"`,
      `"${d['Last Donation Venue'] || ''}"`,
      `"${d['Next Eligible Date'] || ''}"`,
      `"${getEligibility(d)}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportFilteredCSV = () => {
    exportCSVData(filtered, `NSS_Rudhirasena_Donors_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportSelectedCSV = () => {
    const selectedRecords = donors.filter((d) =>
      selectedDonorIds.includes(d.ID || d.Donor_ID)
    );
    exportCSVData(
      selectedRecords,
      `NSS_Rudhirasena_Selected_Donors_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Section */}
      <div className="flex animate-rise flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-slate-900 sm:text-3xl">
            Donor Registry
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Search, filter, manage, and organize registered volunteer blood donors.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={exportFilteredCSV}
            disabled={filtered.length === 0}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-[color,background-color,border-color,transform] duration-150 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            title="Download current filtered list as CSV"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Export</span> CSV
          </button>
          <button
            type="button"
            onClick={() => loadDonors()}
            disabled={isLoading}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-[color,background-color,border-color,transform] duration-150 hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 motion-reduce:animate-none ${isLoading ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-[background-color,transform,box-shadow] duration-150 hover:bg-red-800 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            Add Donor
          </button>
        </div>
      </div>

      {status === 'error' && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">Unable to load donor records</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Advanced Filter Box */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card transition-shadow duration-200 sm:p-5">
        <div className="space-y-4">
          {/* Search bar & view toggle */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID, phone, department, location..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-red-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    viewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  aria-label="Table view"
                >
                  <List className="h-3.5 w-3.5" />
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid className="h-3.5 w-3.5" />
                  Cards
                </button>
              </div>
            </div>
          </div>

          {/* Blood Group Chips */}
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Filter by Blood Group
            </p>
            <div className="flex flex-wrap gap-1.5">
              {BLOOD_GROUPS.map((group) => {
                const count = groupCounts[group] || 0;
                const isSelected = selectedGroups.includes(group);
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-[background-color,color,transform] duration-150 active:scale-95 ${
                      isSelected
                        ? 'bg-red-700 text-white shadow-sm ring-1 ring-red-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{group}</span>
                    <span
                      className={`tnum rounded-full px-1.5 py-0.2 text-[10px] ${
                        isSelected
                          ? 'bg-red-800 text-red-100'
                          : 'bg-white text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dropdown Filters Grid */}
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Eligibility
              </label>
              <select
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-red-500"
              >
                <option value="all">All Donors</option>
                <option value="eligible">Eligible Now</option>
                <option value="cooling">Cooling Period</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Year of Study
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-red-500"
              >
                <option value="all">All Years</option>
                {YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-red-500"
              >
                <option value="all">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-red-500"
              >
                <option value="all">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Department
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-red-500"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Filters Bar */}
          {activeCount > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>{activeCount} filter{activeCount === 1 ? '' : 's'} active</span>
              <button
                type="button"
                onClick={resetFilters}
                className="flex cursor-pointer items-center gap-1 font-semibold text-red-600 hover:text-red-800"
              >
                <RotateCcw className="h-3 w-3" />
                Reset all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Donors List/Grid View */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-900">{filtered.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{donors.length}</span> donor
            {donors.length === 1 ? '' : 's'}
          </p>

          {/* Quick select all toggle on mobile or top view */}
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={() => handleSelectAll(selectedDonorIds.length !== filtered.length)}
              className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-red-700 transition-colors inline-flex items-center gap-1"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {selectedDonorIds.length === filtered.length ? 'Deselect All' : `Select All (${filtered.length})`}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
              />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          viewMode === 'table' ? (
            <>
              <DonorTable
                donors={filtered}
                selectedDonorIds={selectedDonorIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onView={setProfileDonor}
                onEdit={setEditingDonor}
                onViewIdCard={(d) => { setIdCardFromProfile(false); setIdCardDonor(d); }}
                onDeleteDonor={handleTriggerSingleDelete}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:hidden">
                {filtered.map((donor, index) => {
                  const donorId = donor.ID || donor.Donor_ID;
                  return (
                    <DonorCard
                      key={String(donorId || index)}
                      donor={donor}
                      isSelected={selectedDonorIds.includes(donorId)}
                      onToggleSelect={handleToggleSelect}
                      onView={setProfileDonor}
                      onEdit={setEditingDonor}
                      onViewIdCard={(d) => { setIdCardFromProfile(false); setIdCardDonor(d); }}
                      onDeleteDonor={handleTriggerSingleDelete}
                      style={{ animationDelay: `${Math.min(index, 14) * 25}ms` }}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((donor, index) => {
                const donorId = donor.ID || donor.Donor_ID;
                return (
                  <DonorCard
                    key={String(donorId || index)}
                    donor={donor}
                    isSelected={selectedDonorIds.includes(donorId)}
                    onToggleSelect={handleToggleSelect}
                    onView={setProfileDonor}
                    onEdit={setEditingDonor}
                    onViewIdCard={(d) => { setIdCardFromProfile(false); setIdCardDonor(d); }}
                    onDeleteDonor={handleTriggerSingleDelete}
                    style={{ animationDelay: `${Math.min(index, 14) * 25}ms` }}
                  />
                );
              })}
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-slate-800">
              No donors found
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              We couldn't find any donors matching your criteria. Try adjusting your search query or filters.
            </p>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-red-700"
              >
                <RotateCcw className="h-4 w-4" />
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedDonorIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 animate-rise">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/95 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 pr-2 border-r border-slate-700 text-sm font-bold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white">
                {selectedDonorIds.length}
              </span>
              <span className="hidden sm:inline">Selected</span>
            </div>

            <button
              type="button"
              onClick={exportSelectedCSV}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              title="Export selected donors to CSV"
            >
              <Download className="h-3.5 w-3.5 text-slate-300" />
              <span className="hidden sm:inline">Export</span> CSV
            </button>

            <button
              type="button"
              onClick={handleTriggerBulkDelete}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:scale-95 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete {selectedDonorIds.length} Donor{selectedDonorIds.length === 1 ? '' : 's'}
            </button>

            <button
              type="button"
              onClick={handleClearSelection}
              className="cursor-pointer p-1 text-slate-400 hover:text-white transition-colors"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Single/Bulk Deletion */}
      <Modal
        open={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        title={`Delete ${donorsToDelete.length} Donor${donorsToDelete.length === 1 ? '' : 's'}`}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-900">
            <TriangleAlert className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-red-800">
                Are you sure you want to permanently delete {donorsToDelete.length} donor record{donorsToDelete.length === 1 ? '' : 's'}?
              </p>
              <p className="mt-1 text-red-700 leading-relaxed">
                This action will remove their entries from Google Sheets and the live directory. This cannot be undone.
              </p>
            </div>
          </div>

          {/* Donors Preview List */}
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1.5">
            {donorsToDelete.map((d, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-xs border border-slate-100"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-slate-800 truncate">{d.Name || d.Full_Name}</span>
                  <span className="text-[10px] font-mono text-slate-400">({d.ID || d.Donor_ID})</span>
                </div>
                <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700 border border-red-100 shrink-0">
                  {d['Blood Group'] || d.Blood_Group}
                </span>
              </div>
            ))}
          </div>

          {deleteError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {deleteError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteModalOpen(false)}
              className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:scale-95 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting from Sheets...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Confirm Delete ({donorsToDelete.length})
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <RegisterDonorModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={() => loadDonors({ silent: true })}
      />
      <DonorProfileModal
        open={Boolean(profileDonor)}
        donor={profileDonor}
        onClose={() => setProfileDonor(null)}
        onEdit={(d) => {
          setProfileDonor(null);
          setEditingDonor(d);
        }}
        onViewIdCard={(d) => {
          setProfileDonor(null);
          setIdCardFromProfile(true);
          setIdCardDonor(d);
        }}
        onDelete={(d) => {
          handleTriggerSingleDelete(d);
        }}
      />
      <EditDonorModal
        open={Boolean(editingDonor)}
        donor={editingDonor}
        onClose={() => setEditingDonor(null)}
        onUpdated={() => loadDonors({ silent: true })}
      />
      <DigitalDonorCardModal
        open={Boolean(idCardDonor)}
        donor={idCardDonor}
        onClose={() => {
          const d = idCardDonor;
          setIdCardDonor(null);
          if (idCardFromProfile && d) {
            setIdCardFromProfile(false);
            setProfileDonor(d);
          }
        }}
      />
    </div>
  );
}
