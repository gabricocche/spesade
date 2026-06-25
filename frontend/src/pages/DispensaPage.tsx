import { useState, useEffect } from 'react';
import type { Item, Category } from '../lib/api';
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from '../lib/api';
import {
  Plus, Trash2, FolderPlus, Loader2, Edit2, X,
  ToggleLeft, ToggleRight, PlusCircle, FolderOpen, Check,
  ChevronDown, ChevronUp, Search, PackageOpen
} from 'lucide-react';
import { toast } from '../components/Toast';

export default function DispensaPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');
  const [error, setError] = useState<string | null>(null);

  // Form nuovo prodotto
  const [itemName, setItemName] = useState('');
  const [itemCat, setItemCat] = useState('');
  const [itemTarget, setItemTarget] = useState(5);
  const [itemUnit, setItemUnit] = useState('pz');
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Form nuova categoria
  const [catName, setCatName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Stati per accordion form e ricerca
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [isCatFormOpen, setIsCatFormOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function caricaDati() {
      try {
        const [its, cats] = await Promise.all([
          apiGet<Item[]>('/items/'),
          apiGet<Category[]>('/categories/'),
        ]);
        if (!isMounted) return;
        setItems(its);
        setCategories(cats);
      }
      catch (err) {
        if (isMounted) setError('Errore durante il caricamento dei dati');
      }
      finally {
        if (isMounted) setLoading(false);
      }
    }
    caricaDati();
    return () => { isMounted = false; };
  }, []);

  async function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim() || !itemCat) return;
    setSubmitting(true);
    try {
      if (editingItem) {
        const updated = await apiPut<Item>(`/items/${editingItem.id}`, {
          name: itemName.trim(),
          category_id: itemCat,
          target_quantity: itemTarget,
          unit: itemUnit.trim() || 'pz',
        });
        setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
        toast.success('Prodotto modificato.');
        setEditingItem(null);
      } else {
        const nuovo = await apiPost<Item>('/items/', {
          name: itemName.trim(),
          category_id: itemCat,
          target_quantity: itemTarget,
          unit: itemUnit.trim() || 'pz',
        });
        setItems(prev => [...prev, nuovo]);
        toast.success('Prodotto aggiunto alla dispensa.');
        setIsItemFormOpen(false);
      }
      setItemName('');
      setItemTarget(5);
      setItemUnit('pz');
    } catch (err) {
      toast.error('Errore durante il salvataggio.');
    } finally {
      setSubmitting(false);
    }
  }

  function startEditItem(item: Item) {
    setEditingItem(item);
    setItemName(item.name);
    setItemCat(item.category_id);
    setItemTarget(item.target_quantity);
    setItemUnit(item.unit);
    setIsItemFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditItem() {
    setEditingItem(null);
    setItemName('');
    setItemTarget(5);
    setItemUnit('pz');
    setIsItemFormOpen(false);
  }

  async function handleCatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim()) return;
    setSubmitting(true);
    try {
      if (editingCategory) {
        const updated = await apiPut<Category>(`/categories/${editingCategory.id}`, { name: catName.trim() });
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? updated : c));
        toast.success('Categoria modificata.');
        setEditingCategory(null);
      } else {
        const nuova = await apiPost<Category>('/categories/', { name: catName.trim() });
        setCategories(prev => [...prev, nuova]);
        toast.success('Categoria aggiunta.');
        setIsCatFormOpen(false);
      }
      setCatName('');
    } catch(err) {
      toast.error('Errore durante il salvataggio.');
    } finally {
      setSubmitting(false);
    }
  }

  function startEditCategory(c: Category) {
    setEditingCategory(c);
    setCatName(c.name);
    setIsCatFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditCategory() {
    setEditingCategory(null);
    setCatName('');
    setIsCatFormOpen(false);
  }

  async function handleToggleActive(id: string) {
    try {
      const aggiornato = await apiPatch<Item>(`/items/${id}/toggle-active`);
      setItems(prev => prev.map(i => i.id === id ? aggiornato : i));
      toast.success(aggiornato.active ? 'Prodotto attivato' : 'Prodotto disattivato');
    } catch(e) {
      toast.error('Errore durante il cambio stato.');
    }
  }

  async function handleDeleteItem(id: string) {
    if (!window.confirm('Eliminare questo prodotto?')) return;
    try {
      await apiDelete(`/items/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Prodotto eliminato.');
    } catch(e) {
      toast.error('Impossibile eliminare il prodotto.');
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!window.confirm('Eliminare questa categoria? Potrebbe fallire se ha prodotti associati.')) return;
    try {
      await apiDelete(`/categories/${id}`);
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Categoria eliminata.');
    } catch(e) {
      toast.error('Impossibile eliminare la categoria. Assicurati che sia vuota.');
    }
  }

  const getCategoryName = (catId: string) => categories.find(c => c.id === catId)?.name || 'Sconosciuta';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm">Caricamento inventario...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-center py-10">
        <p className="font-bold text-lg">Ops! Qualcosa è andato storto.</p>
        <p className="text-sm mt-2">{error}</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">

      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight">Gestione Inventario</h2>
        <p className="text-muted-foreground text-sm">Aggiungi, disattiva o elimina prodotti e categorie.</p>
      </div>

      {/* Tab Prodotti / Categorie */}
      <div className="flex border-b border-border/40 gap-1 pb-px">
        {(['items', 'categories'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === tab
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            {tab === 'items' ? 'Prodotti' : 'Categorie'}
          </button>
        ))}
      </div>

      {/* ── TAB PRODOTTI ── */}
      {activeTab === 'items' && (
        <div className="space-y-8">

          {/* Form nuovo/modifica prodotto */}
          <div className="bg-card border border-border/40 rounded-xl p-5 space-y-4">
            <div 
              className={`flex items-center justify-between ${!editingItem ? 'cursor-pointer select-none' : ''}`}
              onClick={() => !editingItem && setIsItemFormOpen(!isItemFormOpen)}
            >
              <h3 className="text-base font-bold flex items-center gap-2">
                {editingItem ? <Edit2 className="w-5 h-5 text-primary" /> : <PlusCircle className="w-5 h-5 text-primary" />}
                {editingItem ? `Modifica: ${editingItem.name}` : 'Aggiungi prodotto'}
              </h3>
              <div className="flex items-center gap-3">
                {editingItem && (
                  <button onClick={(e) => { e.stopPropagation(); cancelEditItem(); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5" /> Annulla
                  </button>
                )}
                {!editingItem && (
                  <button className="text-muted-foreground">
                    {isItemFormOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                )}
              </div>
            </div>
            {(isItemFormOpen || editingItem) && (
            <form onSubmit={handleItemSubmit} className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 items-end pt-2 border-t border-border/20">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Nome</label>
                <input
                  type="text"
                  required
                  placeholder="Caffè, Pane..."
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Categoria</label>
                <select
                  required
                  value={itemCat}
                  onChange={e => setItemCat(e.target.value)}
                  className="w-full bg-background border border-border/60 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Seleziona...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Target</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={itemTarget}
                    onChange={e => setItemTarget(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Unità</label>
                  <input
                    type="text"
                    required
                    placeholder="pz, kg..."
                    value={itemUnit}
                    onChange={e => setItemUnit(e.target.value)}
                    className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary text-primary-foreground font-semibold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingItem ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                {editingItem ? 'Salva' : 'Aggiungi'}
              </button>
            </form>
            )}
          </div>

          {/* Lista prodotti */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Catalogo</h3>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Cerca prodotti..." 
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                className="w-full bg-card border border-border/60 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
              />
            </div>

            {items.length === 0 ? (
              <div className="mt-6 border border-dashed border-border/60 bg-card/30 rounded-xl py-12 flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <PackageOpen className="w-6 h-6 text-primary/60" />
                </div>
                <p className="text-muted-foreground text-sm">Nessun prodotto registrato.</p>
                <button 
                  onClick={() => setIsItemFormOpen(true)}
                  className="text-primary text-xs font-bold uppercase tracking-wider hover:underline"
                >
                  Aggiungine uno
                </button>
              </div>
            ) : (
              <div className="pt-4 space-y-6">
                {categories.map(cat => {
                  const catItems = items.filter(i => i.category_id === cat.id && i.name.toLowerCase().includes(itemSearch.toLowerCase()));
                  if (catItems.length === 0) return null;
                  
                  return (
                    <div key={cat.id} className="space-y-2">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2 px-1">
                        <FolderOpen className="w-4 h-4 text-primary/70" /> {cat.name}
                      </h4>
                      <div className="bg-card border border-border/40 rounded-xl divide-y divide-border/20 overflow-hidden">
                        {catItems.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-4">
                            <div className="min-w-0 flex-1 pr-3">
                              <p className="font-semibold text-sm truncate">{item.name}</p>
                              <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground mt-1">
                                <span>Target: {item.target_quantity} {item.unit}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleToggleActive(item.id)}
                                className={`p-1 rounded-lg transition-colors ${item.active ? 'text-primary' : 'text-muted-foreground/40'}`}
                                title={item.active ? 'Attivo' : 'Disattivato'}
                              >
                                {item.active
                                  ? <ToggleRight className="w-9 h-9" />
                                  : <ToggleLeft className="w-9 h-9" />
                                }
                              </button>
                              <button
                                onClick={() => startEditItem(item)}
                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Modifica"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Elimina"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Prodotti senza categoria valida (failsafe) */}
                {items.filter(i => !categories.find(c => c.id === i.category_id) && i.name.toLowerCase().includes(itemSearch.toLowerCase())).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2 px-1">
                      <FolderOpen className="w-4 h-4 text-primary/70" /> Altri (Senza categoria)
                    </h4>
                    <div className="bg-card border border-border/40 rounded-xl divide-y divide-border/20 overflow-hidden">
                      {items
                        .filter(i => !categories.find(c => c.id === i.category_id) && i.name.toLowerCase().includes(itemSearch.toLowerCase()))
                        .map(item => (
                          <div key={item.id} className="flex items-center justify-between p-4">
                            <div className="min-w-0 flex-1 pr-3">
                              <p className="font-semibold text-sm truncate">{item.name}</p>
                              <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground mt-1">
                                <span>Target: {item.target_quantity} {item.unit}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleToggleActive(item.id)}
                                className={`p-1 rounded-lg transition-colors ${item.active ? 'text-primary' : 'text-muted-foreground/40'}`}
                                title={item.active ? 'Attivo' : 'Disattivato'}
                              >
                                {item.active
                                  ? <ToggleRight className="w-9 h-9" />
                                  : <ToggleLeft className="w-9 h-9" />
                                }
                              </button>
                              <button
                                onClick={() => startEditItem(item)}
                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Modifica"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Elimina"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB CATEGORIE ── */}
      {activeTab === 'categories' && (
        <div className="space-y-8">

          {/* Form nuova/modifica categoria */}
          <div className="bg-card border border-border/40 rounded-xl p-5 space-y-4">
            <div 
              className={`flex items-center justify-between ${!editingCategory ? 'cursor-pointer select-none' : ''}`}
              onClick={() => !editingCategory && setIsCatFormOpen(!isCatFormOpen)}
            >
              <h3 className="text-base font-bold flex items-center gap-2">
                {editingCategory ? <Edit2 className="w-5 h-5 text-primary" /> : <FolderPlus className="w-5 h-5 text-primary" />}
                {editingCategory ? `Modifica Categoria: ${editingCategory.name}` : 'Aggiungi categoria'}
              </h3>
              <div className="flex items-center gap-3">
                {editingCategory && (
                  <button onClick={(e) => { e.stopPropagation(); cancelEditCategory(); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5" /> Annulla
                  </button>
                )}
                {!editingCategory && (
                  <button className="text-muted-foreground">
                    {isCatFormOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                )}
              </div>
            </div>
            {(isCatFormOpen || editingCategory) && (
            <form onSubmit={handleCatSubmit} className="flex gap-2 items-end pt-2 border-t border-border/20">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Nome</label>
                <input
                  type="text"
                  required
                  placeholder="Bevande, Snack..."
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary text-primary-foreground font-semibold py-2.5 px-4 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingCategory ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                {editingCategory ? 'Salva' : 'Aggiungi'}
              </button>
            </form>
            )}
          </div>

          {/* Lista categorie */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Elenco categorie</h3>
            {categories.length === 0 ? (
              <div className="border border-dashed border-border/60 bg-card/30 rounded-xl py-12 flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-primary/60" />
                </div>
                <p className="text-muted-foreground text-sm">Nessuna categoria creata.</p>
                <button 
                  onClick={() => setIsCatFormOpen(true)}
                  className="text-primary text-xs font-bold uppercase tracking-wider hover:underline"
                >
                  Creane una ora
                </button>
              </div>
            ) : (
              <div className="bg-card border border-border/40 rounded-xl divide-y divide-border/20 overflow-hidden">
                {categories.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-5 h-5 text-primary/80 shrink-0" />
                      <p className="font-semibold text-sm">{c.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditCategory(c)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Modifica"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(c.id)}
                        className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}