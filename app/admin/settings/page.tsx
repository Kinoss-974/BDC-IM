'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Header from '../../../components/Header';
import { 
  Save, Loader2, Settings, Percent, Truck, Wrench, Sofa, 
  Ruler, Plus, Trash2, ChefHat, Tv, Info, Database,
  Search, Filter, Edit2, Check, X, ChevronUp, ChevronDown, ArrowUpDown
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('marge');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // --- ÉTATS POUR LES TARIFS ET FORFAITS (Pricing Grids & Settings) ---
  const [margin, setMargin] = useState(1.25);
  const [grids, setGrids] = useState<any[]>([]);

  // --- ÉTATS POUR LA MATRICE GLOBALE (Pack Templates) ---
  const [templates, setTemplates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLimit, setDisplayLimit] = useState<number>(50);
  const [filters, setFilters] = useState({
    category: '', property_type: '', product_type: '', package_type: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTemplateForm, setEditTemplateForm] = useState<any>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Chargement Settings et Grids
    const { data: settings } = await supabase.from('global_settings').select('*');
    const { data: gridData } = await supabase.from('pricing_grids').select('*').order('property_type', { ascending: true });
    
    if (settings) {
      const m = settings.find(s => s.key === 'default_margin');
      if (m) setMargin(m.value);
    }
    if (gridData) setGrids(gridData);

    // Chargement Matrice Globale
    const { data: templateData } = await supabase.from('pack_templates').select('*').limit(10000);
    if (templateData) setTemplates(templateData);

    setLoading(false);
  };

  // ==========================================
  // LOGIQUE : TARIFS & FORFAITS (Pricing Grids)
  // ==========================================
  
  const handleUpdateGrid = (id: string, field: string, value: any) => {
    setGrids(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const addGridLine = (category: string) => {
    const newLine = { id: crypto.randomUUID(), category, sub_category: 'Standard', property_type: 'T1', price: 0 };
    setGrids([...grids, newLine]);
  };

  const deleteGridLine = (id: string) => setGrids(grids.filter(g => g.id !== id));

  // ==========================================
  // LOGIQUE : MATRICE GLOBALE (Templates)
  // ==========================================

  const addNewTemplate = () => {
    setSearchTerm(''); 
    const newId = 'temp-' + Date.now();
    const newRow = {
      id: newId,
      category: filters.category || '', 
      name: '', 
      property_type: filters.property_type || 'T2',
      product_type: filters.product_type || "IMMO'MALIN", 
      package_type: filters.package_type || 'LLD',
      quantity: 1,
      price: 0,
      isNew: true 
    };
    setTemplates([newRow, ...templates]);
    setEditingTemplateId(newId);
    setEditTemplateForm(newRow);
  };

  const startEditTemplate = (template: any) => {
    setEditingTemplateId(template.id);
    setEditTemplateForm({ ...template });
  };

  const cancelEditTemplate = () => {
    if (editTemplateForm.isNew) setTemplates(templates.filter(t => t.id !== editingTemplateId));
    setEditingTemplateId(null);
    setEditTemplateForm(null);
  };

  const saveEditTemplate = async () => {
    const { isNew, id, ...dataToSave } = editTemplateForm;

    if (isNew) {
       const { data, error } = await supabase.from('pack_templates').insert([dataToSave]).select().single();
       if (!error && data) {
         setTemplates(templates.map(t => t.id === editingTemplateId ? data : t));
         setEditingTemplateId(null);
       } else alert("Erreur lors de la création du template.");
    } else {
       const { error } = await supabase.from('pack_templates').update(dataToSave).eq('id', editingTemplateId);
       if (!error) {
         setTemplates(templates.map(t => t.id === editingTemplateId ? editTemplateForm : t));
         setEditingTemplateId(null);
       } else alert("Erreur lors de la sauvegarde du template.");
    }
  };

  const deleteTemplate = async (id: string) => {
    if (confirm("Supprimer définitivement cet élément du catalogue ?")) {
      await supabase.from('pack_templates').delete().eq('id', id);
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  const handleTemplateSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />;
  };

  // Traitement des données du template (Filtre + Tri)
  const filteredTemplates = templates.filter(t => {
    const matchSearch = t.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = filters.category === '' || t.category === filters.category;
    const matchBien = filters.property_type === '' || t.property_type === filters.property_type;
    const matchGamme = filters.product_type === '' || t.product_type === filters.product_type;
    const matchFormule = filters.package_type === '' || t.package_type === filters.package_type;
    return matchSearch && matchCat && matchBien && matchGamme && matchFormule;
  });

  const sortedAndFilteredTemplates = [...filteredTemplates].sort((a, b) => {
    if (sortConfig.key === 'price' || sortConfig.key === 'quantity') {
       const valA = parseFloat(a[sortConfig.key]) || 0;
       const valB = parseFloat(b[sortConfig.key]) || 0;
       return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    }
    const strA = String(a[sortConfig.key] || '').toLowerCase();
    const strB = String(b[sortConfig.key] || '').toLowerCase();
    if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const getTemplateOptions = (key: string) => Array.from(new Set(templates.map(t => t[key]).filter(Boolean))).sort();


  // ==========================================
  // SAUVEGARDE GLOBALE (Bouton principal)
  // ==========================================

  const saveAllSettings = async () => {
    setSaving(true);
    // Sauvegarde la marge
    await supabase.from('global_settings').upsert({ key: 'default_margin', value: margin });
    // Sauvegarde les grilles
    const cleanGrids = grids.map(({ created_at, updated_at, id, ...rest }) => rest);
    await supabase.from('pricing_grids').delete().neq('category', 'PROTECT');
    const { error } = await supabase.from('pricing_grids').insert(cleanGrids);
    
    // Note: Les modifications de la "Matrice" sont sauvegardées en ligne par ligne (saveEditTemplate), 
    // pas via ce bouton global pour éviter les conflits de données massives.
    
    if (!error) {
      alert("✅ Configuration mise à jour !");
      fetchData();
    }
    setSaving(false);
  };


  // ==========================================
  // RENDUS UI
  // ==========================================

  const renderGridTable = (categoryName: string, showSub: boolean = true) => {
    const filtered = grids.filter(g => g.category === categoryName);
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">{categoryName}</h3>
            {categoryName === 'MO_SUR_MESURE' && (
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">N1 = 0 élém. | N2 = 1 élém. | N3 = 2 élém.</p>
            )}
          </div>
          <button onClick={() => addGridLine(categoryName)} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-blue-600 transition-all">
            <Plus size={14} /> Ajouter un tarif
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {filtered.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm group">
              {showSub && (
                <div className="relative">
                   <input 
                    value={item.sub_category || ''} 
                    onChange={e => handleUpdateGrid(item.id, 'sub_category', e.target.value)}
                    className={`border-2 p-2 rounded-xl text-[10px] font-black w-32 outline-none transition-colors ${
                      item.sub_category?.includes('Niveau 1') ? 'border-slate-100 text-slate-400' : 
                      item.sub_category?.includes('Niveau 2') ? 'border-blue-100 text-blue-600' : 
                      item.sub_category?.includes('Niveau 3') ? 'border-orange-100 text-orange-600' : 'border-slate-100'
                    }`}
                  />
                </div>
              )}
              <input 
                value={item.property_type || ''} 
                onChange={e => handleUpdateGrid(item.id, 'property_type', e.target.value)}
                className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-[10px] font-black w-20 text-center outline-none"
              />
              <div className="flex-1 flex items-center gap-2">
                <input 
                  type="number" 
                  value={item.price} 
                  onChange={e => handleUpdateGrid(item.id, 'price', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-100 p-2 rounded-xl text-right font-black text-slate-800 outline-none"
                />
                <span className="font-bold text-slate-300 text-xs">€</span>
              </div>
              <button onClick={() => deleteGridLine(item.id)} className="text-slate-200 hover:text-red-500 p-2"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTemplateMatrix = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* BARRE D'OUTILS MATRICE */}
        <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex gap-4 w-full md:w-auto">
              {['category', 'property_type', 'product_type', 'package_type'].map((key) => (
                <div key={key} className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center gap-2 flex-1 md:flex-none">
                  <Filter size={14} className="ml-2 text-slate-400" />
                  <select 
                    className="bg-transparent p-1 text-[10px] font-black uppercase outline-none w-full min-w-[100px]"
                    value={filters[key as keyof typeof filters]}
                    onChange={e => setFilters({...filters, [key]: e.target.value})}
                  >
                    <option value="">
                      {key === 'property_type' ? 'Bien' : key === 'product_type' ? 'Produit' : key === 'package_type' ? 'Ameublement' : 'Catégorie'}
                    </option>
                    {getTemplateOptions(key).map(opt => <option key={opt} value={opt as string}>{opt as string}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        placeholder="Rechercher..."
                        className="pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:bg-white w-full md:w-64"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={addNewTemplate}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-md flex items-center gap-2 shrink-0"
                >
                    <Plus size={14} /> Ajouter 
                </button>
            </div>
        </div>

        {/* TABLE MATRICE */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-[9px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-200 select-none">
                        <th className="p-4 cursor-pointer hover:bg-slate-100 group" onClick={() => handleTemplateSort('category')}>
                            <div className="flex items-center justify-between">Catégorie <SortIcon columnKey="category" /></div>
                        </th>
                        <th className="p-4 cursor-pointer hover:bg-slate-100 group" onClick={() => handleTemplateSort('name')}>
                            <div className="flex items-center justify-between">Désignation <SortIcon columnKey="name" /></div>
                        </th>
                        <th className="p-4 w-20 cursor-pointer hover:bg-slate-100 group" onClick={() => handleTemplateSort('property_type')}>
                            <div className="flex items-center justify-between">Bien <SortIcon columnKey="property_type" /></div>
                        </th>
                        <th className="p-4 w-28 cursor-pointer hover:bg-slate-100 group" onClick={() => handleTemplateSort('product_type')}>
                            <div className="flex items-center justify-between">Produit <SortIcon columnKey="product_type" /></div>
                        </th>
                        <th className="p-4 w-32 cursor-pointer hover:bg-slate-100 group" onClick={() => handleTemplateSort('package_type')}>
                            <div className="flex items-center justify-between">Ameublement <SortIcon columnKey="package_type" /></div>
                        </th>
                        <th className="p-4 w-20 text-center cursor-pointer hover:bg-slate-100 group" onClick={() => handleTemplateSort('quantity')}>
                            <div className="flex items-center justify-center gap-2">Qté <SortIcon columnKey="quantity" /></div>
                        </th>
                        <th className="p-4 w-28 text-right cursor-pointer hover:bg-slate-100 group" onClick={() => handleTemplateSort('price')}>
                            <div className="flex items-center justify-end gap-2">Prix <SortIcon columnKey="price" /></div>
                        </th>
                        <th className="p-4 w-24 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                        {sortedAndFilteredTemplates.slice(0, displayLimit).map((t) => (
                            <tr key={t.id} className={editingTemplateId === t.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}>
                                <td className="p-3">
                                    {editingTemplateId === t.id ? (
                                        <input className="w-full p-2 border rounded text-[10px] font-bold" value={editTemplateForm.category} onChange={e => setEditTemplateForm({...editTemplateForm, category: e.target.value})} placeholder="Ex: Fourniture sol" />
                                    ) : <span className="font-bold text-slate-600">{t.category}</span>}
                                </td>
                                <td className="p-3 font-bold text-slate-900">
                                    {editingTemplateId === t.id ? (
                                        <input className="w-full p-2 border rounded text-xs" value={editTemplateForm.name} onChange={e => setEditTemplateForm({...editTemplateForm, name: e.target.value})} />
                                    ) : t.name}
                                </td>
                                <td className="p-3">
                                    {editingTemplateId === t.id ? (
                                        <input className="w-full p-2 border rounded text-center" value={editTemplateForm.property_type} onChange={e => setEditTemplateForm({...editTemplateForm, property_type: e.target.value})} />
                                    ) : <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold">{t.property_type}</span>}
                                </td>
                                <td className="p-3 font-black text-blue-600 text-[9px] uppercase">
                                    {editingTemplateId === t.id ? (
                                        <input className="w-full p-2 border rounded" value={editTemplateForm.product_type} onChange={e => setEditTemplateForm({...editTemplateForm, product_type: e.target.value})} />
                                    ) : t.product_type}
                                </td>
                                <td className="p-3 font-black text-purple-600 text-[9px] uppercase">
                                    {editingTemplateId === t.id ? (
                                        <input className="w-full p-2 border rounded" value={editTemplateForm.package_type} onChange={e => setEditTemplateForm({...editTemplateForm, package_type: e.target.value})} />
                                    ) : t.package_type}
                                </td>
                                <td className="p-3 text-center">
                                    {editingTemplateId === t.id ? (
                                        <input type="number" className="w-16 p-2 border rounded text-center" value={editTemplateForm.quantity} onChange={e => setEditTemplateForm({...editTemplateForm, quantity: e.target.value})} />
                                    ) : <span className="font-black text-slate-500">{t.quantity}</span>}
                                </td>
                                <td className="p-3 text-right font-black">
                                    {editingTemplateId === t.id ? (
                                        <input type="number" className="w-20 p-2 border rounded text-right" value={editTemplateForm.price} onChange={e => setEditTemplateForm({...editTemplateForm, price: e.target.value})} />
                                    ) : `${t.price || 0} €`}
                                </td>
                                <td className="p-3">
                                    <div className="flex justify-center gap-2">
                                        {editingTemplateId === t.id ? (
                                            <>
                                                <button onClick={saveEditTemplate} className="p-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"><Check size={14}/></button>
                                                <button onClick={cancelEditTemplate} className="p-2 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><X size={14}/></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => startEditTemplate(t)} className="p-2 text-slate-400 hover:text-blue-600 bg-white rounded shadow-sm border"><Edit2 size={14}/></button>
                                                <button onClick={() => deleteTemplate(t.id)} className="p-2 text-slate-400 hover:text-red-500 bg-white rounded shadow-sm border"><Trash2 size={14}/></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
                <span>Affichage de {Math.min(displayLimit, sortedAndFilteredTemplates.length)} / {sortedAndFilteredTemplates.length}</span>
                <select value={displayLimit} onChange={(e) => setDisplayLimit(Number(e.target.value))} className="bg-white border rounded px-2 py-1 outline-none font-bold">
                    <option value={50}>50 lignes</option>
                    <option value={200}>200 lignes</option>
                    <option value={10000}>Toutes les lignes</option>
                </select>
            </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header />
      <div className="max-w-[1600px] mx-auto p-8 space-y-6">
        
        {/* HEADER SETTINGS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-xl shadow-slate-200"><Settings size={28} /></div>
            <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Paramètres & Base de Données</h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gérez les prix, forfaits et la matrice des matériaux</p>
            </div>
          </div>
          
          {/* Le bouton "Sauvegarder" global est désactivé si on est sur la Matrice (car elle a ses propres boutons save) */}
          {activeTab !== 'MATRICE' && (
            <button onClick={saveAllSettings} disabled={saving} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20">
                {saving ? <Loader2 className="animate-spin" /> : <Save />} SAUVEGARDER
            </button>
          )}
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex gap-2 bg-white p-2 rounded-[2rem] border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
          {[
            { id: 'MATRICE', icon: Database, label: 'Matrice Globale' },
            { id: 'marge', icon: Percent, label: 'Marge' },
            { id: 'AMEUBLEMENT', icon: Sofa, label: 'Ameublement' },
            { id: 'CUISINE', icon: ChefHat, label: 'Cuisine' },
            { id: 'ELECTRO', icon: Tv, label: 'Électro' },
            { id: 'LIVRAISON', icon: Truck, label: 'Livraison' },
            { id: 'MO_PACKAGE', icon: Wrench, label: 'Montage' },
            { id: 'MO_SUR_MESURE', icon: Ruler, label: 'Sur Mesure' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT AREA */}
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm p-6 md:p-10 min-h-[600px]">
          
          {activeTab === 'MATRICE' && renderTemplateMatrix()}

          {activeTab === 'marge' && (
            <div className="max-w-xs space-y-4 animate-in fade-in duration-300">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Coeff. de marge global</label>
              <input type="number" step="0.01" value={margin} onChange={e => setMargin(parseFloat(e.target.value))} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-5xl font-black text-blue-600 outline-none focus:border-blue-200 transition-colors" />
              <div className="flex gap-2 items-center text-slate-400 bg-slate-50 p-4 rounded-2xl">
                <Info size={24} className="shrink-0" />
                <p className="text-[10px] font-bold leading-relaxed">Exemple: 1.25 applique +25% sur le total des prix d'achat pour calculer le prix de vente final.</p>
              </div>
            </div>
          )}

          {activeTab === 'AMEUBLEMENT' && renderGridTable('AMEUBLEMENT')}
          {activeTab === 'CUISINE' && renderGridTable('CUISINE')}
          {activeTab === 'ELECTRO' && renderGridTable('ELECTRO')}
          {activeTab === 'LIVRAISON' && renderGridTable('LIVRAISON', false)}
          {activeTab === 'MO_PACKAGE' && renderGridTable('MO_PACKAGE')}
          {activeTab === 'MO_SUR_MESURE' && renderGridTable('MO_SUR_MESURE')}

        </div>
      </div>
    </div>
  );
}