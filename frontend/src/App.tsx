import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from './components/Toast';
import { apiGet } from './lib/api';
import type { ShortageReport } from './lib/api';
import DispensaPage from './pages/DispensaPage';
import ListePage from './pages/ListePage';
import WalkActivePage from './pages/walk/WalkActivePage';
import OrdersManage from './pages/OrdersManage';
import ReportShortage from './pages/ReportShortage';
import DashboardPage from './pages/DashboardPage';
import { Package, List, ShoppingCart, AlertTriangle, LayoutDashboard, Sun, Moon } from 'lucide-react';

function BottomNav({ unresolvedShortages }: { unresolvedShortages: number }) {
  const location = useLocation();
  const active = (path: string) => {
    // Per la tab "Liste", evidenzia anche le sotto-route /walk/:id
    if (path === '/liste') {
      return location.pathname === '/liste' || location.pathname.startsWith('/walk/');
    }
    return location.pathname === path;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border/40 bg-background flex">
      <Link
        to="/"
        className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
          active('/') ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        Home
      </Link>
      <Link
        to="/dispensa"
        className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
          active('/dispensa') ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        <Package className="w-5 h-5" />
        Dispensa
      </Link>
      <Link
        to="/liste"
        className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
          active('/liste') ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        <List className="w-5 h-5" />
        Liste
      </Link>
      <Link
        to="/ordini"
        className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
          active('/ordini') ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        <ShoppingCart className="w-5 h-5" />
        Ordini
      </Link>
      <Link
        to="/segnalazioni"
        className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors relative ${
          active('/segnalazioni') ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        <div className="relative">
          <AlertTriangle className="w-5 h-5" />
          {unresolvedShortages > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />
          )}
        </div>
        Avvisi
      </Link>
    </nav>
  );
}

function Layout() {
  const [unresolvedShortages, setUnresolvedShortages] = useState(0);
  const location = useLocation();

  // Dark/Light Mode logic
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    // Default to dark mode if no preference
    return true; 
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    let isMounted = true;
    async function fetchShortages() {
      try {
        const reports = await apiGet<ShortageReport[]>('/shortage-reports/');
        if (isMounted) {
          const unresolved = reports.filter(r => !r.resolved_at).length;
          setUnresolvedShortages(unresolved);
        }
      } catch (e) {
        // ignora
      }
    }
    
    fetchShortages();
    const interval = setInterval(fetchShortages, 10000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  const active = (path: string) => {
    if (path === '/liste') {
      return location.pathname === '/liste' || location.pathname.startsWith('/walk/');
    }
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200">
      <header className="border-b border-border/40 px-4 md:px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/logo-cropped.svg" alt="logo" className="w-8 h-8" />
          <span className="font-semibold tracking-tight">Spesade</span>
        </Link>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active('/') ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Home
            </Link>
            <Link
              to="/dispensa"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active('/dispensa') ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="w-4 h-4" />
              Dispensa
            </Link>
            <Link
              to="/liste"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active('/liste') ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-4 h-4" />
              Liste
            </Link>
            <Link
              to="/ordini"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active('/ordini') ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Ordini
            </Link>
            <Link
              to="/segnalazioni"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                active('/segnalazioni') ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <AlertTriangle className="w-4 h-4" />
                {unresolvedShortages > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-[1.5px] border-background animate-pulse" />
                )}
              </div>
              Segnalazioni
            </Link>
          </nav>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded-full transition-colors"
            title={isDarkMode ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>
      <main className="flex-1 px-4 py-4 md:px-6 md:py-6 max-w-4xl mx-auto w-full pb-20 md:pb-6">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dispensa" element={<DispensaPage />} />
          <Route path="/liste" element={<ListePage />} />
          <Route path="/walk/:listId" element={<WalkActivePage />} />
          <Route path="/ordini" element={<OrdersManage />} />
          <Route path="/segnalazioni" element={<ReportShortage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav unresolvedShortages={unresolvedShortages} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Layout />
    </BrowserRouter>
  );
}