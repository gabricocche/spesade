import { Truck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { ItemInList } from '../../lib/api';

interface WalkStatusViewProps {
  status: 'ordered' | 'completed' | 'cancelled';
  products: ItemInList[];
  orderActionLoading: boolean;
  handleUpdateOrderStatus: (status: 'received' | 'cancelled') => void;
}

export default function WalkStatusView({
  status,
  products,
  orderActionLoading,
  handleUpdateOrderStatus
}: WalkStatusViewProps) {
  return (
    <>
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
                <p className="font-semibold text-sm text-muted-foreground">{p.product_name}</p>
                <span className="text-sm font-bold text-muted-foreground tabular-nums">{p.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
