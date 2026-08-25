import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DonorProvider, useDonors } from './context/DonorContext';
import { OperationsProvider } from './context/OperationsContext';
import { PWAProvider } from './context/PWAContext';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import DigitalDonorCardModal from './components/DigitalDonorCardModal';
import Layout from './components/Layout';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import DonorsPage from './pages/DonorsPage';
import OperationsPage from './pages/OperationsPage';
import Reports from './pages/Reports';

function AppShell() {
  const { isAuthenticated } = useAuth();
  const { donors } = useDonors();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [urlVerifiedDonor, setUrlVerifiedDonor] = useState(null);

  // Auto-detect ?donor=<id> in URL when scanning QR from outside
  useEffect(() => {
    if (typeof window !== 'undefined' && donors.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const donorParam = params.get('donor');
      if (donorParam) {
        const found = donors.find(
          (d) =>
            String(d.ID || d.Donor_ID).toLowerCase() === donorParam.toLowerCase() ||
            String(d.Name || '').toLowerCase() === donorParam.toLowerCase()
        );
        if (found) {
          setUrlVerifiedDonor(found);
        }
      }
    }
  }, [donors]);

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard onNavigateTab={setActiveTab} />}
      {activeTab === 'donors' && <DonorsPage />}
      {activeTab === 'operations' && <OperationsPage />}
      {activeTab === 'reports' && <Reports />}
      <PWAInstallPrompt />
      <DigitalDonorCardModal
        open={Boolean(urlVerifiedDonor)}
        donor={urlVerifiedDonor}
        onClose={() => setUrlVerifiedDonor(null)}
      />
    </Layout>
  );
}

export default function App() {
  return (
    <PWAProvider>
      <AuthProvider>
        <DonorProvider>
          <OperationsProvider>
            <AppShell />
          </OperationsProvider>
        </DonorProvider>
      </AuthProvider>
    </PWAProvider>
  );
}
