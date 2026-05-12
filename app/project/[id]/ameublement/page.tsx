'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { 
  Plus, Trash2, Save, Loader2, Package, 
  RefreshCw, BookOpen, X, Sofa, ChefHat, 
  Droplets, Home, Wrench, Paintbrush, Lightbulb, Calculator, ShoppingBag, Info, Coins
} from 'lucide-react';

export default function AmeublementPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]); // Chiffrage
  const [purchases, setPurchases] = useState<any[]>([]); // Achats réels
  const [fullCatalogue, setFullCatalogue] = useState<any[]>([]);
  const [forfaitPrice, setForfaitPrice] = useState(0); 
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPurchases, setIsSavingPurchases] = useState(false);

  // NOUVEAU : État pour le budget complémentaire
  const [extraBudget, setExtraBudget] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategoryForModal, setActiveCategoryForModal] = useState<string>('');

  const categoriesConfig = [
    { name: 'Ameublement Toutes Pièces', keywords: ['toutes pièces', 'toute pièce', 'toutes pieces', 'salon', 'séjour', 'canapé', 'tv', 'table', 'fauteuil', 'général'], icon: <Sofa size={18} /> },
    { name: 'Ameublement Cuisine', keywords: ['cuisine', 'cuisines', 'vaisselle', 'repas'], icon: <ChefHat size={18} /> },
    { name: 'Ameublement SDB', keywords: ['sdb', 'bain', 'douche', 'toilette', 'salle de bain', 'sanitaire'], icon: <Droplets size={18} /> },
    { name: 'Ameublement Espace nuit', keywords: ['nuit', 'chambre', 'lit', 'matelas', 'oreiller', 'chevet', 'couette'], icon: <Home size={18} /> },
    { name: 'Ameublement Entretien', keywords: ['entretient', 'entretien', 'ménage', 'nettoyage', 'balai', 'aspirateur'], icon: <Wrench size={18} /> },
    { name: 'Ameublement Petite décoration', keywords: ['décoration', 'déco', 'decoration', 'cadre', 'plante', 'miroir', 'tapis', 'coussin'], icon: <Paintbrush size={18} /> },
    { name: 'Ameublement Extérieur', keywords: ['extérieur', 'exterieur', 'jardin', 'balcon', 'terrasse', 'ext'], icon: <Lightbulb size={18} /> },
    { name: 'Ameublement Divers', keywords: ['divers', 'autre', 'autres', 'quincaillerie'], icon: <Package size={18} /> }
  ];

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const fetchData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const { data: catalogueData } = await supabase.from('pack_templates').select('*').ilike('category', 'Ameublement%');
      const { data: gridData } = await supabase.from('pricing_grids').select('*').eq('category', 'AMEUBLEMENT');
      
      if (catalogueData) {
        const uniqueCatalogue: any[] = [];
        const seenNames = new Set();
        catalogueData.forEach(item => {
          const nameKey = item.name?.trim().toLowerCase();
          if (nameKey && !seenNames.has(nameKey)) {
            seenNames.add(nameKey);
            uniqueCatalogue.push(item);
          }
        });
        setFullCatalogue(uniqueCatalogue);
      }

      const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
      setProject(proj);

      if (proj) {
        // Chargement de l'extra budget s'il existe
        setExtraBudget(parseFloat(proj.extra_budget_ameublement) || 0);

        if (gridData) {
          const forfait = gridData.find(p => p.property_type === proj.property_type && p.sub_category === proj.package_type);
          setForfaitPrice(parseFloat(forfait?.price) || 0);
        }

        // Chargement Chiffrage
        const { data: savedItems } = await supabase.from('estimate_items').select('*').eq('project_id', projectId).ilike('category', 'Ameublement%');

        if (savedItems && savedItems.length > 0 && !forceRefresh) {
          setItems(savedItems);
        } else {
          const { data: matrix } = await supabase.from('pack_templates').select('*').eq('product_type', proj.product_type).eq('package_type', proj.package_type).eq('property_type', proj.property_type).ilike('category', 'Ameublement%');
          if (matrix) setItems(matrix.map(m => ({ id: crypto.randomUUID(), project_id: projectId, category: m.category, name: m.name, unit_price: parseFloat(m.price) || 0, quantity_to_cover: parseFloat(m.quantity) || 1 })));
        }

        // Chargement Achats
        const { data: savedPurchases } = await supabase.from('purchase_items').select('*').eq('project_id', projectId).ilike('category', 'Ameublement%');
        setPurchases(savedPurchases || []);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const updateExtraBudget = async (newVal: number) => {
    setExtraBudget(newVal);
    await supabase.from('projects').update({ extra_budget_ameublement: newVal }).eq('id', projectId);
  };

  // --- GESTION CHIFFRAGE ---
  const updateItem = (id: string, field: string, value: any) => setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));
  const addManualItem = (categoryName: string) => setItems([...items, { id: crypto.randomUUID(), project_id: projectId, category: categoryName, name: '', unit_price: 0, quantity_to_cover: 1 }]);

  const addItemFromCatalogue = (itemFromCatalogue: any) => {
    setItems([...items, { id: crypto.randomUUID(), project_id: projectId, category: activeCategoryForModal, name: itemFromCatalogue.name, unit_price: parseFloat(itemFromCatalogue.price) || 0, quantity_to_cover: parseFloat(itemFromCatalogue.quantity) || 1 }]);
    setIsModalOpen(false);
  };

  const handleSaveChiffrage = async () => {
    setIsSaving(true);
    await supabase.from('estimate_items').delete().eq('project_id', projectId).ilike('category', 'Ameublement%');
    if (items.length > 0) await supabase.from('estimate_items').insert(items.map(({ id, ...rest }) => rest));
    setIsSaving(false);
    alert("Chiffrage Ameublement enregistré !");
  };

  // --- GESTION ACHATS ---
  const addPurchase = (categoryName: string) => {
    setPurchases([...purchases, { id: crypto.randomUUID(), project_id: projectId, category: categoryName, name: '', reference: '', quantity: 1, unit_price_ht: 0, discount_percent: 0, total_ht: 0 }]);
  };

  const updatePurchase = (id: string, field: string, value: any) => {
    setPurchases(purchases.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };
      if (['unit_price_ht', 'quantity', 'discount_percent'].includes(field)) {
        const basePrice = (parseFloat(updated.unit_price_ht) || 0) * (parseFloat(updated.quantity) || 1);
        const discount = (parseFloat(updated.discount_percent) || 0) / 100;
        updated.total_ht = basePrice * (1 - discount);
      }
      return updated;
    }));
  };

  const removePurchase = (id: string) => setPurchases(purchases.filter(p => p.id !== id));

  const handleSavePurchases = async () => {
    setIsSavingPurchases(true);
    await supabase.from('purchase_items').delete().eq('project_id', projectId).ilike('category', 'Ameublement%');
    if (purchases.length > 0) {
      const cleanPurchases = purchases.map(({ id, created_at, ...rest }) => rest);
      await supabase.from('purchase_items').insert(cleanPurchases);
    }
    setIsSavingPurchases(false);
    alert("Achats enregistrés !");
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  const isLocked = project?.status === 'devis_valide' || project?.status === 'devis_traite' || project?.status === 'termine';
  const showPurchases = isLocked;
  const margin = parseFloat(project?.margin) || 1.25;

  // BUDGET : On ajoute l'extra budget (qui est déjà en achat) au budget généré par le forfait
  const budgetAchatMax = (forfaitPrice / margin) + extraBudget;
  
  const totalAchatEstime = items.reduce((acc, item) => acc + ((parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity_to_cover) || 0)), 0);
  const totalAchatReel = purchases.reduce((acc, p) => acc + (parseFloat(p.total_ht) || 0), 0);

  const getCatalogueForCategory = (catName: string) => {
    const config = categoriesConfig.find(c => c.name === catName);
    if (!config) return [];
    return fullCatalogue.filter(c => {
      const catLower = (c.category || '').toLowerCase();
      return config.keywords.some(keyword => catLower.includes(keyword.toLowerCase()));
    });
  };

  return (
    <div className={`mx-auto p-6 space-y-8 pb-40 text-slate-900 ${showPurchases ? 'max-w-full' : 'max-w-6xl'}`}>
      
      {/* HEADER */}
      <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-blue-600 p-5 rounded-[2rem] shadow-lg shadow-blue-500/20"><Sofa size={32} /></div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter italic">Ameublement</h1>
              <p className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">{project?.name} | Statut: {project?.status?.replace(/_/g, ' ') || 'Brouillon'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Produit', val: project?.product_type, color: 'bg-blue-500/20 border-blue-500/50' },
              { label: 'Bien', val: project?.property_type, color: 'bg-purple-500/20 border-purple-500/50' },
              { label: 'Ameublement', val: project?.package_type, color: 'bg-orange-500/20 border-orange-500/50' }
            ].map((tag, i) => (
              <div key={i} className={`flex flex-col px-5 py-3 rounded-2xl border ${tag.color} backdrop-blur-sm min-w-[110px]`}>
                <span className="text-[8px] font-black uppercase opacity-60 text-white/70 mb-1">{tag.label}</span>
                <span className="text-xs font-black uppercase text-white tracking-wide">{tag.val || 'N/C'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${showPurchases ? 'xl:grid-cols-2' : 'xl:grid-cols-12'} gap-8`}>
        
        {/* ================= COLONNE GAUCHE : CHIFFRAGE ================= */}
        <div className={`${showPurchases ? '' : 'xl:col-span-8'} space-y-6`}>
          
          <div className="flex flex-col md:flex-row items-center justify-between mb-2 bg-blue-50 p-6 rounded-3xl border border-blue-100 shadow-sm gap-4">
             <div className="flex items-center gap-4">
               <div className="bg-white p-3 rounded-2xl shadow-sm"><Calculator className="text-blue-500" size={24} /></div>
               <div>
                 <h2 className="font-black uppercase text-sm tracking-widest text-blue-800">Budget Achat {isLocked && '(FIGÉ)'}</h2>
                 <p className="text-[9px] font-bold text-blue-500 uppercase mt-0.5">Calculé selon le forfait client (- Marge) + Budget Complémentaire</p>
               </div>
             </div>
             <div className="text-right bg-white px-6 py-3 rounded-2xl shadow-sm">
               <span className="font-black text-blue-600 text-2xl">{Math.round(budgetAchatMax).toLocaleString()} €</span>
             </div>
          </div>

          {!isLocked && (
            <div className="flex justify-between items-center px-4 mb-2">
               <span className="text-[10px] font-black text-slate-400 uppercase">Total de vos meubles chiffrés :</span>
               <span className={`font-black text-lg ${totalAchatEstime > budgetAchatMax ? 'text-red-500' : 'text-slate-700'}`}>{Math.round(totalAchatEstime).toLocaleString()} €</span>
            </div>
          )}

          {!isLocked && totalAchatEstime > budgetAchatMax && budgetAchatMax > 0 && (
            <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex gap-4 items-center mb-6 animate-in fade-in zoom-in duration-300">
              <Info className="text-red-500 shrink-0" size={24} />
              <p className="text-xs font-bold text-red-700 leading-relaxed">
                Action requise : Le total des meubles que vous avez ajoutés ({Math.round(totalAchatEstime)} €) dépasse le budget d'achat autorisé ({Math.round(budgetAchatMax)} €). Ajustez vos quantités ou ajoutez un budget complémentaire.
              </p>
            </div>
          )}

          {categoriesConfig.map((cat) => {
            const catItems = items.filter(i => {
                if (!i.category) return false;
                const catLower = i.category.toLowerCase();
                return cat.keywords.some(keyword => catLower.includes(keyword.toLowerCase()));
            });

            return (
              <div key={cat.name} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-6">
                <div className="bg-slate-50/50 p-6 border-b flex justify-between items-center flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-blue-600 bg-blue-50 p-3 rounded-2xl">{cat.icon}</div>
                    <h2 className="font-black text-slate-800 uppercase tracking-widest text-xs">{cat.name}</h2>
                  </div>
                  {!isLocked && (
                    <div className="flex gap-2">
                      <button onClick={() => { setActiveCategoryForModal(cat.name); setIsModalOpen(true); }} className="text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-2">
                        <BookOpen size={12} /> CATALOGUE
                      </button>
                      <button onClick={() => addManualItem(cat.name)} className="text-[10px] font-black bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                        + MANUEL
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  {catItems.length === 0 ? (
                    <div className="py-6 text-center italic text-[10px] font-bold uppercase text-slate-300">Section vide</div>
                  ) : (
                    catItems.map((item) => (
                      <div key={item.id} className={`group flex flex-wrap md:flex-nowrap items-center gap-4 p-4 rounded-2xl border transition-all ${isLocked ? 'bg-slate-50/50 border-transparent' : 'bg-slate-50/30 hover:bg-white border-transparent hover:border-slate-100'}`}>
                        {isLocked ? (
                          <span className="flex-1 min-w-[200px] font-bold text-slate-600 text-sm">{item.name}</span>
                        ) : (
                          <input value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} className="flex-1 min-w-[200px] font-bold outline-none text-slate-700 text-sm bg-transparent" placeholder="Désignation..." />
                        )}
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase mb-1 text-center">Qté</span>
                            {isLocked ? (
                              <span className="w-16 text-center font-black text-xs text-blue-600">{item.quantity_to_cover}</span>
                            ) : (
                              <input type="number" value={item.quantity_to_cover} onChange={e => updateItem(item.id, 'quantity_to_cover', e.target.value)} className="w-16 bg-white border border-slate-100 p-2 rounded-xl font-black text-center text-xs text-blue-600 outline-none" />
                            )}
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-slate-400 uppercase mb-1">Prix Unit.</span>
                            <div className={`flex items-center gap-2 ${isLocked ? '' : 'bg-white border border-slate-100 p-2 rounded-xl'}`}>
                              {isLocked ? (
                                <span className="w-20 font-black text-right text-xs">{item.unit_price} €</span>
                              ) : (
                                <>
                                  <input type="number" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', e.target.value)} className="w-20 font-black text-right text-xs outline-none bg-transparent" />
                                  <span className="text-slate-400 font-bold text-xs">€</span>
                                </>
                              )}
                            </div>
                          </div>
                          {!isLocked && <button onClick={() => removeItem(item.id)} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
          {!isLocked && (
            <button onClick={handleSaveChiffrage} disabled={isSaving} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black shadow-xl hover:bg-blue-600 transition-all flex justify-center gap-3">
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} SAUVEGARDER LE CHIFFRAGE
            </button>
          )}
        </div>

        {/* ================= COLONNE CENTRALE (RÉSUMÉ) ================= */}
        {!showPurchases && (
          <div className="xl:col-span-4">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl sticky top-28 space-y-6 text-center">
              <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Synthèse & Budget</h3>
              
              <div className="space-y-6">
                <div className="flex justify-between items-end border-b border-slate-50 pb-4 text-left">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Budget Alloué HT</span>
                  <span className="font-bold text-slate-700 text-lg">{Math.round(budgetAchatMax).toLocaleString()} €</span>
                </div>

                {/* BLOC BUDGET COMPLÉMENTAIRE */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                  <label className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1.5 mb-2">
                    <Coins size={12} className="text-blue-500" />
                    Budget Complémentaire Achat HT
                  </label>
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm focus-within:border-blue-500 focus-within:ring-2 ring-blue-100 transition-all">
                    <input 
                      type="number" 
                      value={extraBudget} 
                      onChange={(e) => updateExtraBudget(parseFloat(e.target.value) || 0)}
                      disabled={isLocked}
                      className="w-full text-sm font-black outline-none bg-transparent disabled:text-slate-400" 
                      placeholder="Ex: 500"
                    />
                    <span className="text-slate-400 font-bold text-xs ml-2">€</span>
                  </div>
                  <p className="text-[8px] text-slate-400 mt-2 italic leading-tight">
                    S'ajoute au budget achat alloué automatiquement pour couvrir les demandes spécifiques du client.
                  </p>
                </div>

                <div className="flex justify-between items-end border-b border-slate-50 pb-4 text-left">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Total Chiffré HT</span>
                  <span className={`font-bold text-lg ${totalAchatEstime > budgetAchatMax ? 'text-red-500' : 'text-slate-700'}`}>{Math.round(totalAchatEstime).toLocaleString()} €</span>
                </div>
                
                <div className="p-8 bg-blue-600 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
                  <span className="text-[10px] font-black uppercase opacity-60">Forfait Client (Vente HT)</span>
                  <div className="text-5xl font-black italic tracking-tighter mt-1">{Math.round(forfaitPrice + (extraBudget * margin)).toLocaleString()} €</div>
                </div>
              </div>
              <button onClick={() => fetchData(true)} className="w-full text-slate-300 hover:text-orange-600 font-bold text-[9px] uppercase tracking-widest flex justify-center items-center gap-2 transition-colors border-t border-slate-50 pt-4">
                <RefreshCw size={12} /> Auto-Générer le Pack
              </button>
            </div>
          </div>
        )}

        {/* ================= COLONNE DROITE : ACHATS RÉELS ================= */}
        {showPurchases && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6 bg-orange-50 p-4 rounded-2xl border border-orange-100">
               <ShoppingBag className="text-orange-500" />
               <h2 className="font-black uppercase text-sm tracking-widest text-orange-800">Dépenses Réelles</h2>
               <div className="ml-auto text-right">
                 <span className="block text-[8px] font-black uppercase text-orange-600/60">Total Dépensé</span>
                 <span className={`font-black text-lg ${totalAchatReel > budgetAchatMax ? 'text-red-600' : 'text-orange-600'}`}>
                   {Math.round(totalAchatReel).toLocaleString()} €
                 </span>
               </div>
            </div>

            {categoriesConfig.map((cat) => {
              const catPurchases = purchases.filter(p => p.category?.toLowerCase() === cat.name.toLowerCase());
              return (
                <div key={`achats-${cat.name}`} className="bg-white rounded-[2.5rem] border border-orange-100 shadow-sm overflow-hidden mb-6">
                  <div className="bg-orange-50/30 p-6 border-b border-orange-50 flex justify-between items-center">
                    <h3 className="font-black text-orange-900 uppercase text-xs flex items-center gap-2">{cat.name}</h3>
                    <button onClick={() => addPurchase(cat.name)} className="text-[10px] bg-orange-100 text-orange-700 px-4 py-2 rounded-xl font-black uppercase hover:bg-orange-600 hover:text-white transition-all shadow-sm">
                      + Ajouter Facture
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {catPurchases.length === 0 ? (
                       <div className="py-6 text-center italic text-[10px] font-bold uppercase text-slate-300">Aucun achat saisi</div>
                    ) : (
                      catPurchases.map((p) => (
                        <div key={p.id} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 space-y-4">
                          <div className="flex gap-3">
                            <div className="flex-1">
                                <span className="block text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">Désignation (Ticket)</span>
                                <input placeholder="Ex: Canapé 3 places..." value={p.name} onChange={e => updatePurchase(p.id, 'name', e.target.value)} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:border-orange-300" />
                            </div>
                            <div className="w-1/3">
                                <span className="block text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">Réf / Magasin</span>
                                <input placeholder="Ex: Maisons du Monde" value={p.reference} onChange={e => updatePurchase(p.id, 'reference', e.target.value)} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs outline-none focus:border-orange-300" />
                            </div>
                            <div className="pt-5">
                                <button onClick={() => removePurchase(p.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                            </div>
                          </div>
                          
                          <div className="flex gap-3 items-end">
                            <div>
                              <span className="block text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">Qté</span>
                              <input type="number" value={p.quantity} onChange={e => updatePurchase(p.id, 'quantity', e.target.value)} className="w-16 bg-white border border-slate-200 p-3 rounded-xl text-xs text-center outline-none focus:border-orange-300 font-black" />
                            </div>
                            <div>
                              <span className="block text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">Prix U. HT</span>
                              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 focus-within:border-orange-300">
                                  <input type="number" value={p.unit_price_ht} onChange={e => updatePurchase(p.id, 'unit_price_ht', e.target.value)} className="w-16 p-2 text-xs text-right outline-none font-black" />
                                  <span className="text-slate-400 text-[10px] font-bold">€</span>
                              </div>
                            </div>
                            <div>
                              <span className="block text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">Remise</span>
                              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 focus-within:border-orange-300">
                                  <input type="number" value={p.discount_percent} onChange={e => updatePurchase(p.id, 'discount_percent', e.target.value)} className="w-12 p-2 text-xs text-center outline-none font-black text-orange-500" />
                                  <span className="text-orange-400 text-[10px] font-bold">%</span>
                              </div>
                            </div>
                            <div className="flex-1 text-right bg-orange-100/50 border border-orange-200 p-3 rounded-xl flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase text-orange-600/80">Total Payé HT</span>
                              <span className="font-black text-orange-700 text-base">{p.total_ht ? parseFloat(p.total_ht).toFixed(2) : '0.00'} €</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
            <button onClick={handleSavePurchases} disabled={isSavingPurchases} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 rounded-2xl font-black shadow-xl transition-all flex justify-center items-center gap-3">
              {isSavingPurchases ? <Loader2 className="animate-spin" /> : <Save size={20} />} SAUVEGARDER LES ACHATS
            </button>
          </div>
        )}

      </div>

      {/* MODAL CATALOGUE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-50 p-6 flex justify-between items-center border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-2xl"><BookOpen size={20} /></div>
                <div>
                  <h3 className="font-black uppercase text-lg text-slate-800">Catalogue Global</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Rubrique : {activeCategoryForModal}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 shadow-sm transition-colors border border-slate-100">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
              {getCatalogueForCategory(activeCategoryForModal).length === 0 ? (
                <div className="text-center py-20">
                  <Package className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aucun meuble enregistré.</p>
                </div>
              ) : (
                getCatalogueForCategory(activeCategoryForModal).map((catItem: any, index: number) => (
                  <div key={index} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 group hover:border-blue-300 hover:shadow-md transition-all cursor-pointer" onClick={() => addItemFromCatalogue(catItem)}>
                    <div>
                      <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{catItem.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black bg-blue-50 text-blue-500 px-2 py-1 rounded uppercase tracking-widest">{parseFloat(catItem.price) || 0} € / Unité</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{catItem.category}</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); addItemFromCatalogue(catItem); }} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                      <Plus size={14} /> Ajouter
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}