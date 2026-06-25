import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ShoppingList } from '../lib/api';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { Plus, ChevronRight, Play, Loader2, PlusCircle, ChevronDown, ChevronUp, ListX, Trash2, CalendarDays } from 'lucide-react';
import { toast } from '../components/Toast';

const statusLabel: Record<ListStatus, string> = {
  draft: 'Bozza',
  pending: 'In corso',
  ordered: 'Ordinata',
  completed: 'Completata',
  cancelled: 'Annullata',
};

const statusClass: Record<ListStatus, string> = {
  draft: 'bg-blue-500/10 text-blue-400',
  pending: 'bg-amber-500/10 text-amber-400',
  ordered: 'bg-purple-500/10 text-purple-400',
  completed: 'bg-emerald-500/10 text-emerald-400',
  cancelled: 'bg-red-500/10 text-red-400',
};

export default function ListePage() {
  const navigate = useNavigate();
  const [liste, setListe] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [listname, setListname] = useState<string>('');
  const [filter, setFilter] = useState<'active' | 'draft' | 'pending' | 'archived'>('active');
  const [creating, setCreating] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [nameError, setNameError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function caricaDati() {
      try {
        const lists = await apiGet<ShoppingList[]>('/lists/');
        if (isMounted) setListe(lists);
      } catch (e) {
        if (isMounted) toast.error('Errore durante il caricamento delle liste.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    caricaDati();
    return () => { isMounted = false; };
  }, []);

  async function creaLista() {
    if (!listname.trim()) {
      setNameError(true);
      setTimeout(() => setNameError(false), 600);
      return;
    }
    setCreating(true);
    try {
      const nuovaLista = await apiPost<ShoppingList>('/lists/', { name: listname });
      setListe([nuovaLista, ...liste]);
      setListname('');
      setIsFormOpen(false);
      toast.success('Lista creata con successo!');
    } catch (e) {
      toast.error('Errore durante la creazione della lista.');
    } finally {
      setCreating(false);
    }
  }


  async function eliminaLista(id: string) {
    if (!window.confirm('Sei sicuro di voler eliminare definitivamente questa lista?')) return;
    try {
      await apiDelete(`/lists/${id}`);
      setListe(liste.filter((l) => l.id !== id));
      toast.success('Lista eliminata.');
    } catch (e) {
      toast.error('Impossibile eliminare la lista.');
    }
  }

  if (loading) {
    return <div className="text-muted-foreground text-sm">Caricamento...</div>;
  }

  const listeFiltrate = liste.filter(l => {
    if (filter === 'active') return l.status === 'draft' || l.status === 'pending';
    if (filter === 'archived') return l.status === 'ordered' || l.status === 'completed' || l.status === 'cancelled';
    return l.status === filter;
  });

  return (
    <div className="space-y-6">

    <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight">Liste della spesa</h2>
        <p className="text-muted-foreground text-sm">Crea e gestisci le liste di acquisto.</p>
    </div>

      {/* Form nuova lista */}
      <div className="bg-card border border-border/40 rounded-xl p-5 space-y-4">
        <div 
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setIsFormOpen(!isFormOpen)}
        >
          <h3 className="text-base font-bold flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" />
            Nuova lista
          </h3>
          <button className="text-muted-foreground">
            {isFormOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
        
        {isFormOpen && (
          <div className="flex gap-2 pt-2 border-t border-border/20">
          <input
              value={listname}
              onChange={(e) => { setListname(e.target.value); setNameError(false); }}
              onKeyDown={(e) => e.key === 'Enter' && creaLista()}
              placeholder="Nome nuova lista..."
              autoFocus
              className={`flex-1 bg-background border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 placeholder:text-muted-foreground transition-all ${
                nameError
                  ? 'border-red-500 focus:ring-red-500/50 animate-shake'
                  : 'border-border/60 focus:ring-primary/50'
              }`}
            />
            <button
              onClick={creaLista}
              disabled={creating}
              className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span className="hidden sm:inline">Crea</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottoni di filtro */}
      <div className="flex border-b border-border/40 gap-1 pb-px overflow-x-auto hide-scrollbar">
        {(['active', 'draft', 'pending', 'archived'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              filter === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'active' ? 'Attive' : tab === 'draft' ? 'Bozze' : tab === 'pending' ? 'In corso' : 'Archivio'}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {listeFiltrate.length === 0 && (
          <div className="border border-dashed border-border/60 bg-card/30 rounded-xl py-12 flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ListX className="w-6 h-6 text-primary/60" />
            </div>
            <p className="text-muted-foreground text-sm">Nessuna lista trovata per questo stato.</p>
            {filter !== 'archived' && (
              <button 
                onClick={() => setIsFormOpen(true)}
                className="text-primary text-xs font-bold uppercase tracking-wider hover:underline"
              >
                Inizia una nuova spesa
              </button>
            )}
          </div>
        )}
        {listeFiltrate.map((list) => (
          <div
            key={list.id}
            className="bg-card border border-border/40 rounded-xl p-4 space-y-2"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass[list.status]}`}>
                  {statusLabel[list.status]}
                </span>
                <span className="font-medium truncate">{list.name}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">

                {list.status === 'draft' ? (
                  <button
                    onClick={() => navigate(`/walk/${list.id}`)}
                    className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Inizia</span>
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/walk/${list.id}`)}
                    className="border border-border/60 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 text-muted-foreground"
                  >
                    <span>Apri</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Riga info: data + conteggio + elimina */}
            <div className="flex items-center justify-between pl-1">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {list.created_at && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {new Date(list.created_at).toLocaleDateString('it-IT')}
                  </span>
                )}
                {list.item_count > 0 && (
                  <span>{list.item_count} articol{list.item_count === 1 ? 'o' : 'i'}</span>
                )}
              </div>
              {(list.status === 'draft' || list.status === 'cancelled') && (
                <button
                  onClick={() => eliminaLista(list.id)}
                  className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                  title="Elimina lista"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}