import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DonorProvider } from './context/DonorContext';
import Layout from './components/Layout';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import DonorsPage from './pages/DonorsPage';
import Reports from './pages/Reports';

function AppShell() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard onNavigateTab={setActiveTab} />}
      {activeTab === 'donors' && <DonorsPage />}
      {activeTab === 'reports' && <Reports />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DonorProvider>
        <AppShell />
      </DonorProvider>
    </AuthProvider>
  );
}
