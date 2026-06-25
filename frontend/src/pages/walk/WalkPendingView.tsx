import { ClipboardList, Info, RotateCcw, Minus, Plus, MessageSquare, X, Truck, CalendarDays, FileText, Send, Loader2, AlertTriangle } from 'lucide-react';
import type { ItemInList, ShortageReport } from '../../lib/api';

interface WalkPendingViewProps {
  products: ItemInList[];
  activeShortages: ShortageReport[];
  genericShortages: ShortageReport[];
  fastUpdateQuantity: (p: ItemInList, delta: number) => void;
  handleClearList: () => void;
  handleResolveShortage: (reportId: string) => void;
  openPendingSheet: (item: ItemInList) => void;
  handleCreateOrder: () => void;
  ordering: boolean;
  expectedDate: string;
  setExpectedDate: (date: string) => void;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
}

export default function WalkPendingView({
  products,
  activeShortages,
  genericShortages,
  fastUpdateQuantity,
  handleClearList,
  handleResolveShortage,
  openPendingSheet,
  handleCreateOrder,
  ordering,
  expectedDate,
  setExpectedDate,
  orderNotes,
  setOrderNotes
}: WalkPendingViewProps) {
  return (
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
                  <CalendarDays className="w-3.5 h-3.5" /> Consegna prevista (opzionale)
                </label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={e => setExpectedDate(e.target.value)}
                  className="w-full bg-background border border-border/50 rounded-lg p-2.5 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                />
                {expectedDate && (() => {
                  const selected = new Date(expectedDate);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (selected < today) {
                    return (
                      <div className="flex items-center gap-1.5 text-xs text-orange-400 mt-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Attenzione: la data selezionata è già passata.</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-3.5 h-3.5" /> Note (opzionale)
                </label>
                <textarea
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  placeholder="Es. Richiedere consegna al mattino..."
                  className="w-full bg-background border border-border/50 rounded-lg p-2.5 text-sm min-h-[80px] resize-y focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleCreateOrder}
              disabled={ordering || products.filter(p => p.quantity > 0).length === 0}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2.5 disabled:opacity-50 mt-2"
            >
              {ordering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Invia Ordine
            </button>
            <div className="pt-2">
              <button onClick={handleClearList} className="w-full text-muted-foreground hover:text-red-400 text-xs font-medium py-2 flex items-center justify-center gap-1.5 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Annulla lista e ricomincia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
