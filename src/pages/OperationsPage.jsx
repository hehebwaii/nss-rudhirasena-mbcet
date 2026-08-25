import { useState } from 'react';
import {
  AlertTriangle,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Tent,
  Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EmergencyCasesTab from '../components/operations/EmergencyCasesTab';
import VoluntaryDonationsTab from '../components/operations/VoluntaryDonationsTab';
import CampsTab from '../components/operations/CampsTab';
import RegisterDonorModal from '../components/RegisterDonorModal';

const TABS = [
  { id: 'cases', label: 'Emergency Cases', icon: AlertTriangle, badge: 'Smart Match' },
  { id: 'voluntary', label: 'Voluntary Donations', icon: HeartHandshake },
  { id: 'camps', label: 'Camps & Drives', icon: Tent },
];

export default function OperationsPage() {
  const { isAuthenticated, requireAuth } = useAuth();
  const [activeTab, setActiveTab] = useState('cases');
  const [isSpotRegisterOpen, setIsSpotRegisterOpen] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Operations Page Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-700 text-white shadow-xs">
              <Activity className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Donation Operations Center
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Emergency request fulfillment, voluntary donation logging, and camp drive rosters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Authorized Coordinator Access
            </span>
          ) : (
            <button
              type="button"
              onClick={() => requireAuth(() => {})}
              className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
            >
              Unlock Coordinator Mode
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="mb-6 flex border-b border-slate-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Operations Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex cursor-pointer items-center gap-2 border-b-2 py-3 text-sm font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-red-700 text-red-700'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-red-700' : 'text-slate-400'}`} />
                {tab.label}
                {tab.badge && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-800">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Component */}
      {activeTab === 'cases' && <EmergencyCasesTab />}
      {activeTab === 'voluntary' && <VoluntaryDonationsTab />}
      {activeTab === 'camps' && (
        <CampsTab onRegisterNewDonor={() => setIsSpotRegisterOpen(true)} />
      )}

      {/* On-the-spot Register Modal */}
      <RegisterDonorModal
        open={isSpotRegisterOpen}
        onClose={() => setIsSpotRegisterOpen(false)}
      />
    </div>
  );
}
