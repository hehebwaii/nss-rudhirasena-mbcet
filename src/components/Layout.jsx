import Navbar from './Navbar';

export default function Layout({ children, activeTab, onTabChange }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased print:bg-white print:min-h-0">
      <div className="print:hidden">
        <Navbar activeTab={activeTab} onTabChange={onTabChange} />
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 print:max-w-none print:p-0 print:m-0 print:w-full">
        {children}
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500 print:hidden">
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="inline-flex items-center gap-2 font-medium text-slate-600">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-red-600"
            />
            NSS Rudhirasena · Blood Donor Directory
          </span>
          <p className="text-xs text-slate-400 font-medium">
            Developed by NSS MBCET Units 230 & 706
          </p>
        </div>
      </footer>
    </div>
  );
}
