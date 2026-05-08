'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { 
  Truck, Plus, Trash2, Save, Loader2, 
  Calculator, Info, AlertTriangle, ChevronLeft, ShoppingBag
} from 'lucide-react';
import Link from 'next/link';

export default function LivraisonPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]); 
  const [forfaitVente, setForfaitVente] = useState(0); // Montant brut de la grille
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
      setProject(proj);

      if (proj) {
        // 1. Charger le forfait livraison (Vente HT)
        const { data: pricing } = await supabase.from('pricing_grids')
          .select('price')
          .eq('category', 'LIVRAISON')
          .eq('sub_category', 'Standard')
          .eq('property_type', proj.property_type)
          .single();
        
        if (pricing) setForfaitVente(parseFloat(pricing.price) || 0);

        // 2. Charger les frais réels
        const { data: savedPurchases } = await supabase.from('purchase_items')
          .select('*')
          .eq('project_id', projectId)
          .eq('category', 'LIVRAISON');
        
        setPurchases(savedPurchases || []);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const addLine = () => {
    setPurchases([...purchases, { 
      id: crypto.randomUUID(), 
      project_id: projectId, 
      category: 'LIVRAISON', 
      name: '', 
      total_ht: 0 
    }]);
  };

  const updateLine = (id: string, field: string, value: any) => {
    setPurchases(purchases.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeLine = (id: string) => {
    setPurchases(purchases.filter(p => p.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await supabase.from('purchase_items').delete().eq('project_id', projectId).eq('category', 'LIVRAISON');
      if (purchases.length > 0) {
        const cleanPurchases = purchases.map(({ id, created_at, ...rest }) => rest);
        await supabase.from('purchase_items').insert(cleanPurchases);
      }
      alert("Frais de logistique enregistrés !");
    } catch (error) { console.error(error); }
    setIsSaving(false);
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  // --- LOGIQUE : Budget Achat = Forfait Grille (Pas de division par la marge) ---
  const budgetAchatMax = forfaitVente; 
  const totalFraisReels = purchases.reduce((acc, p) => acc + (parseFloat(p.total_ht) || 0), 0);
  const resteBudget = budgetAchatMax - totalFraisReels;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 pb-40 text-slate-900">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm gap-6">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-xl shadow-slate-200">
            <Truck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">Logistique & Livraison</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Saisie des dépenses réelles de transport</p>
          </div>
        </div>
        <Link href={`/project/${projectId}/recap`} className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 rounded-2xl transition-all border border-slate-100">
            <ChevronLeft size={16} /> Retour Synthèse
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE : SAISIE DES FRAIS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* HEADER BUDGET BLEU */}
          <div className="flex items-center justify-between bg-blue-50 p-6 rounded-3xl border border-blue-100 shadow-sm">
             <div className="flex items-center gap-4">
               <div className="bg-white p-3 rounded-2xl shadow-sm"><Calculator className="text-blue-500" size={24} /></div>
               <div>
                 <h2 className="font-black uppercase text-sm tracking-widest text-blue-800">Budget Logistique</h2>
                 <p className="text-[9px] font-bold text-blue-500 uppercase mt-0.5">Montant forfaitaire non margé</p>
               </div>
             </div>
             <div className="text-right bg-white px-6 py-3 rounded-2xl shadow-sm">
               <span className="font-black text-blue-600 text-2xl">{Math.round(budgetAchatMax).toLocaleString()} €</span>
             </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <ShoppingBag size={14} /> Liste des dépenses logistiques
                </h2>
                <button onClick={addLine} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-lg flex items-center gap-2">
                    <Plus size={14} /> Ajouter un frais
                </button>
            </div>

            <div className="p-6 space-y-4">
                {purchases.length === 0 ? (
                    <div className="py-12 text-center text-slate-300 font-bold uppercase text-[10px] italic tracking-widest">
                        Aucune ligne de dépense saisie.
                    </div>
                ) : (
                    purchases.map((p) => (
                        <div key={p.id} className="flex items-center gap-4 group animate-in slide-in-from-left-2 duration-200">
                            <div className="flex-1 bg-slate-50 rounded-2xl p-3 px-5 border border-transparent focus-within:border-blue-300 focus-within:bg-white transition-all shadow-sm">
                                <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Libellé (Ex: Frais de port, Camion...)</span>
                                <input 
                                    placeholder="Désignation de la dépense..." 
                                    value={p.name} 
                                    onChange={(e) => updateLine(p.id, 'name', e.target.value)}
                                    className="w-full bg-transparent font-bold text-slate-700 outline-none text-sm"
                                />
                            </div>
                            <div className="w-40 bg-slate-50 rounded-2xl p-3 px-5 border border-transparent focus-within:border-blue-300 focus-within:bg-white transition-all text-right shadow-sm">
                                <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Montant HT</span>
                                <div className="flex items-center justify-end">
                                    <input 
                                        type="number" 
                                        value={p.total_ht} 
                                        onChange={(e) => updateLine(p.id, 'total_ht', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-transparent font-black text-slate-900 outline-none text-right text-sm"
                                    />
                                    <span className="ml-1 font-bold text-slate-400 text-sm">€</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => removeLine(p.id)}
                                className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))
                )}
            </div>
          </div>
          
          <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full bg-slate-900 hover:bg-blue-600 text-white py-6 rounded-[2rem] font-black shadow-xl transition-all flex justify-center items-center gap-3 disabled:opacity-50"
          >
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} 
              ENREGISTRER LA LOGISTIQUE
          </button>
        </div>

        {/* COLONNE DROITE : RÉSUMÉ & ALERTES */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 sticky top-28">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Solde Logistique</h3>
            
            <div className="space-y-4">
               <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase px-2">
                 <span>Budget Total</span>
                 <span className="text-slate-900">{Math.round(budgetAchatMax)} €</span>
               </div>
               
               <div className={`p-6 rounded-3xl flex flex-col items-center justify-center border ${resteBudget < 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                 <span className="text-[9px] font-black uppercase mb-1 opacity-70">Reste disponible</span>
                 <span className="text-4xl font-black tracking-tighter">{Math.round(resteBudget).toLocaleString()} €</span>
               </div>

               <div className="pt-4 border-t border-slate-50">
                 <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase px-2">
                   <span>Total dépensé</span>
                   <span className={totalFraisReels > budgetAchatMax ? 'text-red-500' : 'text-slate-700'}>{Math.round(totalFraisReels)} € HT</span>
                 </div>
               </div>
            </div>

            {resteBudget < 0 && (
              <div className="bg-red-600 text-white p-5 rounded-2xl flex items-center gap-4 animate-pulse">
                <AlertTriangle size={24} className="shrink-0" />
                <p className="text-[10px] font-black uppercase leading-tight">Attention : Dépassement de l'enveloppe transport !</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}