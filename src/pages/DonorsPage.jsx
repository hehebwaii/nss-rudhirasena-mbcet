import { useMemo, useState } from 'react';
import {
  Download,
  Filter,
  Grid,
  List,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useDonors } from '../context/DonorContext';
import DonorTable from '../components/DonorTable';
import DonorCard from '../components/DonorCard';
import DonorProfileModal from '../components/DonorProfileModal';
import RegisterDonorModal from '../components/RegisterDonorModal';
import {
  BLOOD_GROUPS,
  getEligibility,
  normalizeGroup,
  uniqueLocations,
} from '../utils/donor';

export default function DonorsPage() {
  const { donors, status, error, loadDonors } = useDonors();
  const isLoading = status === 'loading';

  const [search, setSearch] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [eligibility, setEligibility] = useState('all');
  const [gender, setGender] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [registerOpen, setRegisterOpen] = useState(false);
  const [profileDonor, setProfileDonor] = useState(null);

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
  }, [donors, search, selectedGroups, eligibility, gender, selectedLocation, selectedDept]);

  const activeCount = [
    search.trim() !== '',
    selectedGroups.length > 0,
    eligibility !== 'all',
    gender !== 'all',
    selectedLocation !== 'all',
    selectedDept !== 'all',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearch('');
    setSelectedGroups([]);
    setEligibility('all');
    setGender('all');
    setSelectedLocation('all');
    setSelectedDept('all');
  };

  const toggleGroup = (group) =>
    setSelectedGroups((previous) =>
      previous.includes(group)
        ? previous.filter((item) => item !== group)
        : [...previous, group]
    );

  const exportCSV = () => {
    if (filtered.length === 0) return;
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

    const rows = filtered.map((d) => [
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
    link.setAttribute('download', `NSS_Rudhirasena_Donors_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex animate-rise flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-slate-900 sm:text-3xl">
            Donor Registry
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Search, filter, and manage all registered volunteer blood donors.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={exportCSV}
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
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-4">
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
              <DonorTable donors={filtered} onView={setProfileDonor} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:hidden">
                {filtered.map((donor, index) => (
                  <DonorCard
                    key={String(donor.ID || index)}
                    donor={donor}
                    onView={setProfileDonor}
                    style={{ animationDelay: `${Math.min(index, 14) * 25}ms` }}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((donor, index) => (
                <DonorCard
                  key={String(donor.ID || index)}
                  donor={donor}
                  onView={setProfileDonor}
                  style={{ animationDelay: `${Math.min(index, 14) * 25}ms` }}
                />
              ))}
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

      <RegisterDonorModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={() => loadDonors({ silent: true })}
      />
      <DonorProfileModal
        open={Boolean(profileDonor)}
        donor={profileDonor}
        onClose={() => setProfileDonor(null)}
      />
    </div>
  );
}
