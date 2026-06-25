import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ShoppingList, ShortageReport, PurchaseOrder, Item } from '../lib/api';
import { apiGet } from '../lib/api';
import {
  Package, AlertTriangle, ShoppingCart, Loader2,
  Plus, ArrowRight, Truck, CheckCircle2,
  Settings2, X, LayoutGrid, Zap
} from 'lucide-react';

const AVAILABLE_ACTIONS = [
  {
    id: 'new_list',
    label: 'Inizia nuova spesa',
    desc: 'Crea una lista e parti con la ricognizione',
    icon: Plus,
    path: '/liste',
    bg: 'bg-primary text-primary-foreground hover:opacity-90',
    iconColor: '',
    border: 'border-transparent'
  },
  {
    id: 'report',
    label: 'Segnala mancanza',
    desc: 'Qualcosa è esaurito in dispensa?',
    icon: AlertTriangle,
    path: '/segnalazioni',
    bg: 'bg-card text-foreground',
    iconColor: 'text-amber-400',
    border: 'border border-amber-500/20 hover:border-amber-500/40'
  },
  {
    id: 'orders',
    label: 'Ordini in arrivo',
    desc: 'Controlla cosa sta per essere consegnato',
    icon: Truck,
    path: '/ordini',
    bg: 'bg-card text-foreground',
    iconColor: 'text-purple-400',
    border: 'border border-purple-500/20 hover:border-purple-500/40'
  },
  {
    id: 'dispensa',
    label: 'Gestisci dispensa',
    desc: 'Esplora e modifica i prodotti a sistema',
    icon: Package,
    path: '/dispensa',
    bg: 'bg-card text-foreground',
    iconColor: 'text-blue-400',
    border: 'border border-blue-500/20 hover:border-blue-500/40'
  },
  {
    id: 'history_orders',
    label: 'Storico Ordini',
    desc: 'Vedi lo storico di tutti gli ordini',
    icon: CheckCircle2,
    path: '/ordini',
    bg: 'bg-card text-foreground',
    iconColor: 'text-emerald-400',
    border: 'border border-emerald-500/20 hover:border-emerald-500/40'
  },
  {
    id: 'history_lists',
    label: 'Tutte le Liste',
    desc: 'Visualizza e gestisci tutte le liste spesa',
    icon: ShoppingCart,
    path: '/liste',
    bg: 'bg-card text-foreground',
    iconColor: 'text-muted-foreground',
    border: 'border border-border/40 hover:border-primary/40'
  }
];

const AVAILABLE_KPIS = [
  { id: 'shortages', label: 'Avvisi', desc: 'segnalazioni aperte', icon: AlertTriangle, color: 'text-amber-400', border: 'border-amber-500/20 hover:border-amber-500/40', path: '/segnalazioni' },
  { id: 'pending_orders', label: 'In arrivo', desc: 'ordini in corso', icon: Truck, color: 'text-purple-400', border: 'border-purple-500/20 hover:border-purple-500/40', path: '/ordini' },
  { id: 'received_orders', label: 'Ricevuti', desc: 'ordini completati', icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500/20 hover:border-emerald-500/40', path: '/ordini' },
  { id: 'active_lists', label: 'Liste', desc: 'attive', icon: ShoppingCart, color: 'text-blue-400', border: 'border-blue-500/20 hover:border-blue-500/40', path: '/liste' },
  { id: 'products', label: 'Prodotti', desc: 'attivi in catalogo', icon: Package, color: 'text-primary', border: 'border-border/40 hover:border-primary/40', path: '/dispensa' },
  { id: 'categories', label: 'Categorie', desc: 'configurate', icon: Package, color: 'text-muted-foreground', border: 'border-border/40 hover:border-primary/40', path: '/dispensa' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [shortages, setShortages] = useState<ShortageReport[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // Stato per personalizzare le sezioni
  const [quickActions, setQuickActions] = useState<string[]>(() => {
    const saved = localStorage.getItem('quickActions');
    return saved ? JSON.parse(saved) : ['new_list', 'report', 'orders', 'dispensa'];
  });
  const [activeKpis, setActiveKpis] = useState<string[]>(() => {
    const saved = localStorage.getItem('activeKpis');
    return saved ? JSON.parse(saved) : ['shortages', 'pending_orders', 'received_orders', 'active_lists', 'products', 'categories'];
  });
  const [isEditingSettings, setIsEditingSettings] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function caricaDati() {
      try {
        const [ls, sh, ords, its] = await Promise.all([
          apiGet<ShoppingList[]>('/lists/'),
          apiGet<ShortageReport[]>('/shortage-reports/'),
          apiGet<PurchaseOrder[]>('/purchase-orders/'),
          apiGet<Item[]>('/items/'),
        ]);
        if (!isMounted) return;
        setLists(ls);
        setShortages(sh);
        setOrders(ords);
        setItems(its);
      } catch (e) {
        // ignora
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    caricaDati();
    return () => { isMounted = false; };
  }, []);

  const toggleQuickAction = (id: string) => {
    setQuickActions(prev => {
      const newActions = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id];
      localStorage.setItem('quickActions', JSON.stringify(newActions));
      return newActions;
    });
  };

  const toggleKpi = (id: string) => {
    setActiveKpis(prev => {
      const newKpis = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id];
      localStorage.setItem('activeKpis', JSON.stringify(newKpis));
      return newKpis;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm">Caricamento dashboard...</p>
      </div>
    );
  }

  // Pre-calcolo metriche
  const kpiData: Record<string, number> = {
    shortages: shortages.filter(s => !s.resolved_at).length,
    pending_orders: orders.filter(o => o.status === 'ordered').length,
    received_orders: orders.filter(o => o.status === 'received').length,
    active_lists: lists.filter(l => l.status === 'draft' || l.status === 'pending').length,
    products: items.filter(i => i.active).length,
    categories: new Set(items.filter(i => i.active).map(i => i.category_id)).size
  };

  const selectedActionDefs = AVAILABLE_ACTIONS.filter(a => quickActions.includes(a.id));
  const selectedKpiDefs = AVAILABLE_KPIS.filter(k => activeKpis.includes(k.id));

  // Per le shortcut finali "recente"
  const openShortages = shortages.filter(s => !s.resolved_at);
  const pendingOrders = orders.filter(o => o.status === 'ordered');

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground text-sm">Panoramica della situazione aziendale.</p>
        </div>
        <button 
          onClick={() => setIsEditingSettings(!isEditingSettings)}
          className={`p-2 rounded-xl transition-colors ${isEditingSettings ? 'bg-primary/20 text-primary' : 'bg-card border border-border/40 text-muted-foreground hover:text-foreground'}`}
          title="Personalizza Dashboard"
        >
          {isEditingSettings ? <X className="w-5 h-5" /> : <Settings2 className="w-5 h-5" />}
        </button>
      </div>

      {isEditingSettings && (
        <div className="bg-card border border-primary/30 rounded-xl p-5 space-y-6 animate-in fade-in slide-in-from-top-2 shadow-lg shadow-primary/5">
          <div className="space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-primary" /> Panoramica KPI
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_KPIS.map(kpi => (
                <label key={kpi.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${activeKpis.includes(kpi.id) ? 'bg-primary/5 border-primary/30' : 'bg-background border-border/30 hover:bg-muted/50'}`}>
                  <input 
                    type="checkbox" 
                    checked={activeKpis.includes(kpi.id)}
                    onChange={() => toggleKpi(kpi.id)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary/50"
                  />
                  <div className="flex items-center gap-2">
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                    <span className="text-xs font-medium">{kpi.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Azioni Rapide
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_ACTIONS.map(action => (
                <label key={action.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${quickActions.includes(action.id) ? 'bg-primary/5 border-primary/30' : 'bg-background border-border/30 hover:bg-muted/50'}`}>
                  <input 
                    type="checkbox" 
                    checked={quickActions.includes(action.id)}
                    onChange={() => toggleQuickAction(action.id)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary/50"
                  />
                  <div className="flex items-center gap-2">
                    <action.icon className={`w-4 h-4 ${action.iconColor || 'text-foreground'}`} />
                    <span className="text-sm font-medium">{action.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {selectedKpiDefs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {selectedKpiDefs.map(kpi => (
            <div
              key={kpi.id}
              onClick={() => navigate(kpi.path)}
              className={`bg-card border rounded-xl p-4 space-y-2 cursor-pointer transition-colors ${kpi.border}`}
            >
              <div className={`flex items-center gap-2 ${kpi.color}`}>
                <kpi.icon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{kpi.label}</span>
              </div>
              <p className="text-2xl font-extrabold">{kpiData[kpi.id]}</p>
              <p className="text-xs text-muted-foreground">{kpi.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Azioni rapide */}
      {selectedActionDefs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Azioni rapide</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedActionDefs.map((action) => (
              <button
                key={action.id}
                onClick={() => navigate(action.path)}
                className={`rounded-xl p-4 text-left flex items-center justify-between gap-3 transition-all ${action.bg} ${action.border}`}
              >
                <div className="flex items-center gap-3">
                  <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                  <div>
                    <p className="font-bold text-sm">{action.label}</p>
                    <p className={`text-xs ${action.id === 'new_list' ? 'opacity-70' : 'text-muted-foreground'}`}>{action.desc}</p>
                  </div>
                </div>
                <ArrowRight className={`w-4 h-4 shrink-0 ${action.id === 'new_list' ? '' : 'text-muted-foreground'}`} />
              </button>
            ))}
          </div>
        </div>
      )}

      {(selectedKpiDefs.length === 0 && selectedActionDefs.length === 0 && !isEditingSettings) && (
        <div className="border border-dashed border-border/60 bg-card/30 rounded-xl py-12 flex flex-col items-center text-center space-y-3">
          <p className="text-sm text-muted-foreground">La tua dashboard è vuota.</p>
          <button onClick={() => setIsEditingSettings(true)} className="text-sm font-semibold text-primary hover:underline">
            Personalizzala ora
          </button>
        </div>
      )}

      {/* Segnalazioni aperte (Recenti) */}
      {openShortages.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Segnalazioni recenti</h3>
            <button
              onClick={() => navigate('/segnalazioni')}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Vedi tutte <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="bg-card border border-amber-500/20 rounded-xl divide-y divide-amber-500/10 overflow-hidden">
            {openShortages.slice(0, 5).map(s => (
              <div key={s.id} className="p-3 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{s.product_name ?? 'Segnalazione generica'}</p>
                  {s.notes && <p className="text-xs text-muted-foreground italic truncate">{s.notes}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(s.created_at).toLocaleDateString('it-IT')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ordini in arrivo (Recenti) */}
      {pendingOrders.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider">Ordini in arrivo</h3>
            <button
              onClick={() => navigate('/ordini')}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Vedi tutti <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="bg-card border border-purple-500/20 rounded-xl divide-y divide-purple-500/10 overflow-hidden">
            {pendingOrders.slice(0, 5).map(o => (
              <div key={o.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Package className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="font-semibold text-sm truncate">
                    {o.list_name || `Ordine del ${new Date(o.created_at).toLocaleDateString('it-IT')}`}
                  </span>
                </div>
                {o.expected_by && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    Previsto: {new Date(o.expected_by).toLocaleDateString('it-IT')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
