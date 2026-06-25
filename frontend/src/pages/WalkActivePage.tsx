import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { ListDetails, ItemInList, Item, Category } from '../lib/api';
import { apiGet, apiPatch, apiPost, apiDelete } from '../lib/api';
import { toast } from '../components/Toast';
import {
  ArrowLeft, Check, Minus, Plus, Sparkles, Loader2,
  ShoppingCart, ClipboardList, Truck, CheckCircle2,
  RotateCcw, Trash2, CalendarDays, FileText, Send, X,
  MessageSquare, Info, XCircle, Package, AlertTriangle, Save
} from 'lucide-react';

interface ShortageReport {
  id: string;
  item_id: string;
  notes: string | null;
  resolved_at: string | null;
}

const SAFE_ROUTES = ['/', '/liste', '/ordini', '/segnalazioni'];

export default function WalkActivePage() {
  const { listId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Validazione del fromRoute per evitare navigazione a percorsi non sicuri
  const rawFrom = location.state?.from;
  const fromRoute = SAFE_ROUTES.includes(rawFrom) ? rawFrom : '/liste';

  const [dettagli, setDettagli] = useState<ListDetails | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shortages, setShortages] = useState<ShortageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stato ricognizione
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Bottom sheet
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [sheetValue, setSheetValue] = useState(0);

  // Bottom sheet per Pending
  const [editingPendingItem, setEditingPendingItem] = useState<ItemInList | null>(null);
  const [pendingSheetValue, setPendingSheetValue] = useState(0);

  // Form ordine
  const [expectedDate, setExpectedDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Loading states
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderActionLoading, setOrderActionLoading] = useState(false);

  // Ref per annullamento fetch in fastUpdateQuantity (anti-race-condition)
  const pendingUpdates = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    async function caricaDati() {
      try {
        const [dati, its, cats, shorts] = await Promise.all([
          apiGet<ListDetails>(`/lists/${listId}/items`),
          apiGet<Item[]>('/items/'),
          apiGet<Category[]>('/categories/'),
          apiGet<ShortageReport[]>('/shortage-reports/'),
        ]);
        setDettagli(dati);
        setItems(its);
        setCategories(cats);
        setShortages(shorts);
        const initCounts: Record<string, number> = {};
        const initChecked: Record<string, boolean> = {};
        its.forEach(i => { initCounts[i.id] = 0; initChecked[i.id] = false; });
        setCounts(initCounts);
        setCheckedItems(initChecked);
      } catch (err) {
        setError('Errore durante il caricamento della lista.');
        toast.error('Impossibile caricare i dati della lista.');
      } finally {
        setLoading(false);
      }
    }
    caricaDati();
  }, [listId]);

  // Calcoli memoizzati per evitare re-render inutili
  const activeItems = useMemo(() => items.filter(i => i.active), [items]);

  const getCategoryName = useCallback(
    (catId: string) => categories.find(c => c.id === catId)?.name ?? 'Senza categoria',
    [categories]
  );

  const byCategory = useMemo(() => {
    const grouped: Record<string, Item[]> = {};
    activeItems.forEach(item => {
      if (!grouped[item.category_id]) grouped[item.category_id] = [];
      grouped[item.category_id].push(item);
    });
    return grouped;
  }, [activeItems]);

  const activeShortages = useMemo(
    () => shortages.filter(s => !s.resolved_at),
    [shortages]
  );

  const genericShortages = useMemo(
    () => activeShortages.filter(s => !s.item_id),
    [activeShortages]
  );

  // Progresso ricognizione
  const totalItems = activeItems.length;
  const countedItems = useMemo(
    () => Object.values(checkedItems).filter(Boolean).length,
    [checkedItems]
  );
  const progress = totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm">Caricamento...</p>
      </div>
    );
  }

  if (error || !dettagli) {
    return (
      <div className="space-y-4 py-10 text-center">
        <div className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl">
          <p className="font-bold text-lg">Ops! Qualcosa è andato storto.</p>
          <p className="text-sm mt-2">{error || 'Impossibile caricare i dati.'}</p>
        </div>
        <button
          onClick={() => navigate('/liste')}
          className="text-primary hover:underline text-sm flex items-center gap-1.5 mx-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Torna alle liste
        </button>
      </div>
    );
  }

  const { list_name, products, status } = dettagli;

  // Bottom sheet draft
  const openSheet = (item: Item) => {
    setSelectedItem(item);
    setSheetValue(checkedItems[item.id] ? counts[item.id] : 0);
  };
  const closeSheet = () => setSelectedItem(null);
  const saveCount = () => {
    if (!selectedItem) return;
    setCounts(prev => ({ ...prev, [selectedItem.id]: sheetValue }));
    setCheckedItems(prev => ({ ...prev, [selectedItem.id]: true }));
    closeSheet();
  };

  // Bottom sheet pending
  const openPendingSheet = (item: ItemInList) => {
    setEditingPendingItem(item);
    setPendingSheetValue(item.quantity);
  };
  const closePendingSheet = () => setEditingPendingItem(null);
  const savePendingCount = async () => {
    if (!editingPendingItem) return;
    try {
      await apiPatch(`/lists/${listId}/items/${editingPendingItem.item_id}/quantity`, { quantity: pendingSheetValue });
      const dati = await apiGet<ListDetails>(`/lists/${listId}/items`);
      setDettagli(dati);
      toast.success('Quantità aggiornata.');
    } catch (e) {
      toast.error('Errore durante l\'aggiornamento della quantità.');
    } finally {
      closePendingSheet();
    }
  };

  // Update rapido con protezione race condition
  const fastUpdateQuantity = async (p: ItemInList, delta: number) => {
    const newQty = Math.max(0, p.quantity + delta);
    if (newQty === p.quantity) return;

    // Optimistic update
    setDettagli(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        products: prev.products.map(prod => prod.item_id === p.item_id ? { ...prod, quantity: newQty } : prod)
      };
    });

    // Annulla il fetch precedente per lo stesso item
    const prev = pendingUpdates.current.get(p.item_id);
    if (prev) prev.abort();

    const controller = new AbortController();
    pendingUpdates.current.set(p.item_id, controller);

    try {
      await apiPatch(`/lists/${listId}/items/${p.item_id}/quantity`, { quantity: newQty });
      // Non fare apiGet qui — l'optimistic update è sufficiente se la PATCH ha successo
    } catch (e: any) {
      if (e.name === 'AbortError') return; // Ignorata, è stata sostituita
      toast.error('Errore durante l\'aggiornamento rapido della quantità.');
      // Solo in caso di errore facciamo il re-fetch per risincronizzare
      try {
        const dati = await apiGet<ListDetails>(`/lists/${listId}/items`);
        setDettagli(dati);
      } catch { /* ignora errori di re-fetch */ }
    } finally {
      pendingUpdates.current.delete(p.item_id);
    }
  };

  // Azioni
  const handleAutoGenerate = async () => {
    // Warning per prodotti non spuntati
    const unchecked = activeItems.filter(i => !checkedItems[i.id]);

    // Calcola quanti prodotti verranno ordinati (anteprima)
    const inventory = activeItems.map(item => ({
      item_id: item.id,
      current_quantity: checkedItems[item.id] ? counts[item.id] : 0,
    }));
    const itemsToOrder = activeItems.filter(item => {
      const current = checkedItems[item.id] ? counts[item.id] : 0;
      return item.target_quantity - current > 0;
    });

    let message = `Verranno aggiunti ${itemsToOrder.length} prodott${itemsToOrder.length === 1 ? 'o' : 'i'} alla lista della spesa.`;
    if (unchecked.length > 0) {
      message = `Attenzione: ${unchecked.length} prodott${unchecked.length === 1 ? 'o non è stato conteggiato' : 'i non sono stati conteggiati'} ` +
        `e verranno considerati esauriti (quantità = 0).\n\n` + message;
    }
    message += '\n\nVuoi continuare?';

    if (!window.confirm(message)) return;

    setGenerating(true);
    try {
      const inventory = activeItems.map(item => ({
        item_id: item.id,
        current_quantity: checkedItems[item.id] ? counts[item.id] : 0,
      }));
      await apiPost(`/lists/${listId}/auto-generate`, { inventory });
      await apiPatch(`/lists/${listId}/status?new_status=pending`);
      const dati = await apiGet<ListDetails>(`/lists/${listId}/items`);
      setDettagli(dati);
      toast.success('Lista spesa generata!');
    } catch (e) {
      toast.error('Errore durante la generazione della lista.');
    } finally {
      setGenerating(false);
    }
  };

  const handleClearList = async () => {
    if (!window.confirm('Sei sicuro di voler svuotare la lista? Dovrai rifare la ricognizione.')) return;
    setClearing(true);
    try {
      await apiDelete(`/lists/${listId}/clear`);
      const initCounts: Record<string, number> = {};
      const initChecked: Record<string, boolean> = {};
      activeItems.forEach(i => { initCounts[i.id] = 0; initChecked[i.id] = false; });
      setCounts(initCounts);
      setCheckedItems(initChecked);
      const dati = await apiGet<ListDetails>(`/lists/${listId}/items`);
      setDettagli(dati);
      toast.success('Lista svuotata.');
    } catch (e) {
      toast.error('Errore durante lo svuotamento della lista.');
    } finally {
      setClearing(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!products || products.length === 0) return;
    setOrdering(true);
    try {
      await apiPost('/purchase-orders/', {
        list_id: listId,
        expected_by: expectedDate || undefined,
        notes: orderNotes || undefined,
        items: products
          .filter(p => p.quantity > 0)
          .map((p: ItemInList) => ({
            item_id: p.item_id,
            quantity_ordered: p.quantity,
          })),
      });
      toast.success('Ordine creato con successo!');
      navigate('/ordini'); // Naviga alla pagina ordini per vedere l'ordine appena creato
    } catch (e) {
      toast.error('Errore durante la creazione dell\'ordine.');
    } finally {
      setOrdering(false);
    }
  };

  const handleResolveShortage = async (reportId: string) => {
    try {
      await apiPatch(`/shortage-reports/${reportId}/resolve`);
      setShortages(prev => prev.map(s => s.id === reportId ? { ...s, resolved_at: new Date().toISOString() } : s));
      toast.success('Segnalazione chiusa.');
    } catch (e) {
      toast.error('Impossibile chiudere la segnalazione.');
    }
  };

  const handleUpdateOrderStatus = async (nuovoStato: 'received' | 'cancelled') => {
    setOrderActionLoading(true);
    try {
      // 1. Fetch only orders linked to this list
      const orders = await apiGet<any[]>(`/purchase-orders/?list_id=${listId}&status=ordered`);
      const order = orders[0];
      if (!order) throw new Error('Nessun ordine in attesa per questa lista.');

      // 2. Patch the order status (which will also update the list status in the DB)
      await apiPatch(`/purchase-orders/${order.id}/status?new_status=${nuovoStato}`);
      toast.success(nuovoStato === 'received' ? 'Merce ricevuta con successo!' : 'Ordine annullato.');
      
      // 3. Refresh list details to reflect the new status
      const dati = await apiGet<ListDetails>(`/lists/${listId}/items`);
      setDettagli(dati);
    } catch (e) {
      toast.error('Errore durante l\'aggiornamento dell\'ordine.');
    } finally {
      setOrderActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(fromRoute)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Indietro
        </button>
        <div className="text-right">
          <h2 className="text-lg font-bold">{list_name}</h2>
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
            status === 'draft' ? 'bg-amber-500/10 text-amber-400' :
            status === 'pending' ? 'bg-blue-500/10 text-blue-400' :
            status === 'ordered' ? 'bg-purple-500/10 text-purple-400' :
            status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
            'bg-red-500/10 text-red-400'
          }`}>
            {status === 'draft' ? 'Bozza' : status === 'pending' ? 'In corso' :
             status === 'ordered' ? 'Ordinata' : status === 'completed' ? 'Completata' : 'Annullata'}
          </span>
        </div>
      </div>

      {/* ── VISTA DRAFT: ricognizione dispensa ── */}
      {status === 'draft' && (
        <div className="space-y-5">

          {/* Barra progresso */}
          <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Progresso ricognizione</span>
              <span className="font-bold text-primary">{countedItems} / {totalItems}</span>
            </div>
            <div className="w-full bg-background h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Segnalazioni Generiche */}
          {genericShortages.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider px-1">
                Consigli e Note Generiche
              </h3>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl divide-y divide-amber-500/10 overflow-hidden">
                {genericShortages.map(report => (
                  <div key={report.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-amber-600">Segnalazione generica</p>
                        <p className="text-xs text-amber-600/80 italic">{report.notes}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleResolveShortage(report.id)} 
                      className="p-2 hover:bg-amber-500/10 text-amber-600 rounded-lg transition-colors"
                      title="Segna come risolta"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prodotti per categoria */}
          {Object.keys(byCategory)
            .sort((a, b) => getCategoryName(a).localeCompare(getCategoryName(b)))
            .map(catId => (
              <div key={catId} className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                  {getCategoryName(catId)}
                </h3>
                <div className="bg-card border border-border/40 rounded-xl divide-y divide-border/20 overflow-hidden">
                  {byCategory[catId].map(item => {
                    const isChecked = checkedItems[item.id];
                    const hasShortage = activeShortages.some(s => s.item_id === item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => openSheet(item)}
                        className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                          isChecked ? 'bg-primary/5' : 'hover:bg-background/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                            isChecked
                              ? 'bg-primary/20 border-primary/40 text-primary'
                              : 'bg-background border-border/30 text-muted-foreground'
                          }`}>
                            {isChecked ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Target: {item.target_quantity} {item.unit}
                            </p>
                            {hasShortage && (
                              <div className="text-xs text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1 mt-1.5 flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                  <span className="italic">{activeShortages.find(s => s.item_id === item.id)?.notes || 'Mancanza segnalata'}</span>
                                </div>
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    handleResolveShortage(activeShortages.find(s => s.item_id === item.id)!.id); 
                                  }} 
                                  className="p-1 hover:bg-amber-500/10 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {isChecked && (
                          <span className="text-lg font-bold text-primary tabular-nums">{counts[item.id]}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

          {/* Bottone genera lista */}
          <button
            onClick={handleAutoGenerate}
            disabled={generating}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Genera Lista Spesa Automatica
          </button>
        </div>
      )}

      {/* ── VISTA PENDING: riepilogo da ordinare ── */}
      {status === 'pending' && (
        <div className="space-y-6">
          <div className="bg-card border border-border/40 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-blue-400">
              <ClipboardList className="w-5 h-5" />
              <span className="font-bold text-sm">Riepilogo da ordinare</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {products.length === 0
                ? 'Nessun articolo da ordinare — la dispensa è al completo!'
                : `${products.length} articol${products.length === 1 ? 'o' : 'i'} da ordinare`}
            </p>
          </div>

          {/* Segnalazioni Generiche */}
          {genericShortages.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider px-1">
                Consigli e Note Generiche
              </h3>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl divide-y divide-amber-500/10 overflow-hidden">
                {genericShortages.map(report => (
                  <div key={report.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-amber-600">Segnalazione generica</p>
                        <p className="text-xs text-amber-600/80 italic">{report.notes}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleResolveShortage(report.id)} 
                      className="p-2 hover:bg-amber-500/10 text-amber-600 rounded-lg transition-colors"
                      title="Segna come risolta"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {products.length === 0 ? (
            <div className="border border-dashed border-border/60 rounded-xl py-12 text-center text-muted-foreground space-y-3">
              <Info className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-sm">La dispensa è già al completo!</p>
              <button onClick={handleClearList} className="text-primary hover:underline text-xs flex items-center gap-1.5 mx-auto">
                <RotateCcw className="w-3.5 h-3.5" /> Ripristina e ricomincia
              </button>
            </div>
          ) : (
            <div className="space-y-5">

              {/* Lista prodotti */}
              <div className="bg-card border border-border/40 rounded-xl divide-y divide-border/20 overflow-hidden">
                {products.map((p: ItemInList, idx: number) => {
                  const matchingReport = activeShortages.find(s => s.item_id === p.item_id);
                  return (
                    <div 
                      key={p.item_id} 
                      onClick={() => openPendingSheet(p)} 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-background/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-6 h-6 rounded-full bg-muted/40 border border-border/50 flex items-center justify-center text-muted-foreground text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{p.product_name}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-muted-foreground mr-1">Quantità:</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); fastUpdateQuantity(p, -1); }}
                              className="p-1 rounded bg-muted/60 hover:bg-muted text-muted-foreground transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-semibold text-primary min-w-[20px] text-center">{p.quantity}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); fastUpdateQuantity(p, 1); }}
                              className="p-1 rounded bg-muted/60 hover:bg-muted text-muted-foreground transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          {matchingReport && (
                            <div className="text-xs text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1 mt-1.5 flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                <span className="italic">{matchingReport.notes ?? 'Mancanza segnalata'}</span>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); handleResolveShortage(matchingReport.id); }} className="p-1 hover:bg-amber-500/10 rounded">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Form ordine */}
              <div className="bg-card border border-border/40 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-sm">Genera Ordine d'Acquisto</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                      <CalendarDays className="w-3.5 h-3.5" /> Data consegna prevista
                    </label>
                    <input
                      type="date"
                      value={expectedDate}
                      onChange={e => setExpectedDate(e.target.value)}
                      className="w-full bg-background border border-border/40 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                      <FileText className="w-3.5 h-3.5" /> Note per il fornitore (opzionale)
                    </label>
                    <textarea
                      value={orderNotes}
                      onChange={e => setOrderNotes(e.target.value)}
                      placeholder="Es. consegna al mattino, urgente..."
                      rows={2}
                      className="w-full bg-background border border-border/40 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateOrder}
                  disabled={ordering}
                  className="w-full bg-emerald-600 hover:bg-emerald-600/95 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  {ordering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Invia Ordine d'Acquisto
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    toast.success('Modifiche salvate con successo!');
                    navigate(fromRoute);
                  }}
                  className="flex-1 border border-border hover:border-primary/40 hover:text-primary hover:bg-primary/5 text-muted-foreground font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Salva ed esci
                </button>

                <button
                  onClick={handleClearList}
                  disabled={clearing}
                  className="flex-1 border border-border hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/5 text-muted-foreground font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Svuota lista
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VISTA ORDERED ── */}
      {status === 'ordered' && (
        <div className="space-y-6">
          <div className="bg-card border border-purple-500/20 rounded-xl p-6 text-center space-y-4">
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto">
                <Truck className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="font-bold text-lg">Ordine Piazzato</h3>
              <p className="text-sm text-muted-foreground">In attesa della consegna dal fornitore.</p>
            </div>
            
            {/* Bottoni Azione Ordine */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  if(window.confirm('Sei sicuro di voler annullare questo ordine?')) {
                    handleUpdateOrderStatus('cancelled');
                  }
                }}
                disabled={orderActionLoading}
                className="flex-1 border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-medium px-4 py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {orderActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Annulla
              </button>
              <button
                onClick={() => handleUpdateOrderStatus('received')}
                disabled={orderActionLoading}
                className="flex-1 border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 font-medium px-4 py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {orderActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Ricevuto
              </button>
            </div>
          </div>
          <div className="bg-card border border-border/40 rounded-xl divide-y divide-border/20 overflow-hidden">
            <div className="px-4 py-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Articoli ordinati — {products.length}
              </span>
            </div>
            {products.map((p: ItemInList) => (
              <div key={p.item_id} className="flex items-center justify-between p-4">
                <p className="font-semibold text-sm">{p.product_name}</p>
                <span className="text-sm font-bold text-primary tabular-nums">{p.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VISTA COMPLETED ── */}
      {status === 'completed' && (
        <div className="space-y-6">
          <div className="bg-card border border-emerald-500/20 rounded-xl p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="font-bold text-lg">Merce Ricevuta</h3>
            <p className="text-sm text-muted-foreground">La dispensa è stata rifornita.</p>
          </div>
          <div className="bg-card border border-border/40 rounded-xl divide-y divide-border/20 overflow-hidden">
            {products.map((p: ItemInList) => (
              <div key={p.item_id} className="flex items-center justify-between p-4 opacity-70">
                <p className="font-semibold text-sm">{p.product_name}</p>
                <span className="text-sm font-bold text-emerald-400 tabular-nums">{p.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VISTA CANCELLED ── */}
      {status === 'cancelled' && (
        <div className="space-y-6">
          <div className="bg-card border border-red-500/20 rounded-xl p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <XCircle className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="font-bold text-lg">Ordine Annullato</h3>
            <p className="text-sm text-muted-foreground">Questo ordine non è andato a buon fine.</p>
          </div>
          <div className="bg-card border border-border/40 rounded-xl divide-y divide-border/20 overflow-hidden">
            {products.map((p: ItemInList) => (
              <div key={p.item_id} className="flex items-center justify-between p-4 opacity-50">
                <p className="font-semibold text-sm line-through">{p.product_name}</p>
                <span className="text-sm font-bold text-red-400 tabular-nums line-through">{p.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BOTTOM SHEET ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="absolute inset-0" onClick={closeSheet} />
          <div className="relative z-10 w-full max-w-md bg-card border-t border-border rounded-t-3xl p-6 space-y-6 shadow-2xl pb-10">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold">{selectedItem.name}</h4>
                <p className="text-xs text-muted-foreground">Target: {selectedItem.target_quantity} {selectedItem.unit}</p>
              </div>
              <button onClick={closeSheet} className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border text-muted-foreground">
                Annulla
              </button>
            </div>
            <div className="flex flex-col items-center gap-2 py-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantità disponibile:</span>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setSheetValue(prev => Math.max(0, prev - 1))}
                  className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center text-foreground"
                >
                  <Minus className="w-6 h-6" />
                </button>
                <input
                  type="number"
                  value={sheetValue}
                  onChange={e => setSheetValue(Math.min(selectedItem.target_quantity, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-20 bg-transparent text-center text-4xl font-extrabold text-primary outline-none"
                />
                <button
                  onClick={() => setSheetValue(prev => Math.min(selectedItem.target_quantity, prev + 1))}
                  className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center text-foreground"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
              <span className="text-sm text-muted-foreground font-semibold mt-2">{selectedItem.unit}</span>
            </div>
            <button
              onClick={saveCount}
              className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Salva Conteggio
            </button>
          </div>
        </div>
      )}
      {/* ── BOTTOM SHEET PENDING ── */}
      {editingPendingItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="absolute inset-0" onClick={closePendingSheet} />
          <div className="relative z-10 w-full max-w-md bg-card border-t border-border rounded-t-3xl p-6 space-y-6 shadow-2xl pb-10">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-lg font-bold">{editingPendingItem.product_name}</h4>
                <p className="text-xs text-muted-foreground">Modifica la quantità da ordinare</p>
              </div>
              <button onClick={closePendingSheet} className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border text-muted-foreground">
                Annulla
              </button>
            </div>
            <div className="flex flex-col items-center gap-2 py-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantità da ordinare:</span>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setPendingSheetValue(prev => Math.max(0, prev - 1))}
                  className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center text-foreground"
                >
                  <Minus className="w-6 h-6" />
                </button>
                <input
                  type="number"
                  value={pendingSheetValue}
                  onChange={e => setPendingSheetValue(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 bg-transparent text-center text-4xl font-extrabold text-primary outline-none"
                />
                <button
                  onClick={() => setPendingSheetValue(prev => prev + 1)}
                  className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center text-foreground"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>
            <button
              onClick={savePendingCount}
              className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Salva Modifica
            </button>
          </div>
        </div>
      )}
    </div>
  );
}