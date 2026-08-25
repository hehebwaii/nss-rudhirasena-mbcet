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
    <div className="w-full space-y-6">
      {/* Operations Page Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="animate-pulse-subtle flex h-10 w-10 items-center justify-center rounded-2xl bg-red-700 text-white shadow-md transition-transform hover:scale-105">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Donation Operations Center
              </h1>
            </div>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Emergency request fulfillment, voluntary donation logging, and camp drive rosters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <span className="hover-card-lift inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Authorized Coordinator Access
            </span>
          ) : (
            <button
              type="button"
              onClick={() => requireAuth(() => {})}
              className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-slate-800 active:scale-95 shadow-xs"
            >
              Unlock Coordinator Mode
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab Navigation with Animated Pills */}
      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1.5 shadow-xs backdrop-blur-xs">
        <nav className="flex space-x-2 overflow-x-auto" aria-label="Operations Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`group flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-98 ${
                  isActive
                    ? 'bg-white text-red-700 shadow-sm ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-red-700' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold transition-colors ${
                    isActive ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Component with Fade Animation */}
      <div key={activeTab} className="animate-fade-in">
        {activeTab === 'cases' && <EmergencyCasesTab />}
        {activeTab === 'voluntary' && <VoluntaryDonationsTab />}
        {activeTab === 'camps' && (
          <CampsTab onRegisterNewDonor={() => setIsSpotRegisterOpen(true)} />
        )}
      </div>

      {/* On-the-spot Register Modal */}
      <RegisterDonorModal
        open={isSpotRegisterOpen}
        onClose={() => setIsSpotRegisterOpen(false)}
      />
    </div>
  );
}
