import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PurchaseOrder, PurchaseOrderDetail } from '../lib/api';
import { apiGet, apiPatch } from '../lib/api';
import { Package, ChevronRight, ChevronDown, ChevronUp, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from '../components/Toast';

export default function OrdersManage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'ordered' | 'received' | 'cancelled'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<string, PurchaseOrderDetail>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function caricaDati() {
      setLoading(true);
      try {
        const url = filter === 'all' ? '/purchase-orders/' : `/purchase-orders/?status=${filter}`;
        const data = await apiGet<PurchaseOrder[]>(url);
        if (isMounted) setOrders(data);
      } catch (e) {
        if (isMounted) toast.error('Errore durante il caricamento degli ordini.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    caricaDati();
    return () => { isMounted = false; };
  }, [filter]);

  async function aggiornaStato(id: string, nuovoStato: 'received' | 'cancelled') {
    setActionLoading(id);
    try {
      await apiPatch<PurchaseOrder>(`/purchase-orders/${id}/status?new_status=${nuovoStato}`);
      setOrders(orders.map((o) => o.id === id ? { ...o, status: nuovoStato } : o));
      toast.success(nuovoStato === 'received' ? 'Merce ricevuta con successo!' : 'Ordine annullato.');
    } catch (e) {
      toast.error('Errore durante l\'aggiornamento dell\'ordine.');
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleOrderDetail(orderId: string) {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    if (!orderDetails[orderId]) {
      setDetailLoading(orderId);
      try {
        const detail = await apiGet<PurchaseOrderDetail>(`/purchase-orders/${orderId}`);
        setOrderDetails(prev => ({ ...prev, [orderId]: detail }));
      } catch (e) {
        toast.error('Impossibile caricare i dettagli dell\'ordine.');
        setExpandedOrderId(null);
      } finally {
        setDetailLoading(null);
      }
    }
  }

  if (loading) {
    return <div className="text-muted-foreground text-sm">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight">Ordini d'acquisto</h2>
        <p className="text-muted-foreground text-sm">Storico e gestione degli ordini inviati.</p>
      </div>

      {/* Bottoni di filtro */}
      <div className="flex border-b border-border/40 gap-1 pb-px overflow-x-auto hide-scrollbar">
        {(['all', 'ordered', 'received', 'cancelled'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              filter === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'all' ? 'Tutti' : tab === 'ordered' ? 'Ordinati' : tab === 'received' ? 'Ricevuti' : 'Annullati'}
          </button>
        ))}
      </div>

      {orders.length === 0 && !loading && (
        <p className="text-muted-foreground text-sm">Nessun ordine trovato.</p>
      )}

      <div className="space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-card border border-border/40 rounded-xl p-4 space-y-2"
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-bold text-sm text-foreground">
                    {order.list_name || `Ordine del ${new Date(order.created_at).toLocaleDateString('it-IT')}`}
                  </span>
                </div>
                {order.list_name && (
                  <span className="text-xs text-muted-foreground ml-6">
                    Del {new Date(order.created_at).toLocaleDateString('it-IT')}
                  </span>
                )}
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                order.status === 'ordered'  ? 'bg-purple-500/10 text-purple-400' :
                order.status === 'received' ? 'bg-emerald-500/10 text-emerald-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                {order.status === 'ordered' ? 'Ordinato' : order.status === 'received' ? 'Ricevuto' : 'Annullato'}
              </span>
            </div>

            {order.expected_by && (() => {
              const deliveryDate = new Date(order.expected_by);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isPast = deliveryDate < today && order.status === 'ordered';
              return (
                <div className={`flex items-center gap-1.5 text-xs ${isPast ? 'text-orange-400' : 'text-muted-foreground'}`}>
                  {isPast && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                  <span>
                    Consegna prevista: {deliveryDate.toLocaleDateString('it-IT')}
                    {isPast && ' — In ritardo!'}
                  </span>
                </div>
              );
            })()}

            {order.notes && (
              <p className="text-xs text-muted-foreground italic">{order.notes}</p>
            )}

            {order.status === 'ordered' && (
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={() => {
                    if(window.confirm('Sei sicuro di voler annullare questo ordine?')) {
                      aggiornaStato(order.id, 'cancelled');
                    }
                  }}
                  disabled={actionLoading === order.id}
                  className="flex-1 border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-medium px-4 py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Annulla
                </button>
                <button
                  onClick={() => aggiornaStato(order.id, 'received')}
                  disabled={actionLoading === order.id}
                  className="flex-1 border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 font-medium px-4 py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Ricevuto
                </button>
              </div>
            )}

            {/* Accordion dettaglio articoli */}
            <button
              onClick={() => toggleOrderDetail(order.id)}
              className="mt-1 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {detailLoading === order.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : expandedOrderId === order.id ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              {expandedOrderId === order.id ? 'Nascondi articoli' : 'Mostra articoli'}
            </button>

            {expandedOrderId === order.id && orderDetails[order.id] && (
              <div className="bg-background/50 border border-border/30 rounded-lg divide-y divide-border/20 overflow-hidden">
                {orderDetails[order.id].items.map(item => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm">{item.product_name ?? item.item_id}</span>
                    <span className="text-sm font-bold text-primary tabular-nums">{item.quantity_ordered}</span>
                  </div>
                ))}
                {orderDetails[order.id].items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Nessun articolo.</p>
                )}
              </div>
            )}

            {order.list_id && (
              <button
                onClick={() => navigate(`/walk/${order.list_id}`, { state: { from: '/ordini' } })}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Apri Riepilogo Completo <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}