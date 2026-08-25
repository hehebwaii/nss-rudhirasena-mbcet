const STYLES = {
  eligible: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cooling: 'bg-orange-50 text-orange-600 ring-orange-200',
  unknown: 'bg-slate-100 text-slate-500 ring-slate-200',
};

const DOTS = {
  eligible: 'bg-emerald-500',
  cooling: 'bg-orange-500',
  unknown: 'bg-slate-400',
};

const LABELS = {
  eligible: 'Eligible Now',
  cooling: 'In Cooling Period',
  unknown: 'Unknown',
};

export default function StatusBadge({ eligibility, daysLeft }) {
  let label = LABELS[eligibility] || LABELS.unknown;
  if (eligibility === 'cooling' && Number.isFinite(daysLeft)) {
    label = daysLeft === 0 ? 'Cooling · last day' : `Cooling · ${daysLeft}d left`;
  }
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[eligibility] || STYLES.unknown}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOTS[eligibility] || DOTS.unknown}`}
      />
      {label}
    </span>
  );
}
