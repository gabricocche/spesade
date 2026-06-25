import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { ListDetails, ItemInList, Item, Category, ShortageReport } from '../../lib/api';
import { apiGet, apiPatch, apiPost, apiDelete } from '../../lib/api';
import { toast } from '../../components/Toast';
import { ArrowLeft, Loader2 } from 'lucide-react';

import WalkHeader from './WalkHeader';
import WalkDraftView from './WalkDraftView';
import WalkPendingView from './WalkPendingView';
import WalkStatusView from './WalkStatusView';
import WalkCountSheet from './WalkCountSheet';
import WalkPendingSheet from './WalkPendingSheet';

const SAFE_ROUTES = ['/', '/liste', '/ordini', '/segnalazioni'];

export default function WalkActivePage() {
  const { listId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const rawFrom = location.state?.from;
  const fromRoute = SAFE_ROUTES.includes(rawFrom) ? rawFrom : '/liste';

  const [dettagli, setDettagli] = useState<ListDetails | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shortages, setShortages] = useState<ShortageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [sheetValue, setSheetValue] = useState<number>(0);

  const [editingPendingItem, setEditingPendingItem] = useState<ItemInList | null>(null);
  const [pendingSheetValue, setPendingSheetValue] = useState<number>(0);

  const [expectedDate, setExpectedDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderActionLoading, setOrderActionLoading] = useState(false);

  const pendingUpdates = useRef<Map<string, AbortController>>(new Map());

  // Chiave localStorage per i conteggi di questa lista
  const storageKey = `draft_counts_${listId}`;

  useEffect(() => {
    let isMounted = true;

    async function caricaDati() {
      try {
        const [dati, its, cats, shorts] = await Promise.all([
          apiGet<ListDetails>(`/lists/${listId}/items`),
          apiGet<Item[]>('/items/'),
          apiGet<Category[]>('/categories/'),
          apiGet<ShortageReport[]>('/shortage-reports/'),
        ]);
        if (!isMounted) return;
        setDettagli(dati);
        setItems(its);
        setCategories(cats);
        setShortages(shorts);

        // Ripristina dal localStorage se disponibile (e la lista è ancora in bozza)
        const saved = dati.status === 'draft' ? localStorage.getItem(storageKey) : null;
        if (saved) {
          try {
            const { counts: savedCounts, checked: savedChecked } = JSON.parse(saved);
            // Inizializza tutti gli item a 0, poi sovrapponi i dati salvati
            const initCounts: Record<string, number> = {};
            const initChecked: Record<string, boolean> = {};
            its.forEach(i => { initCounts[i.id] = savedCounts?.[i.id] ?? 0; initChecked[i.id] = savedChecked?.[i.id] ?? false; });
            setCounts(initCounts);
            setCheckedItems(initChecked);
            toast.success('Progresso ricognizione ripristinato ✅');
            return;
          } catch { /* ignora dati corrotti */ }
        }

        // Nessun salvataggio — inizia da zero
        const initCounts: Record<string, number> = {};
        const initChecked: Record<string, boolean> = {};
        its.forEach(i => { initCounts[i.id] = 0; initChecked[i.id] = false; });
        setCounts(initCounts);
        setCheckedItems(initChecked);
      } catch (err) {
        if (!isMounted) return;
        setError('Errore durante il caricamento della lista.');
        toast.error('Impossibile caricare i dati della lista.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    caricaDati();
    return () => { isMounted = false; };
  }, [listId]);

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

  // Blocca scroll del body quando il sheet è aperto
  useEffect(() => {
    const isSheetOpen = !!selectedItem || !!editingPendingItem;
    document.body.style.overflow = isSheetOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedItem, editingPendingItem]);

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

  // Swipe → segna tutto il target come disponibile
  const onMarkFull = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    setCounts(prev => ({ ...prev, [itemId]: item.target_quantity }));
    setCheckedItems(prev => ({ ...prev, [itemId]: true }));
  };

  // Salva il progresso della ricognizione in localStorage ed esce
  const handleSaveAndExit = () => {
    localStorage.setItem(storageKey, JSON.stringify({ counts, checked: checkedItems }));
    toast.success('Progresso salvato!');
    navigate(fromRoute);
  };

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

  const fastUpdateQuantity = async (p: ItemInList, delta: number) => {
    const newQty = Math.max(0, p.quantity + delta);
    if (newQty === p.quantity) return;

    setDettagli(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        products: prev.products.map(prod => prod.item_id === p.item_id ? { ...prod, quantity: newQty } : prod)
      };
    });

    // Cancella la richiesta precedente per lo stesso item (debounce)
    const prevUpdate = pendingUpdates.current.get(p.item_id);
    if (prevUpdate) prevUpdate.abort();

    const controller = new AbortController();
    pendingUpdates.current.set(p.item_id, controller);

    try {
      // Ora il signal viene effettivamente passato a fetch
      await apiPatch(`/lists/${listId}/items/${p.item_id}/quantity`, { quantity: newQty }, controller.signal);
    } catch (e: any) {
      if (e.name === 'AbortError') return; // richiesta cancellata intenzionalmente
      toast.error('Errore durante l\'aggiornamento rapido della quantità.');
      try {
        const dati = await apiGet<ListDetails>(`/lists/${listId}/items`);
        setDettagli(dati);
      } catch { /* ignora errori di re-fetch */ }
    } finally {
      pendingUpdates.current.delete(p.item_id);
    }
  };

  const handleAutoGenerate = async () => {
    const unchecked = activeItems.filter(i => !checkedItems[i.id]);

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
      localStorage.removeItem(storageKey); // pulizia: non serve più il progresso
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
      localStorage.removeItem(storageKey); // pulizia: progresso non più valido
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
      navigate('/ordini');
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
      const ordersRes = await apiGet<any[]>(`/purchase-orders/?list_id=${listId}&status=ordered`);
      const order = ordersRes[0];
      if (!order) throw new Error('Nessun ordine in attesa per questa lista.');

      await apiPatch(`/purchase-orders/${order.id}/status?new_status=${nuovoStato}`);
      toast.success(nuovoStato === 'received' ? 'Merce ricevuta con successo!' : 'Ordine annullato.');
      
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
      <WalkHeader listName={list_name} status={status} fromRoute={fromRoute} />

      {status === 'draft' && (
        <WalkDraftView 
          activeItems={activeItems}
          byCategory={byCategory}
          getCategoryName={getCategoryName}
          genericShortages={genericShortages}
          activeShortages={activeShortages}
          counts={counts}
          checkedItems={checkedItems}
          countedItems={countedItems}
          totalItems={totalItems}
          progress={progress}
          generating={generating}
          onSaveAndExit={handleSaveAndExit}
          openSheet={openSheet}
          handleResolveShortage={handleResolveShortage}
          handleAutoGenerate={handleAutoGenerate}
          onMarkFull={onMarkFull}
        />
      )}

      {status === 'pending' && (
        <WalkPendingView 
          products={products}
          activeShortages={activeShortages}
          genericShortages={genericShortages}
          fastUpdateQuantity={fastUpdateQuantity}
          handleClearList={handleClearList}
          handleResolveShortage={handleResolveShortage}
          openPendingSheet={openPendingSheet}
          handleCreateOrder={handleCreateOrder}
          ordering={ordering}
          expectedDate={expectedDate}
          setExpectedDate={setExpectedDate}
          orderNotes={orderNotes}
          setOrderNotes={setOrderNotes}
        />
      )}

      {(status === 'ordered' || status === 'completed' || status === 'cancelled') && (
        <WalkStatusView
          status={status}
          products={products}
          orderActionLoading={orderActionLoading}
          handleUpdateOrderStatus={handleUpdateOrderStatus}
        />
      )}

      <WalkCountSheet 
        selectedItem={selectedItem} 
        sheetValue={sheetValue} 
        setSheetValue={setSheetValue} 
        onClose={closeSheet} 
        onSave={saveCount} 
      />

      <WalkPendingSheet 
        editingItem={editingPendingItem} 
        sheetValue={pendingSheetValue} 
        setSheetValue={setPendingSheetValue} 
        onClose={closePendingSheet} 
        onSave={savePendingCount} 
      />
    </div>
  );
}
