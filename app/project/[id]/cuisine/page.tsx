'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { 
  ChefHat, Plus, Trash2, Save, Loader2, 
  Calculator, ArrowRight, Settings2, Info
} from 'lucide-react';

export default function CuisinePage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('');
  const [allPricing, setAllPricing] = useState<any[]>([]);
  const [currentForfait, setCurrentForfait] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Liste des typologies standards
  const propertyTypes = ['T1', 'T1 Bis', 'T2', 'T3', 'T4', 'T5', 'T6'];

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Charger le projet
    const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
    
    // 2. Charger toutes les grilles de prix pour la cuisine
    const { data: pricingData } = await supabase.from('pricing_grids')
      .select('*')
      .eq('category', 'CUISINE');

    // 3. Charger les items déjà enregistrés
    const { data: savedItems } = await supabase.from('estimate_items')
      .select('*')
      .eq('project_id', projectId)
      .eq('category', 'CUISINE');

    if (proj) {
      setProject(proj);
      setSelectedPropertyType(proj.property_type); // Initialise avec la valeur du récap
      
      // Trouver le prix correspondant à la typologie du projet
      const currentPrice = pricingData?.find(p => p.property_type === proj.property_type)?.price || 0;
      setCurrentForfait(currentPrice);
    }

    setAllPricing(pricingData || []);
    setItems(savedItems || []);
    setLoading(false);
  };

  // Mettre à jour le prix du forfait quand on change la typologie manuellement
  const handleTypeChange = (newType: string) => {
    setSelectedPropertyType(newType);
    const newPrice = allPricing.find(p => p.property_type === newType)?.price || 0;
    setCurrentForfait(newPrice);
  };

  const addItem = () => {
    setItems([...items, { 
      id: crypto.randomUUID(), 
      project_id: projectId, 
      category: 'CUISINE', 
      name: '', 
      unit_price: 0, 
      quantity_to_cover: 1 
    }]);
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await supabase.from('estimate_items').delete().eq('project_id', projectId).eq('category', 'CUISINE');
      if (items.length > 0) {
        await supabase.from('estimate_items').insert(items.map(({ id, ...rest }) => rest));
      }
      alert("Chiffrage cuisine enregistré !");
    } catch (error) {
      console.error(error);
    }
    setIsSaving(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="animate-spin text-orange-500" size={48} />
      <p className="text-slate-400 font-bold animate-pulse">CHARGEMENT DU CHIFFRAGE...</p>
    </div>
  );

  const totalReelHT = items.reduce((acc, item) => acc + (item.unit_price * item.quantity_to_cover), 0);
  const margin = project?.margin || 1.25;
  const totalVenteHT = totalReelHT * margin;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 pb-40 text-slate-900">
      
      {/* HEADER ULTRA DESIGN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="flex items-center gap-6">
          <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-5 rounded-[2rem] text-white shadow-lg shadow-orange-200">
            <ChefHat size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Cuisine</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-wider">
                Projet : {project?.name || 'Sans titre'}
              </span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={addItem}
          className="group flex items-center gap-3 bg-slate-900 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-slate-200"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          AJOUTER UN ÉLÉMENT
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLONNE GAUCHE : LISTE DES ÉLÉMENTS */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Détails des fournitures & pose</h2>
            <span className="text-[10px] font-bold text-slate-400">{items.length} élément(s)</span>
          </div>

          {items.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-20 rounded-[3rem] text-center">
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Calculator className="text-slate-300" size={24} />
              </div>
              <p className="text-slate-400 font-bold text-sm">Aucun élément saisi pour le moment.</p>
              <p className="text-slate-300 text-xs mt-1 italic">Le forfait de {currentForfait}€ sera utilisé par défaut.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xs group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                    #
                  </div>
                  <input 
                    placeholder="Désignation de l'élément (ex: Meuble sous évier...)" 
                    value={item.name} 
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    className="flex-1 font-bold text-slate-700 placeholder:text-slate-300 outline-none"
                  />
                  <div className="flex items-center bg-slate-50 rounded-2xl px-4 py-2 border border-slate-100 focus-within:border-orange-300 transition-colors">
                    <input 
                      type="number" 
                      value={item.unit_price} 
                      onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-20 bg-transparent text-right font-black text-slate-900 outline-none"
                    />
                    <span className="ml-2 text-slate-400 font-bold">€</span>
                  </div>
                  <button 
                    onClick={() => setItems(items.filter(i => i.id !== item.id))}
                    className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLONNE DROITE : RÉSUMÉ ET SÉLECTEUR DE FORFAIT */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* CARTE CONFIGURATION FORFAIT */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Settings2 size={18} className="text-orange-500" />
              <h2 className="font-black text-xs uppercase tracking-widest text-slate-400">Réglage du Forfait</h2>
            </div>

            <div className="space-y-4">
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">
                  Typologie de Bien
                </label>
                <select 
                  value={selectedPropertyType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full bg-white p-4 rounded-2xl font-black text-slate-900 border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  {propertyTypes.map(type => (
                    <option key={type} value={type}>
                      {type} {type === project?.property_type ? '(Initial)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between p-5 bg-orange-50 rounded-3xl border border-orange-100">
                <span className="text-[10px] font-black text-orange-700 uppercase">Valeur Forfait</span>
                <span className="text-xl font-black text-orange-600">{currentForfait} € HT</span>
              </div>
            </div>

            <div className="pt-4 space-y-4 border-t border-slate-50">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase">Total Réel Saisi</span>
                <span className="font-bold text-slate-600">{totalReelHT} € HT</span>
              </div>
              
              <div className="p-6 bg-blue-600 rounded-[2rem] text-white shadow-lg shadow-blue-200 relative overflow-hidden">
                <div className="relative z-10">
                  <span className="text-[10px] font-black uppercase opacity-60">Prix de Vente Final</span>
                  <div className="text-4xl font-black tracking-tighter mt-1">
                    {Math.round(totalVenteHT)} €
                  </div>
                  <p className="text-[9px] mt-2 font-bold opacity-80 uppercase tracking-wider">
                    Marge appliquée : +{Math.round((margin - 1) * 100)}%
                  </p>
                </div>
                <Calculator className="absolute -right-4 -bottom-4 text-white/10" size={100} />
              </div>

              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-green-600 text-white py-6 rounded-2xl font-black transition-all shadow-xl disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> ENREGISTRER LE CHIFFRAGE</>}
              </button>
            </div>
          </div>

          {/* PETIT DASHBOARD D'INFO */}
          {totalReelHT > currentForfait && (
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex gap-4">
              <Info className="text-amber-500 shrink-0" size={20} />
              <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                Le montant réel ({totalReelHT}€) dépasse le forfait initialement prévu pour un {selectedPropertyType} ({currentForfait}€).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}