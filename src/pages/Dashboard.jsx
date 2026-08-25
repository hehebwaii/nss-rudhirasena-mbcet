import { useMemo, useState } from 'react';
import {
  Clock,
  Hourglass,
  RefreshCw,
  RotateCcw,
  TriangleAlert,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useDonors } from '../context/DonorContext';
import DonorFilters from '../components/DonorFilters';
import DonorTable from '../components/DonorTable';
import DonorCard from '../components/DonorCard';
import DonorProfileModal from '../components/DonorProfileModal';
import RegisterDonorModal from '../components/RegisterDonorModal';
import {
  getEligibility,
  normalizeGroup,
  uniqueLocations,
} from '../utils/donor';

const STAT_TONES = {
  brand: 'text-red-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  slate: 'text-slate-400',
};

const STAT_VALUE_TONES = {
  brand: 'text-slate-900',
  emerald: 'text-emerald-700',
  amber: 'text-amber-700',
  slate: 'text-slate-900',
};

function StatCard({ icon, label, value, hint, tone = 'slate', style }) {
  return (
    <div
      style={style}
      className="animate-rise rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-shadow duration-200 hover:shadow-raised"
    >
      <div className="flex items-center gap-2">
        <span className={STAT_TONES[tone]}>{icon}</span>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <p
        className={`tnum mt-3 text-4xl font-bold tracking-tighter ${STAT_VALUE_TONES[tone]}`}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-xs leading-relaxed text-slate-400">{hint}</p>}
    </div>
  );
}

export default function Dashboard({ onNavigateTab }) {
  const { donors, status, error, lastUpdated, loadDonors } = useDonors();
  const isLoading = status === 'loading';

  const [search, setSearch] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [eligibility, setEligibility] = useState('all');
  const [gender, setGender] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [profileDonor, setProfileDonor] = useState(null);

  const locations = useMemo(() => uniqueLocations(donors), [donors]);

  const counts = useMemo(() => {
    let eligible = 0;
    let cooling = 0;
    let unknown = 0;
    donors.forEach((donor) => {
      const state = getEligibility(donor);
      if (state === 'eligible') eligible += 1;
      else if (state === 'cooling') cooling += 1;
      else unknown += 1;
    });
    return { total: donors.length, eligible, cooling, unknown };
  }, [donors]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return donors.filter((donor) => {
      if (query) {
        const haystack = [donor.Name, donor.ID, donor.Contact, donor.Location]
          .map((value) => String(value ?? '').toLowerCase());
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
        String(donor.Location ?? '')
          .trim()
          .toLowerCase() !== selectedLocation.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [donors, search, selectedGroups, eligibility, gender, selectedLocation]);

  const activeCount = [
    search.trim() !== '',
    selectedGroups.length > 0,
    eligibility !== 'all',
    gender !== 'all',
    selectedLocation !== 'all',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearch('');
    setSelectedGroups([]);
    setEligibility('all');
    setGender('all');
    setSelectedLocation('all');
  };

  const toggleGroup = (group) =>
    setSelectedGroups((previous) =>
      previous.includes(group)
        ? previous.filter((item) => item !== group)
        : [...previous, group]
    );

  return (
    <div className="space-y-8">
      <div className="flex animate-rise flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-slate-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Live overview of the donor registry.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => loadDonors()}
            disabled={isLoading}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-[color,background-color,border-color,transform] duration-150 hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          >
            <RefreshCw
              className={`h-4 w-4 motion-reduce:animate-none ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-[background-color,transform,box-shadow] duration-150 hover:bg-red-800 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            Register Donor
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
            <p className="font-semibold">Could not reach the donor API.</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={() => loadDonors()}
              className="mt-2 cursor-pointer font-semibold underline underline-offset-2 transition-colors duration-200 hover:text-red-900"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : status === 'success' ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Total Donors"
            value={counts.total}
            hint="Records synced from the Google Sheets backend."
            tone="brand"
            style={{ animationDelay: '0ms' }}
          />
          <StatCard
            icon={<UserCheck className="h-4 w-4" />}
            label="Eligible Now"
            value={counts.eligible}
            hint="Past their cooling period today."
            tone="emerald"
            style={{ animationDelay: '60ms' }}
          />
          <StatCard
            icon={<Hourglass className="h-4 w-4" />}
            label="In Cooling Period"
            value={counts.cooling}
            hint="Not yet eligible to donate again."
            tone="amber"
            style={{ animationDelay: '120ms' }}
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Last Synced"
            value={
              lastUpdated
                ? lastUpdated.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'
            }
            hint="Time of the most recent sync."
            tone="slate"
            style={{ animationDelay: '180ms' }}
          />
        </div>
      ) : null}

      {status === 'success' && (
        <>
          <DonorFilters
            search={search}
            onSearchChange={setSearch}
            selectedGroups={selectedGroups}
            onToggleGroup={toggleGroup}
            eligibility={eligibility}
            onEligibilityChange={setEligibility}
            gender={gender}
            onGenderChange={setGender}
            locations={locations}
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
            activeCount={activeCount}
            onReset={resetFilters}
          />

          <div>
            <p role="status" className="text-sm text-slate-500">
              Showing{' '}
              <span className="tnum font-semibold text-slate-900">
                {filtered.length}
              </span>{' '}
              of <span className="tnum">{counts.total}</span> donor
              {counts.total === 1 ? '' : 's'}
              {activeCount > 0 ? ' matching filters' : ''}
            </p>

            <div className="mt-4">
              {filtered.length > 0 ? (
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
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <Users className="mx-auto h-8 w-8 text-slate-300" />
                  <h2 className="mt-3 text-base font-semibold text-slate-700">
                    No donors match your filters
                  </h2>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                    Try widening your search or clearing a few filters.
                  </p>
                  {activeCount > 0 && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

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
