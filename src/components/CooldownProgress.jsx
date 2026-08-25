import { Clock, CheckCircle2 } from 'lucide-react';
import { getEligibilityDetails } from '../utils/donor';

export default function CooldownProgress({ donor, compact = false }) {
  const details = getEligibilityDetails(donor);

  if (details.status === 'cooling') {
    return (
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
          <span className="flex items-center gap-1 text-orange-700">
            <Clock className="h-3 w-3 text-orange-500" />
            Cooldown: {details.daysElapsed}/{details.totalCooldown}d ({details.progressPercent}%)
          </span>
          <span className="tnum font-bold text-orange-700">
            {details.daysLeft}d left
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-orange-100 ring-1 ring-orange-200/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-500 transition-all duration-500"
            style={{ width: `${details.progressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      <span>Eligible to Donate</span>
    </span>
  );
}
