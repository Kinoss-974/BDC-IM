'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { 
  Tv, Plus, Trash2, Save, Loader2, ListPlus, 
  Calculator, ShoppingBag, X, Info, CheckSquare, Square
} from 'lucide-react';

export default function ElectromenagerPage() {
  const params = useParams();
  const projectId = params?.id as string;
  
  const [project, setProject] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]); 
  const [items, setItems] = useState<any[]>([]);     // Chiffrage (Devis)
  const [purchases, setPurchases] = useState<any[]>([]); // Achats (Réel)
  
  const [forfaitPrice, setForfaitPrice] = useState(0); // Prix de vente (Grille)
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPurchases, setIsSavingPurchases] = useState(false);
  const [isCuisiniste, setIsCuisiniste] = useState(false);

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
    
    if (proj) {
      setProject(proj);
      setIsCuisiniste(proj.is_electro_cuisiniste || false);

      const { data: grid } = await supabase.from('pricing_grids').select('*').eq('category', 'ELECTRO');
      if (grid) {
        const forfait = grid.find(g => g.item_type === 'FORFAIT' && g.property_type === proj?.property_type);
        if (forfait) setForfaitPrice(parseFloat(forfait.price) || 0);
        const articles = grid.filter(g => g.item_type === 'ARTICLE');
        setCatalog(articles);
      }

      const { data: savedItems } = await supabase.from('estimate_items').select('*').eq('project_id', projectId).eq('category', 'ELECTRO');
      setItems(savedItems || []);

      const { data: savedPurchases } = await supabase.from('purchase_items').select('*').eq('project_id', projectId).eq('category', 'ELECTRO');
      setPurchases(savedPurchases || []);
    }
    
    setLoading(false);
  };

  const toggleCuisiniste = async () => {
    const newValue = !isCuisiniste;
    setIsCuisiniste(newValue);
    await supabase.from('projects').update({ is_electro_cuisiniste: newValue }).eq('id', projectId);
  };

  // --- GESTION CHIFFRAGE ---
  const addItemFromCatalog = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const articleId = e.target.value;
    if (!articleId) return;
    const article = catalog.find(a => a.id === articleId);
    if (article) {
      setItems([...items, { 
        id: crypto.randomUUID(), project_id: projectId, category: 'ELECTRO', 
        name: article.sub_category, unit_price: article.price, quantity_to_cover: 1 
      }]);
    }
    e.target.value = ""; 
  };

  const addManualItem = () => setItems([...items, { id: crypto.randomUUID(), project_id: projectId, category: 'ELECTRO', name: '', unit_price: 0, quantity_to_cover: 1 }]);
  const updateItem = (id: string, field: string, value: any) => setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));

  const handleSaveChiffrage = async () => {
    setIsSaving(true);
    await supabase.from('estimate_items').delete().eq('project_id', projectId).eq('category', 'ELECTRO');
    if (items.length > 0) {
      await supabase.from('estimate_items').insert(items.map(({ id, ...rest }) => rest));
    }
    setIsSaving(false);
    alert("Chiffrage électroménager enregistré !");
  };

  // --- GESTION ACHATS REELS ---
  const addPurchase = () => {
    setPurchases([...purchases, { 
      id: crypto.randomUUID(), project_id: projectId, category: 'ELECTRO', 
      name: '', reference: '', quantity: 1, unit_price_ht: 0, discount_percent: 0, total_ht: 0 
    }]);
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
    await supabase.from('purchase_items').delete().eq('project_id', projectId).eq('category', 'ELECTRO');
    if (purchases.length > 0) {
      const cleanPurchases = purchases.map(({ id, created_at, ...rest }) => rest);
      await supabase.from('purchase_items').insert(cleanPurchases);
    }
    setIsSavingPurchases(false);
    alert("Achats enregistrés !");
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-purple-600" size={40} /></div>;

  const isLocked = project?.status === 'devis_valide' || project?.status === 'devis_traite';
  const showPurchases = isLocked;
  const margin = parseFloat(project?.margin) || 1.25;

  // Budget Achat autorisé = Forfait Client / Marge
  const budgetAchatMax = forfaitPrice / margin;

  const totalAchatEstime = items.reduce((acc, item) => acc + ((parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity_to_cover) || 1)), 0);
  const totalAchatReel = purchases.reduce((acc, p) => acc + (parseFloat(p.total_ht) || 0), 0);

  return (
    <div className={`mx-auto space-y-8 pb-40 ${showPurchases ? 'max-w-full p-6' : 'max-w-5xl'}`}>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-purple-600 p-4 rounded-3xl text-white shadow-xl shadow-purple-100">
            <Tv size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Électroménager</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Statut : {project?.status || 'Brouillon'}</p>
          </div>
        </div>
        
        {!isLocked && (
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <ListPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={18} />
              <select onChange={addItemFromCatalog} defaultValue="" className="w-full md:w-64 pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-xs uppercase text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-colors appearance-none">
                <option value="" disabled>+ Catalogue</option>
                {catalog.map(a => <option key={a.id} value={a.id}>{a.sub_category} ({a.price}€)</option>)}
              </select>
            </div>
            <button onClick={addManualItem} className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-purple-600 transition-all shadow-xl"><Plus size={20} /></button>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 ${showPurchases ? 'xl:grid-cols-2' : 'lg:grid-cols-3'} gap-8`}>
        
        {/* ================= COLONNE GAUCHE : CHIFFRAGE ================= */}
        <div className={`${showPurchases ? '' : 'lg:col-span-2'} space-y-6`}>
          
          {/* HEADER BUDGET AVEC CASE CUISINISTE */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-2 bg-purple-50 p-6 rounded-3xl border border-purple-100 shadow-sm gap-6">
             <div className="flex items-center gap-4">
               <div className="bg-white p-3 rounded-2xl shadow-sm"><Calculator className="text-purple-500" size={24} /></div>
               <div>
                 <h2 className="font-black uppercase text-sm tracking-widest text-purple-800">Budget Achat {isLocked && '(FIGÉ)'}</h2>
                 <p className="text-[9px] font-bold text-purple-500 uppercase mt-0.5">Basé sur le forfait client (- Marge)</p>
               </div>
             </div>

             <button 
                onClick={toggleCuisiniste}
                disabled={isLocked}
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${isCuisiniste ? 'bg-purple-600 border-purple-600 text-white shadow-lg' : 'bg-white border-purple-200 text-purple-600 hover:border-purple-400'}`}
             >
                {isCuisiniste ? <CheckSquare size={20} /> : <Square size={20} />}
                <span className="text-[10px] font-black uppercase tracking-widest">Poste réalisé par un cuisiniste</span>
             </button>

             <div className="text-right bg-white px-6 py-3 rounded-2xl shadow-sm min-w-[120px]">
               <span className="font-black text-purple-600 text-2xl">{Math.round(budgetAchatMax).toLocaleString()} €</span>
             </div>
          </div>

          {isCuisiniste && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 items-center animate-in fade-in slide-in-from-top-2">
                <Info size={18} className="text-amber-600" />
                <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Note : Ce lot est exclu du pack et sera déduit du récapitulatif client.</p>
            </div>
          )}

          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="bg-white border border-slate-200 p-12 rounded-[2.5rem] text-center shadow-sm">
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Aucun chiffrage spécifique</p>
                <p className="text-slate-400 text-[10px] mt-2 italic">Le forfait par défaut sera appliqué.</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className={`flex flex-wrap md:flex-nowrap items-center gap-4 p-4 rounded-2xl border transition-all ${isLocked ? 'bg-slate-50/50 border-transparent' : 'bg-white shadow-sm border-slate-200 hover:border-purple-200'}`}>
                  {isLocked ? (
                    <span className="flex-1 font-bold text-slate-600 text-sm ml-2">{item.name}</span>
                  ) : (
                    <input placeholder="Ex: Four encastrable..." value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} className="flex-1 font-bold outline-none text-sm bg-transparent" />
                  )}

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Qté</span>
                      {isLocked ? (
                        <span className="w-12 text-center font-black text-xs text-purple-600">{item.quantity_to_cover}</span>
                      ) : (
                        <input type="number" value={item.quantity_to_cover || 1} onChange={e => updateItem(item.id, 'quantity_to_cover', e.target.value)} className="w-12 bg-slate-50 rounded-xl p-2 text-center text-xs font-black outline-none" />
                      )}
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Prix U.</span>
                      {isLocked ? (
                        <span className="w-20 font-black text-right text-xs">{item.unit_price} €</span>
                      ) : (
                        <div className="flex items-center bg-slate-50 rounded-xl px-2">
                          <input type="number" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', e.target.value)} className="w-16 p-2 text-right text-xs font-black bg-transparent outline-none" />
                          <span className="text-slate-400 text-[10px] font-bold">€</span>
                        </div>
                      )}
                    </div>
                    {!isLocked && <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {!isLocked && (
            <button onClick={handleSaveChiffrage} disabled={isSaving} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black shadow-xl hover:bg-purple-600 transition-all flex justify-center gap-2 mt-4">
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} SAUVEGARDER CHIFFRAGE
            </button>
          )}
        </div>

        {/* RÉSUMÉ BROUILLON */}
        {!showPurchases && (
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit space-y-6 sticky top-28">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Forfait Client (Vente HT)</span>
                <span className="text-2xl font-black text-slate-700">{forfaitPrice} €</span>
              </div>
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Budget Achat Max</span>
                  <span className="font-bold text-slate-700 text-sm">{Math.round(budgetAchatMax).toLocaleString()} €</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Total Chiffré</span>
                  <span className={`font-bold text-sm ${totalAchatEstime > budgetAchatMax ? 'text-red-500 font-black' : 'text-slate-700'}`}>{Math.round(totalAchatEstime).toLocaleString()} €</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION ACHATS RÉELS */}
        {showPurchases && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6 bg-purple-50 p-4 rounded-2xl border border-purple-100">
               <ShoppingBag className="text-purple-600" />
               <h2 className="font-black uppercase text-sm tracking-widest text-purple-900">Dépenses Réelles</h2>
               <div className="ml-auto text-right">
                 <span className={`font-black text-lg ${totalAchatReel > budgetAchatMax ? 'text-red-600' : 'text-purple-600'}`}>
                   {Math.round(totalAchatReel).toLocaleString()} €
                 </span>
               </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-purple-100 shadow-sm overflow-hidden mb-6">
              <div className="bg-purple-50/30 p-6 border-b border-purple-50 flex justify-between items-center">
                <h3 className="font-black text-purple-900 uppercase text-xs">Articles achetés</h3>
                <button onClick={addPurchase} className="text-[10px] bg-purple-100 text-purple-700 px-4 py-2 rounded-xl font-black uppercase hover:bg-purple-600 hover:text-white transition-all shadow-sm">
                  + Ajouter Facture
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                {purchases.length === 0 ? (
                    <div className="py-6 text-center italic text-[10px] font-bold uppercase text-slate-300">Aucun achat saisi</div>
                ) : (
                  purchases.map((p) => (
                    <div key={p.id} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex gap-3">
                        <div className="flex-1">
                            <span className="block text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">Désignation</span>
                            <input placeholder="Ex: Four encastrable..." value={p.name} onChange={e => updatePurchase(p.id, 'name', e.target.value)} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:border-purple-300" />
                        </div>
                        <div className="w-1/3">
                            <span className="block text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">Réf / Magasin</span>
                            <input placeholder="Ex: Darty" value={p.reference} onChange={e => updatePurchase(p.id, 'reference', e.target.value)} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs outline-none focus:border-purple-300" />
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
                          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 focus-within:border-purple-300">
                              <input type="number" value={p.unit_price_ht} onChange={e => updatePurchase(p.id, 'unit_price_ht', e.target.value)} className="w-16 p-2 text-xs text-right outline-none font-black" />
                              <span className="text-slate-400 text-[10px] font-bold">€</span>
                          </div>
                        </div>
                        <div>
                          <span className="block text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">Remise</span>
                          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 focus-within:border-orange-300">
                              <input type="number" value={p.discount_percent} onChange={e => updatePurchase(p.id, 'discount_percent', e.target.value)} className="w-12 p-2 text-xs text-center outline-none font-black text-purple-500" />
                              <span className="text-purple-400 text-[10px] font-bold">%</span>
                          </div>
                        </div>
                        <div className="flex-1 text-right bg-purple-100/50 border border-purple-200 p-3 rounded-xl flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase text-purple-600/80">Total Payé HT</span>
                          <span className="font-black text-purple-700 text-base">{p.total_ht ? parseFloat(p.total_ht).toFixed(2) : '0.00'} €</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <button onClick={handleSavePurchases} disabled={isSavingPurchases} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 rounded-2xl font-black shadow-xl transition-all flex justify-center items-center gap-3">
              {isSavingPurchases ? <Loader2 className="animate-spin" /> : <Save size={20} />} SAUVEGARDER LES ACHATS
            </button>
          </div>
        )}

      </div>
    </div>
  );
}