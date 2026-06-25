import { useEffect, useRef } from 'react';
import type { ItemInList } from '../../lib/api';
import { X, Minus, Plus, Save } from 'lucide-react';

interface WalkPendingSheetProps {
  editingItem: ItemInList | null;
  sheetValue: number;
  setSheetValue: (val: number | ((prev: number) => number)) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function WalkPendingSheet({ editingItem, sheetValue, setSheetValue, onClose, onSave }: WalkPendingSheetProps) {
  const sheetInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingItem) {
      setTimeout(() => sheetInputRef.current?.focus(), 50);
    }
  }, [editingItem]);

  if (!editingItem) return null;

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity touch-none" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border/40 rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 touch-none">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted rounded-full" />
        <div className="flex justify-between items-start mt-2 mb-6">
          <div>
            <h3 className="text-xl font-bold">{editingItem.product_name}</h3>
            <p className="text-sm text-muted-foreground mt-1">Modifica quantità da ordinare</p>
          </div>
          <button onClick={onClose} className="p-2 bg-muted/50 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center justify-between bg-background border border-border/40 rounded-2xl p-2 mb-6">
          <button onClick={() => setSheetValue(prev => Math.max(0, typeof prev === 'number' ? prev - 1 : 0))} className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
            <Minus className="w-6 h-6" />
          </button>
          <input
            ref={sheetInputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min="0"
            value={sheetValue === 0 ? '' : sheetValue}
            onChange={(e) => {
              const onlyDigits = e.target.value.replace(/\D/g, '');
              setSheetValue(onlyDigits === '' ? 0 : parseInt(onlyDigits, 10));
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') onSave(); }}
            className="w-24 text-center text-4xl font-black bg-transparent border-none focus:ring-0 p-0"
            placeholder="0"
          />
          <button onClick={() => setSheetValue(prev => (typeof prev === 'number' ? prev + 1 : 1))} className="p-4 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Plus className="w-6 h-6" />
          </button>
        </div>
        <button onClick={onSave} className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2">
          <Save className="w-5 h-5" /> Salva quantità
        </button>
      </div>
    </>
  );
}
