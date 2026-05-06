'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { 
  ChefHat, Plus, Trash2, Save, Loader2, 
  AlertTriangle, Calculator, ArrowRight 
} from 'lucide-react';

export default function CuisinePage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [forfaitPrice, setForfaitPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
    
    if (proj) {
      const { data: grid } = await supabase.from('pricing_grids')
        .select('price')
        .eq('category', 'CUISINE')
        .eq('property_type', proj.property_type)
        .single();
      if (grid) setForfaitPrice(grid.price);
    }

    const { data: savedItems } = await supabase.from('estimate_items')
      .select('*')
      .eq('project_id', projectId)
      .eq('category', 'CUISINE');

    setProject(proj);
    setItems(savedItems || []);
    setLoading(false);
  };

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), project_id: projectId, category: 'CUISINE', name: '', unit_price: 0, quantity_to_cover: 1 }]);
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await supabase.from('estimate_items').delete().eq('project_id', projectId).eq('category', 'CUISINE');
    if (items.length > 0) {
      await supabase.from('estimate_items').insert(items.map(({ id, ...rest }) => rest));
    }
    setIsSaving(false);
    alert("Chiffrage cuisine enregistré !");
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>;

  const totalReelHT = items.reduce((acc, item) => acc + (item.unit_price * item.quantity_to_cover), 0);
  const totalVenteHT = totalReelHT * (project?.margin || 1.25);

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8 pb-40">
      <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500 p-4 rounded-3xl text-white shadow-xl shadow-orange-100"><ChefHat size={28} /></div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Mobilier de Cuisine</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Meubles, plans de travail et pose</p>
          </div>
        </div>
        <button onClick={addItem} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-orange-600 transition-all shadow-xl">
          <Plus size={20} /> Ajouter un élément
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.length === 0 ? (
            <div className="bg-orange-50 border-2 border-dashed border-orange-200 p-12 rounded-[2.5rem] text-center">
              <p className="text-orange-900 font-bold uppercase text-xs tracking-widest">Aucun montant réel saisi</p>
              <p className="text-orange-700/60 text-[10px] mt-2 italic">Le forfait minimum de {forfaitPrice}€ sera appliqué au récapitulatif.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <input placeholder="Désignation..." value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} className="flex-1 font-bold outline-none" />
                <input type="number" value={item.unit_price} onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24 bg-slate-50 p-2 rounded-xl text-right font-black" />
                <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-slate-200 hover:text-red-500"><Trash2 size={18} /></button>
              </div>
            ))
          )}
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit space-y-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Forfait Minimum ({project.property_type})</span>
            <span className="text-xl font-black text-slate-500">{forfaitPrice} € HT</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>Total Réel HT</span><span>{totalReelHT} €</span></div>
            <div className="flex justify-between items-center text-blue-600">
              <span className="font-black text-[10px] uppercase">Prix Vente HT</span>
              <span className="text-3xl font-black tracking-tighter">{Math.round(totalVenteHT)} €</span>
            </div>
          </div>
          <button onClick={handleSave} disabled={isSaving} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-100">
            {isSaving ? <Loader2 className="animate-spin" /> : 'ENREGISTRER'}
          </button>
        </div>
      </div>
    </div>
  );
}