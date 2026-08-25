import { RotateCcw, Search } from 'lucide-react';
import { BLOOD_GROUPS, YEARS } from '../utils/donor';

const ELIGIBILITY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'eligible', label: 'Eligible Now' },
  { value: 'cooling', label: 'Cooling' },
];

const legendClass =
  'mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500';

const selectClass =
  'h-11 w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition-colors duration-150 hover:border-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100';

export default function DonorFilters({
  search,
  onSearchChange,
  selectedGroups,
  onToggleGroup,
  eligibility,
  onEligibilityChange,
  gender,
  onGenderChange,
  year,
  onYearChange,
  locations,
  selectedLocation,
  onLocationChange,
  activeCount,
  onReset,
}) {
  return (
    <section
      aria-label="Donor filters"
      className="animate-fade space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative grow">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <label htmlFor="donor-search" className="sr-only">
            Search donors
          </label>
          <input
            id="donor-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name, ID, contact or location…"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-600 transition-[color,background-color,border-color,transform] duration-150 hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:scale-[0.98]"
          >
            <RotateCcw className="h-4 w-4" />
            Reset ({activeCount})
          </button>
        )}
      </div>

      <fieldset>
        <legend className={legendClass}>Blood Group</legend>
        <div className="flex flex-wrap gap-2">
          {BLOOD_GROUPS.map((group) => {
            const active = selectedGroups.includes(group);
            return (
              <button
                key={group}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleGroup(group)}
                className={`tnum h-9 min-w-[3rem] cursor-pointer rounded-full px-3 text-sm font-bold ring-1 transition-[color,background-color,box-shadow,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:scale-95 ${
                  active
                    ? 'bg-red-700 text-white ring-red-700'
                    : 'bg-white text-slate-600 ring-slate-300 hover:bg-red-50 hover:text-red-700 hover:ring-red-300'
                }`}
              >
                {group}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <fieldset>
          <legend className={legendClass}>Eligibility</legend>
          <div
            role="radiogroup"
            aria-label="Filter by eligibility"
            className="flex h-11 items-center gap-1 rounded-xl bg-slate-100 p-1"
          >
            {ELIGIBILITY_OPTIONS.map((option) => {
              const active = eligibility === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onEligibilityChange(option.value)}
                  className={`h-full flex-1 cursor-pointer whitespace-nowrap rounded-lg px-2 text-sm font-semibold transition-[color,background-color,box-shadow,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:scale-95 ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className={legendClass}>
            <label htmlFor="filter-year">Year of Study</label>
          </legend>
          <select
            id="filter-year"
            value={year || 'all'}
            onChange={(event) => onYearChange && onYearChange(event.target.value)}
            className={selectClass}
          >
            <option value="all">All Years</option>
            {YEARS.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset>
          <legend className={legendClass}>
            <label htmlFor="filter-gender">Gender</label>
          </legend>
          <select
            id="filter-gender"
            value={gender}
            onChange={(event) => onGenderChange(event.target.value)}
            className={selectClass}
          >
            <option value="all">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </fieldset>

        <fieldset>
          <legend className={legendClass}>
            <label htmlFor="filter-location">Location</label>
          </legend>
          <select
            id="filter-location"
            value={selectedLocation}
            onChange={(event) => onLocationChange(event.target.value)}
            className={selectClass}
          >
            <option value="all">All Locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </fieldset>
      </div>
    </section>
  );
}
