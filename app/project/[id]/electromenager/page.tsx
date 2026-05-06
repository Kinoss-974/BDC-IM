'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { Tv, Plus, Trash2, Save, Loader2, ListPlus } from 'lucide-react';

export default function ElectromenagerPage() {
  const params = useParams();
  const projectId = params?.id as string;
  
  const [project, setProject] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]); // Le catalogue d'articles
  const [items, setItems] = useState<any[]>([]);     // Les éléments choisis pour ce projet
  
  const [forfaitPrice, setForfaitPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
    setProject(proj);
    
    // 1. Récupération du catalogue et du forfait depuis la page Admin
    const { data: grid } = await supabase.from('pricing_grids').select('*').eq('category', 'ELECTRO');
    if (grid) {
      // On isole le forfait de ce type de bien
      const forfait = grid.find(g => g.item_type === 'FORFAIT' && g.property_type === proj?.property_type);
      if (forfait) setForfaitPrice(forfait.price);
      
      // On isole les articles pour le menu déroulant
      const articles = grid.filter(g => g.item_type === 'ARTICLE');
      setCatalog(articles);
    }

    // 2. Récupération des choix déjà faits pour ce projet
    const { data: savedItems } = await supabase.from('estimate_items').select('*').eq('project_id', projectId).eq('category', 'ELECTRO');
    setItems(savedItems || []);
    
    setLoading(false);
  };

  // Fonction pour ajouter un article depuis le catalogue
  const addItemFromCatalog = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const articleId = e.target.value;
    if (!articleId) return;
    
    const article = catalog.find(a => a.id === articleId);
    if (article) {
      setItems([...items, { 
        id: crypto.randomUUID(), 
        project_id: projectId, 
        category: 'ELECTRO', 
        name: article.sub_category, 
        unit_price: article.price, 
        quantity_to_cover: 1 
      }]);
    }
    e.target.value = ""; // Reset du select
  };

  // Fonction pour ajouter une ligne manuelle hors catalogue
  const addManualItem = () => {
    setItems([...items, { id: crypto.randomUUID(), project_id: projectId, category: 'ELECTRO', name: '', unit_price: 0, quantity_to_cover: 1 }]);
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await supabase.from('estimate_items').delete().eq('project_id', projectId).eq('category', 'ELECTRO');
    if (items.length > 0) {
      await supabase.from('estimate_items').insert(items.map(({ id, ...rest }) => rest));
    }
    setIsSaving(false);
    alert("Chiffrage électroménager enregistré !");
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-purple-600" size={40} /></div>;

  const totalReelHT = items.reduce((acc, item) => acc + (item.unit_price * item.quantity_to_cover), 0);
  const totalVenteHT = totalReelHT * (project?.margin || 1.25);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-40">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-purple-600 p-4 rounded-3xl text-white shadow-xl shadow-purple-100">
            <Tv size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Électroménager</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Saisie du devis réel</p>
          </div>
        </div>
        
        {/* BOUTONS D'AJOUT */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Menu déroulant lié au catalogue */}
          <div className="relative flex-1 md:flex-none">
            <ListPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={18} />
            <select onChange={addItemFromCatalog} defaultValue="" className="w-full md:w-64 pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-xs uppercase text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-colors appearance-none">
              <option value="" disabled>+ Catalogue</option>
              {catalog.map(a => (
                <option key={a.id} value={a.id}>{a.sub_category} ({a.price}€)</option>
              ))}
            </select>
          </div>
          
          <button onClick={addManualItem} className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-purple-600 transition-all shadow-xl" title="Ajouter ligne manuelle">
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.length === 0 ? (
            <div className="bg-purple-50 border-2 border-dashed border-purple-200 p-12 rounded-[2.5rem] text-center">
              <p className="text-purple-900 font-bold uppercase text-xs tracking-widest">Aucun appareil saisi</p>
              <p className="text-purple-700/60 text-[10px] mt-2 italic">Le pack complet de {forfaitPrice}€ sera utilisé par défaut dans le récapitulatif.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <input placeholder="Ex: Frigo Samsung..." value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} className="flex-1 font-bold outline-none" />
                <input type="number" value={item.unit_price} onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24 bg-slate-50 p-2 rounded-xl text-right font-black" />
                <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-slate-200 hover:text-red-500"><Trash2 size={18} /></button>
              </div>
            ))
          )}
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit space-y-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Pack Complet ({project?.property_type})</span>
            <span className="text-xl font-black text-slate-500">{forfaitPrice} € HT</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>Achat réel HT</span><span>{totalReelHT} €</span></div>
            <div className="flex justify-between items-center text-purple-600">
              <span className="font-black text-[10px] uppercase">Prix Vente HT</span>
              <span className="text-3xl font-black tracking-tighter">{Math.round(totalVenteHT)} €</span>
            </div>
          </div>
          <button onClick={handleSave} disabled={isSaving} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl">
            {isSaving ? <Loader2 className="animate-spin" /> : 'SAUVEGARDER'}
          </button>
        </div>
      </div>
    </div>
  );
}