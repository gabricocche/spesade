import { useState, useEffect, useMemo } from 'react';
import type { ShortageReport, Item } from '../lib/api';
import { apiGet, apiPost, apiPatch } from '../lib/api';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Search, Clock } from 'lucide-react';
import { toast } from '../components/Toast';

export default function ReportShortage() {
  const [segnalazioni, setSegnalazioni] = useState<ShortageReport[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'active' | 'resolved'>('active');

  const MAX_NOTES_LENGTH = 200;

  useEffect(() => {
    let isMounted = true;
    async function caricaDati() {
      setError(null);
      try {
        const [shorts, its] = await Promise.all([
          apiGet<ShortageReport[]>('/shortage-reports/all'),
          apiGet<Item[]>('/items/'),
        ]);
        if (!isMounted) return;
        setSegnalazioni(shorts);
        setItems(its);
      } catch (e: any) {
        console.error("Errore durante il caricamento dei dati:", e);
        if (isMounted) setError("Impossibile caricare i dati. Riprova più tardi.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    caricaDati();
    return () => { isMounted = false; };
  }, []);

  const activeReports = useMemo(
    () => segnalazioni.filter(s => !s.resolved_at),
    [segnalazioni]
  );

  const resolvedReports = useMemo(
    () => segnalazioni.filter(s => !!s.resolved_at),
    [segnalazioni]
  );

  const currentReports = tab === 'active' ? activeReports : resolvedReports;

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return currentReports;
    const q = searchQuery.toLowerCase();
    return currentReports.filter(s =>
      (s.product_name && s.product_name.toLowerCase().includes(q)) ||
      (s.notes && s.notes.toLowerCase().includes(q))
    );
  }, [currentReports, searchQuery]);

  async function inviaSegnalazione() {
    if (!selectedItemId && !notes.trim()) {
      toast.error('Scrivi nelle note cosa vorresti segnalare o consigliare.');
      return;
    }
    if (notes.length > MAX_NOTES_LENGTH) {
      toast.error(`Le note non possono superare ${MAX_NOTES_LENGTH} caratteri.`);
      return;
    }
    try {
      const nuova = await apiPost<ShortageReport>('/shortage-reports/', {
        item_id: selectedItemId || null,
        notes: notes || null,
      });
      setSegnalazioni(prev => [nuova, ...prev]);
      setSelectedItemId('');
      setNotes('');
      setIsFormOpen(false);
      toast.success('Segnalazione inviata!');
    } catch (e) {
      toast.error('Errore durante l\'invio della segnalazione.');
    }
  }

  async function risolviSegnalazione(id: string) {
    try {
      await apiPatch<ShortageReport>(`/shortage-reports/${id}/resolve`);
      setSegnalazioni(prev =>
        prev.map((s) => s.id === id ? { ...s, resolved_at: new Date().toISOString() } : s)
      );
      toast.success('Segnalazione risolta.');
    } catch (e) {
      toast.error('Impossibile risolvere la segnalazione.');
    }
  }

  if (loading) {
    return <div className="text-muted-foreground text-sm">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">

      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight">Segnala mancanza</h2>
        <p className="text-muted-foreground text-sm">Segnala un prodotto mancante o consiglia un nuovo acquisto.</p>
      </div>

      <div className="bg-card border border-border/40 rounded-xl p-5 space-y-4">
        <div 
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setIsFormOpen(!isFormOpen)}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-base">Nuova segnalazione</span>
          </div>
          <button className="text-muted-foreground">
            {isFormOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
        
        {isFormOpen && (
          <div className="space-y-3 pt-2 border-t border-border/20">
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full bg-background border border-border/60 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            >
              <option value="">(Segnalazione generica / Consiglia nuovo prodotto)</option>
              {items.filter(i => i.active).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <div className="relative">
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES_LENGTH))}
                placeholder="Note opzionali (es. scaffale vuoto da ieri...)"
                className={`w-full bg-background border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground pr-12 ${
                  notes.length >= MAX_NOTES_LENGTH ? 'border-red-500/60' : 'border-border/60'
                }`}
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono tabular-nums ${
                notes.length >= MAX_NOTES_LENGTH ? 'text-red-400' :
                notes.length >= MAX_NOTES_LENGTH * 0.8 ? 'text-orange-400' :
                'text-muted-foreground'
              }`}>
                {notes.length}/{MAX_NOTES_LENGTH}
              </span>
            </div>
            <button
              onClick={inviaSegnalazione}
              disabled={!selectedItemId && !notes.trim()}
              className="w-full bg-amber-500 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-40"
            >
              Invia segnalazione
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/40 gap-1 pb-px">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            tab === 'active' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Aperte ({activeReports.length})
        </button>
        <button
          onClick={() => setTab('resolved')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            tab === 'resolved' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Risolte ({resolvedReports.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca segnalazione..."
          className="w-full bg-card border border-border/40 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
        />
      </div>

      <div className="space-y-3">
        {filteredReports.length === 0 && (
          <div className="border border-dashed border-border/60 bg-card/30 rounded-xl py-12 flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500/60" />
            </div>
            <p className="text-muted-foreground text-sm">
              {tab === 'active'
                ? 'Tutto tranquillo! Nessuna segnalazione aperta.'
                : 'Nessuna segnalazione risolta trovata.'}
            </p>
            {tab === 'active' && (
              <button 
                onClick={() => setIsFormOpen(true)}
                className="text-amber-500 text-xs font-bold uppercase tracking-wider hover:underline"
              >
                C'è qualcosa che manca?
              </button>
            )}
          </div>
        )}

        {filteredReports.map((s) => (
          <div key={s.id} className={`bg-card border rounded-xl p-4 space-y-2 ${
            s.resolved_at ? 'border-border/20 opacity-70' : 'border-amber-500/20'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{s.product_name ?? 'Segnalazione generica'}</span>
              <div className="flex items-center gap-2">
                {s.resolved_at && (
                  <span className="text-xs text-emerald-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Risolta {new Date(s.resolved_at).toLocaleDateString('it-IT')}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString('it-IT')}
                </span>
              </div>
            </div>
            {s.notes && (
              <p className="text-xs text-muted-foreground italic">{s.notes}</p>
            )}
            {!s.resolved_at && (
              <button
                onClick={() => risolviSegnalazione(s.id)}
                className="w-full border border-border/60 hover:border-emerald-500/40 hover:text-emerald-400 text-muted-foreground font-medium px-4 py-2 rounded-lg text-xs transition-colors"
              >
                Segna come risolta
              </button>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}