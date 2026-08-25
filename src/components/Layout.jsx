import Navbar from './Navbar';

export default function Layout({ children, activeTab, onTabChange }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased">
      <Navbar activeTab={activeTab} onTabChange={onTabChange} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-red-600"
          />
          NSS Rudhirasena · Blood Donor Directory
        </span>
      </footer>
    </div>
  );
}
