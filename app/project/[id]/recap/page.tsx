'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { 
  Calculator, Plus, Trash2, Save, Loader2, Package, 
  Hammer, Paintbrush, Droplets, Lightbulb, Construction, RefreshCw
} from 'lucide-react';

export default function FournituresPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Ajout de mots-clés (keywords) pour un filtrage ultra-tolérant
  const categoriesConfig = [
    { name: 'Fourniture sol', keywords: ['sol', 'sols'], icon: <Hammer size={18} /> },
    { name: 'Fourniture mur', keywords: ['mur', 'murs', 'peinture'], icon: <Paintbrush size={18} /> },
    { name: 'Fourniture plafond', keywords: ['plafond', 'plafonds'], icon: <Paintbrush size={18} /> },
    { name: 'Fourniture SDB', keywords: ['sdb', 'bain', 'sanitaire'], icon: <Droplets size={18} /> },
    { name: 'Fourniture Cuisine', keywords: ['cuisine', 'cuisines'], icon: <Construction size={18} /> },
    { name: 'Fourniture Électricité', keywords: ['elec', 'élec', 'electricite', 'électricité'], icon: <Lightbulb size={18} /> },
    { name: 'Fourniture Plomberie', keywords: ['plomb', 'plomberie'], icon: <Droplets size={18} /> },
    { name: 'Fourniture Divers', keywords: ['divers', 'autre', 'autres'], icon: <Package size={18} /> }
  ];

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const fetchData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
      setProject(proj);

      if (proj) {
        const { data: savedItems } = await supabase.from('estimate_items')
          .select('*')
          .eq('project_id', projectId)
          .ilike('category', 'Fourniture%');

        if (savedItems && savedItems.length > 0 && !forceRefresh) {
          setItems(savedItems);
        } else {
          // LIAISON SQL EXACTE
          const { data: matrix } = await supabase.from('pack_templates')
            .select('*')
            .eq('product_type', proj.product_type)   
            .eq('package_type', proj.package_type)   
            .eq('property_type', proj.property_type) 
            .ilike('category', 'Fourniture%');

          // Ajout d'un log pour voir ce qui sort de la matrice
          console.log("Données trouvées dans la matrice :", matrix);

          if (matrix) {
            setItems(matrix.map(m => ({
              id: crypto.randomUUID(),
              project_id: projectId,
              category: m.category, // On garde le nom de catégorie d'origine
              name: m.name,
              unit_price: parseFloat(m.price) || 0,
              quantity_to_cover: parseFloat(m.quantity) || 1
            })));
          }
        }
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const addManualItem = (categoryName: string) => {
    setItems([...items, {
      id: crypto.randomUUID(),
      project_id: projectId,
      category: categoryName,
      name: '',
      unit_price: 0,
      quantity_to_cover: 1
    }]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await supabase.from('estimate_items').delete().eq('project_id', projectId).ilike('category', 'Fourniture%');
    if (items.length > 0) {
      const toSave = items.map(({ id, ...rest }) => rest);
      await supabase.from('estimate_items').insert(toSave);
    }
    setIsSaving(false);
    alert("Chiffrage enregistré !");
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <span className="text-[10px] font-black uppercase text-slate-400">Synchronisation base de données...</span>
    </div>
  );

  const totalReel = items.reduce((acc, item) => acc + ((parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity_to_cover) || 0)), 0);
  const totalVente = totalReel * (parseFloat(project?.margin) || 1.25);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 pb-40 text-slate-900">
      
      {/* HEADER */}
      <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-blue-600 p-5 rounded-[2rem] shadow-lg"><Package size={32} /></div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter italic">Fournitures</h1>
              <p className="text-blue-300 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 italic">{project?.name}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Produit', val: project?.product_type },
              { label: 'Bien', val: project?.property_type },
              { label: 'Ameublement', val: project?.package_type }
            ].map((tag, i) => (
              <div key={i} className="flex flex-col px-5 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md min-w-[110px]">
                <span className="text-[8px] font-black uppercase opacity-60 text-white/70 mb-1">{tag.label}</span>
                <span className="text-xs font-black uppercase text-white tracking-wide">{tag.val || 'N/C'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-6">
          {categoriesConfig.map((cat) => {
            // Filtrage ULTRA tolérant avec des mots-clés
            const catItems = items.filter(i => {
                if (!i.category) return false;
                const catLower = i.category.toLowerCase();
                // Si la catégorie contient un des mots-clés, on l'affiche ici
                return cat.keywords.some(keyword => catLower.includes(keyword));
            });

            return (
              <div key={cat.name} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="bg-slate-50/50 p-6 border-b flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="text-blue-600 bg-blue-50 p-3 rounded-2xl">{cat.icon}</div>
                    <h2 className="font-black text-slate-800 uppercase tracking-widest text-xs">{cat.name}</h2>
                  </div>
                  <button onClick={() => addManualItem(cat.name)} className="text-[10px] font-black bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">+ Ajouter</button>
                </div>
                <div className="p-4 space-y-3">
                  {catItems.length === 0 ? (
                    <div className="py-6 text-center italic text-[10px] font-bold uppercase text-slate-300">Section vide</div>
                  ) : (
                    catItems.map((item) => (
                      <div key={item.id} className="group flex flex-wrap md:flex-nowrap items-center gap-4 bg-slate-50/30 hover:bg-white p-4 rounded-2xl border border-transparent hover:border-slate-100 transition-all">
                        <input value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} className="flex-1 min-w-[200px] font-bold outline-none text-slate-700 text-sm bg-transparent" />
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase mb-1 text-center">Qté</span>
                            <input type="number" value={item.quantity_to_cover} onChange={e => updateItem(item.id, 'quantity_to_cover', e.target.value)} className="w-16 bg-white border border-slate-100 p-2 rounded-xl font-black text-center text-xs text-blue-600 outline-none" />
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-slate-400 uppercase mb-1">Prix Unitaire</span>
                            <div className="flex items-center gap-2 bg-white border border-slate-100 p-2 rounded-xl">
                              <input type="number" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', e.target.value)} className="w-20 font-black text-right text-xs outline-none bg-transparent" />
                              <span className="text-slate-400 font-bold text-xs">€</span>
                            </div>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* SIDEBAR RÉSUMÉ */}
        <div className="xl:col-span-4">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl sticky top-28 space-y-6 text-center">
            <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Synthèse</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-slate-50 pb-4 text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase">Total Achat</span>
                <span className="font-bold text-slate-700 text-lg">{Math.round(totalReel).toLocaleString()} €</span>
              </div>
              <div className="p-8 bg-blue-600 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
                <span className="text-[10px] font-black uppercase opacity-60">Prix de vente</span>
                <div className="text-5xl font-black italic tracking-tighter mt-1">{Math.round(totalVente).toLocaleString()} €</div>
              </div>
            </div>
            <button onClick={handleSave} disabled={isSaving} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black shadow-xl hover:bg-blue-600 transition-all flex justify-center items-center gap-3">
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} SAUVEGARDER
            </button>
            <button onClick={() => fetchData(true)} className="w-full text-slate-300 hover:text-orange-600 font-bold text-[9px] uppercase tracking-widest flex justify-center items-center gap-2 transition-colors">
              <RefreshCw size={12} /> Réinitialiser via la matrice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}