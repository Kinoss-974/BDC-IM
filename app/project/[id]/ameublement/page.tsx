'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { 
  Sofa, Plus, Trash2, Save, Loader2, Package
} from 'lucide-react';

export default function AmeublementPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // L'ordre exact de tes sous-dossiers conservé
  const categories = [
    'Ameublement Divers', 'Ameublement Toutes Pièces', 'Ameublement Salon',
    'Ameublement Cuisine', 'Ameublement SDB', 'Ameublement Espace nuit',
    'Ameublement Entretient', 'Ameublement Petite décoration', 'Ameublement Extérieur'
  ];

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Récupérer les infos du projet
    const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
    setProject(proj);

    if (proj) {
      // SÉCURITÉ : On définit des valeurs par défaut si une case est vide dans le projet
      const typeBien = proj.property_type || 'T1';
      const produit = proj.product_type || "IMMO'MALIN"; // Correction ici !
      const gamme = proj.package_type || proj.location || 'Forfait LLD';

      // 2. Chercher s'il y a déjà des éléments sauvegardés pour CE projet
      const { data: savedItems } = await supabase.from('estimate_items')
        .select('*')
        .eq('project_id', projectId)
        .ilike('category', 'Ameublement%');

      if (savedItems && savedItems.length > 0) {
        setItems(savedItems);
      } else {
        // 3. SINON, on charge la matrice automatiquement depuis ALLPACK
        const { data: matrix } = await supabase.from('pack_templates')
          .select('*')
          .ilike('category', 'Ameublement%')
          .eq('property_type', typeBien)
          .eq('product_type', produit)
          .eq('package_type', gamme);

        if (matrix) {
          const initialItems = matrix.map(m => ({
            id: crypto.randomUUID(),
            project_id: projectId,
            category: m.category, // Conserve le sous-dossier exact
            name: m.name,
            unit_price: 0,
            quantity_to_cover: parseInt(m.quantity) || 1
          }));
          setItems(initialItems);
        }
      }
    }
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
    await supabase.from('estimate_items').delete().eq('project_id', projectId).ilike('category', 'Ameublement%');
    
    if (items.length > 0) {
      const toSave = items.map(({ id, ...rest }) => rest);
      await supabase.from('estimate_items').insert(toSave);
    }
    setIsSaving(false);
    alert("Chiffrage Ameublement enregistré !");
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  const totalReelHT = items.reduce((acc, item) => acc + ((item.unit_price || 0) * (item.quantity_to_cover || 1)), 0);
  const totalVenteHT = totalReelHT * (project?.margin || 1.25);
  
  // Variables d'affichage sécurisées pour les tags
  const displayBien = project?.property_type || 'T1';
  const displayProduit = project?.product_type || "IMMO'MALIN";
  const displayGamme = project?.package_type || project?.location || 'Forfait LLD';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-40">
      
      {/* BANDEAU CONTEXTE PROJET */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-wrap gap-8 items-center shadow-xl shadow-slate-200">
        <div className="bg-white/10 p-4 rounded-3xl"><Sofa size={32} /></div>
        <div className="flex-1">
          <h1 className="text-2xl font-black uppercase tracking-tighter italic">Chiffrage Ameublement</h1>
          <div className="flex gap-4 mt-2">
            <span className="text-[10px] font-bold bg-blue-500 px-2 py-1 rounded-full uppercase">{displayBien}</span>
            <span className="text-[10px] font-bold bg-purple-500 px-2 py-1 rounded-full uppercase">{displayProduit}</span>
            <span className="text-[10px] font-bold bg-orange-500 px-2 py-1 rounded-full uppercase">{displayGamme}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* COLONNE DE GAUCHE : LES SOUS-DOSSIERS */}
        <div className="xl:col-span-2 space-y-8">
          {categories.map((cat) => {
            const catItems = items.filter(i => i.category === cat);
            
            return (
              <div key={cat} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="font-black text-slate-700 uppercase tracking-widest text-sm flex items-center gap-3">
                    <Package size={16} className="text-blue-500"/> {cat}
                  </h2>
                  <button 
                    onClick={() => addManualItem(cat)} 
                    className="text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 px-3 py-1 rounded-full transition-all border border-blue-200"
                  >
                    + Ajouter
                  </button>
                </div>

                <div className="p-4 space-y-2">
                  {catItems.length === 0 ? (
                    <p className="text-center text-slate-300 italic text-xs py-4">Aucun article dans cette section.</p>
                  ) : (
                    catItems.map((item) => (
                      <div key={item.id} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-white hover:bg-slate-50 p-3 rounded-2xl border border-transparent hover:border-slate-100 transition-all">
                        <input 
                          placeholder="Désignation..."
                          value={item.name} 
                          onChange={e => updateItem(item.id, 'name', e.target.value)}
                          className="flex-1 min-w-[200px] font-bold outline-none text-slate-800 text-sm bg-transparent"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase">Qté</span>
                          <input 
                            type="number"
                            value={item.quantity_to_cover} 
                            onChange={e => updateItem(item.id, 'quantity_to_cover', parseFloat(e.target.value))}
                            className="w-16 bg-slate-100 p-2 rounded-xl font-black text-center text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase">Prix</span>
                          <input 
                            type="number"
                            value={item.unit_price} 
                            onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value))}
                            className="w-20 bg-slate-100 p-2 rounded-xl font-black text-right text-sm"
                          />
                          <span className="font-bold text-slate-400 text-sm">€</span>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* COLONNE DE DROITE : RÉCAPITULATIF */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm sticky top-28">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Résumé Ameublement</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between font-bold">
                <span className="text-slate-400 uppercase text-[10px]">Total Achat HT</span>
                <span>{totalReelHT.toLocaleString()} €</span>
              </div>
              <div className="flex justify-between items-center text-blue-600">
                <span className="font-black uppercase text-[10px]">Prix de vente HT</span>
                <span className="text-3xl font-black italic tracking-tighter">
                  {Math.round(totalVenteHT).toLocaleString()} €
                </span>
              </div>
            </div>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl flex justify-center items-center gap-3 hover:bg-blue-600 transition-colors"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} SAUVEGARDER
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}