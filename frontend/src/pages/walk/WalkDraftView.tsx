import { useState, useRef } from 'react';
import { Check, MessageSquare, ShoppingCart, Loader2, Sparkles, X, Save, CheckCheck } from 'lucide-react';
import type { Item, ShortageReport } from '../../lib/api';

interface WalkDraftViewProps {
  activeItems: Item[];
  byCategory: Record<string, Item[]>;
  getCategoryName: (catId: string) => string;
  genericShortages: ShortageReport[];
  activeShortages: ShortageReport[];
  counts: Record<string, number>;
  checkedItems: Record<string, boolean>;
  countedItems: number;
  totalItems: number;
  progress: number;
  generating: boolean;
  onSaveAndExit: () => void;
  openSheet: (item: Item) => void;
  handleResolveShortage: (reportId: string) => void;
  handleAutoGenerate: () => void;
  onMarkFull: (itemId: string) => void;
}

export default function WalkDraftView({
  byCategory,
  getCategoryName,
  genericShortages,
  activeShortages,
  counts,
  checkedItems,
  countedItems,
  totalItems,
  progress,
  generating,
  onSaveAndExit,
  openSheet,
  handleResolveShortage,
  handleAutoGenerate,
  onMarkFull,
}: WalkDraftViewProps) {

  // Swipe state per ogni item
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [swipeConfirmedId, setSwipeConfirmedId] = useState<string | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const swipeThreshold = 80;

  const handleTouchStart = (e: React.TouchEvent, itemId: string) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwipedItemId(null);
  };

  const handleTouchMove = (e: React.TouchEvent, itemId: string) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    // Se lo scroll verticale è prevalente, non intercettare
    if (Math.abs(dy) > Math.abs(dx) + 10) return;
    if (dx > 20) {
      // Previeni scroll orizzontale della pagina
      e.preventDefault();
      setSwipedItemId(itemId);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, item: Item) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dy) < Math.abs(dx) && dx >= swipeThreshold) {
      // Swipe confermato → segna come pieno
      setSwipeConfirmedId(item.id);
      onMarkFull(item.id);
      setTimeout(() => setSwipeConfirmedId(null), 800);
    }
    setSwipedItemId(null);
  };

  return (
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

      {/* Hint swipe */}
      <p className="text-xs text-muted-foreground text-center px-2">
        💡 Scorri un prodotto verso destra per segnare che hai tutta la quantità disponibile
      </p>

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
                const matchingShortage = activeShortages.find(s => s.item_id === item.id);
                const isSwiping = swipedItemId === item.id;
                const isJustConfirmed = swipeConfirmedId === item.id;
                return (
                  <div
                    key={item.id}
                    className="relative overflow-hidden"
                    onTouchStart={(e) => handleTouchStart(e, item.id)}
                    onTouchMove={(e) => handleTouchMove(e, item.id)}
                    onTouchEnd={(e) => handleTouchEnd(e, item)}
                  >
                    {/* Sfondo swipe — visibile SOLO durante lo swipe o la conferma */}
                    {(isSwiping || isJustConfirmed) && (
                      <div className={`absolute inset-y-0 left-0 right-0 flex items-center pl-5 ${isJustConfirmed ? 'bg-emerald-500/20' : 'bg-emerald-500/10'}`}>
                        <CheckCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span className="ml-2 text-xs font-bold text-emerald-400 whitespace-nowrap">Tutto disponibile!</span>
                      </div>
                    )}

                    <div
                      onClick={() => openSheet(item)}
                      className={`relative flex items-center justify-between p-4 cursor-pointer ${
                        isChecked ? 'bg-card' : 'bg-card hover:bg-background/40'
                      }`}
                      style={{
                        transform: isSwiping ? 'translateX(80px)' : isJustConfirmed ? 'translateX(0)' : 'translateX(0)',
                        transition: isSwiping ? 'transform 0.05s linear' : 'transform 0.25s ease-out',
                        backgroundColor: isChecked ? 'hsl(var(--card))' : undefined,
                      }}
                    >
                      {/* Overlay colorato quando spuntato, per mantenere sfondo solido */}
                      {isChecked && <div className="absolute inset-0 bg-primary/5 pointer-events-none rounded-none" />}
                      <div className="relative flex items-center gap-3">
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
                          {hasShortage && matchingShortage && (
                            <div className="text-xs text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1 mt-1.5 flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                <span className="italic">{matchingShortage.notes || 'Mancanza segnalata'}</span>
                              </div>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleResolveShortage(matchingShortage.id); 
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
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      {/* Azioni */}
      <div className="space-y-3">
        <button
          onClick={handleAutoGenerate}
          disabled={generating}
          className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2.5 disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          Genera Lista Spesa Automatica
        </button>

        <button
          onClick={onSaveAndExit}
          className="w-full border border-border hover:border-primary/40 hover:text-primary hover:bg-primary/5 text-muted-foreground font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Save className="w-4 h-4" />
          Salva ed esci
        </button>
      </div>
    </div>
  );
}
