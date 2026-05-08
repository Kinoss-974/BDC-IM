'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { 
  Loader2, Calculator, Home, 
  Package, ChefHat, Tv, Truck, Wrench, Ruler, 
  Briefcase, Printer, Send
} from 'lucide-react';

export default function RecapPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [pricing, setPricing] = useState<any[]>([]);
  const [globalMargin, setGlobalMargin] = useState<number>(1.25);
  const [purchases, setPurchases] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [fournituresTotal, setFournituresTotal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
      const { data: grid } = await supabase.from('pricing_grids').select('*');
      const { data: settings } = await supabase.from('global_settings').select('*');
      const { data: items } = await supabase.from('estimate_items').select('*').eq('project_id', projectId);
      const { data: achats } = await supabase.from('purchase_items').select('*').eq('project_id', projectId);
      
      if (settings) {
        const marginSetting = settings.find(s => s.key === 'default_margin');
        if (marginSetting) setGlobalMargin(parseFloat(marginSetting.value));
      }

      const totalF = items?.reduce((acc, item) => {
        const p = parseFloat(item.unit_price) || 0;
        const q = parseFloat(item.quantity_to_cover) || 0;
        return acc + (p * q);
      }, 0) || 0;

      setProject(proj);
      setPricing(grid || []);
      setPurchases(achats || []);
      setFournituresTotal(totalF);
    } catch (error) { console.error("Erreur:", error); }
    setLoading(false);
  };

  const getPrice = (cat: string, sub?: string, type?: string) => {
    const entry = pricing.find(p => p.category === cat && (!sub || p.sub_category === sub) && (!type || p.property_type === type));
    return entry ? parseFloat(entry.price) || 0 : 0;
  };

  const updateProject = async (updates: any) => {
    setProject((prev: any) => ({ ...prev, ...updates }));
    await supabase.from('projects').update(updates).eq('id', projectId);
  };

  const handlePrintAndSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (project?.status === 'brouillon' || !project?.status) {
        await supabase.from('projects').update({ status: 'en_attente_devis', margin: globalMargin }).eq('id', projectId);
        setProject((prev: any) => ({ ...prev, status: 'en_attente_devis', margin: globalMargin }));
      }
    } catch (error) { console.error(error); } 
    finally {
      setIsSubmitting(false);
      setTimeout(() => window.print(), 300);
    }
  };

  if (loading || !project) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  // --- LOGIQUE DE VERROUILLAGE ---
  const isChiffrageLocked = project?.status === 'en_attente_devis' || project?.status === 'devis_valide' || project?.status === 'devis_traite';
  const isSelectionLocked = project?.status === 'devis_valide' || project?.status === 'devis_traite';

  const activeMargin = (!project.status || project.status === 'brouillon') ? globalMargin : (parseFloat(project.margin) || globalMargin);
  const pType = project.property_type || '';
  const packType = project.package_type || '';
  const prodType = project.product_type || '';
  const moLevel = project.mo_level || '';

  // --- LOGIQUE 1 : Les postes AVEC MARGE (Prix grille = Vente) ---
  const venteAmeublement = getPrice('AMEUBLEMENT', packType, pType);
  const venteCuisine = project.is_cuisine_cuisiniste ? 0 : getPrice('CUISINE', 'Forfait', pType);
  const venteElectro = project.is_electro_cuisiniste ? 0 : getPrice('ELECTRO', 'Pack Complet', pType);
  
  const budgetAmeublement = venteAmeublement / activeMargin;
  const budgetCuisine = venteCuisine / activeMargin;
  const budgetElectro = venteElectro / activeMargin;

  // --- LOGIQUE 2 : Les postes SANS MARGE (Prix grille = Achat ET Vente) ---
  const budgetLivraison = getPrice('LIVRAISON', 'Standard', pType);
  const moSub = prodType === "RENO'MALIN" ? "RENO" : "IMMO/DECO";
  const budgetMontage = getPrice('MO_PACKAGE', moSub, pType);
  const budgetSurMesure = getPrice('MO_SUR_MESURE', moLevel, pType);

  const venteLivraison = budgetLivraison;
  const venteMontage = budgetMontage;
  const venteSurMesure = budgetSurMesure;

  // Totaux globaux
  const totalVenteHT = (fournituresTotal * activeMargin) + venteCuisine + venteElectro + venteAmeublement + venteLivraison + venteMontage + venteSurMesure;
  const totalBudgetAchatHT = fournituresTotal + budgetCuisine + budgetElectro + budgetAmeublement + budgetLivraison + budgetMontage + budgetSurMesure;

  // Dépenses réelles
  const getDépense = (catPrefix: string) => purchases.filter(p => p.category?.toLowerCase().includes(catPrefix.toLowerCase())).reduce((acc, p) => acc + (parseFloat(p.total_ht) || 0), 0);
  
  const rows = [
    { label: 'Fournitures', icon: Calculator, budget: fournituresTotal, vente: fournituresTotal * activeMargin, depense: getDépense('fourniture'), color: 'text-blue-500' },
    { label: 'Cuisine', icon: ChefHat, budget: budgetCuisine, vente: venteCuisine, depense: getDépense('cuisine'), color: 'text-orange-500' },
    { label: 'Électroménager', icon: Tv, budget: budgetElectro, vente: venteElectro, depense: getDépense('electro'), color: 'text-purple-500' },
    { label: 'Ameublement', icon: Package, budget: budgetAmeublement, vente: venteAmeublement, depense: getDépense('ameublement'), color: 'text-blue-400' },
    { label: 'Livraison & Logistique', icon: Truck, budget: budgetLivraison, vente: venteLivraison, depense: getDépense('livraison'), color: 'text-slate-400' },
    { label: 'Montage & Mise en scène', icon: Wrench, budget: budgetMontage, vente: venteMontage, depense: budgetMontage, color: 'text-slate-400' },
    { label: 'Main d\'œuvre (Niveau)', icon: Ruler, budget: budgetSurMesure, vente: venteSurMesure, depense: budgetSurMesure, color: 'text-slate-400' }
  ];

  return (
    <div className="min-h-screen font-sans pb-60 bg-slate-50">
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          header, .no-print, .fixed-bar, button, select, nav { display: none !important; }
          body, .print-content { background: white !important; padding: 0 !important; margin: 0 !important; display: block !important; visibility: visible !important; }
          .recap-card { border: 1px solid #e2e8f0 !important; box-shadow: none !important; margin-bottom: 10px !important; padding: 15px !important; border-radius: 15px !important; }
          h1 { font-size: 18px !important; margin-bottom: 5px !important; }
          table th, table td { padding: 8px 12px !important; font-size: 11px !important; }
          .total-box { padding: 15px !important; margin-top: 10px !important; border-radius: 15px !important; }
          .total-amount { font-size: 32px !important; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto p-6 space-y-6 print-content text-slate-900">
        <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm recap-card">
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase text-slate-900">
                {isSelectionLocked ? 'Synthèse & Suivi de Budget' : 'Synthèse Financière'}
            </h1>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1">
                Projet : {project.name} | Client : {project.client_name || 'N/C'}
            </p>
          </div>
          
          <button onClick={handlePrintAndSubmit} disabled={isSubmitting} className={`no-print px-6 py-3 rounded-xl font-black flex items-center gap-2 transition-all shadow-lg text-sm ${project.status === 'brouillon' || !project.status ? 'bg-slate-900 hover:bg-blue-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (project.status === 'brouillon' || !project.status) ? <Send size={18} /> : <Printer size={18} />}
            {(project.status === 'brouillon' || !project.status) ? 'VALIDER ET IMPRIMER' : 'IMPRIMER LE RÉCAP'}
          </button>
        </div>

        {/* GRILLE DE SÉLECTION DU BIEN */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 recap-card">
          {[
            { label: 'Produit', value: prodType, icon: Briefcase, key: 'product_type', options: ["IMMO'MALIN", "DECO'MALIN", "RENO'MALIN"] },
            { label: 'Bien', value: pType, icon: Home, key: 'property_type', options: ['T1', 'T1 Bis', 'T2', 'T3', 'T4', 'T5', 'T6'] },
            { label: 'Ameublement', value: packType, icon: Package, key: 'package_type', options: ['LLD', 'SAISONNIER'] },
            { label: 'Travaux', value: moLevel, icon: Ruler, key: 'mo_level', options: ['Niveau 1', 'Niveau 2', 'Niveau 3'] }
          ].map((item, idx) => (
            <div key={idx} className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <item.icon size={12} className="text-blue-600" /> {item.label}
              </label>
              <div className="no-print">
                {isSelectionLocked ? (
                   <div className="p-2 bg-slate-50 border border-transparent rounded-lg font-black text-slate-600 text-xs">
                       {item.value || 'N/C'}
                   </div>
                ) : (
                    <select 
                      value={item.value || ''} 
                      onChange={(e) => updateProject({ [item.key]: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg font-black text-slate-800 text-xs outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="" disabled>Sélectionnez...</option>
                      {item.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                )}
              </div>
              <p className="hidden print:block font-black text-slate-800 text-sm">{item.value || 'À définir'}</p>
            </div>
          ))}
        </div>

        {/* TABLEAU DE SYNTHÈSE */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden recap-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                {isSelectionLocked ? (
                  <tr className="bg-slate-900 text-[9px] font-black uppercase text-white tracking-widest border-b border-slate-100">
                    <th className="px-6 py-4">Poste de dépense</th>
                    <th className="px-6 py-4 text-right border-x border-slate-700 text-blue-300">Montant Client (Vente)</th>
                    <th className="px-6 py-4 text-right">Budget Dispo (Achat)</th>
                    <th className="px-6 py-4 text-right bg-slate-800 border-l border-slate-700 text-orange-300">Achats Réels</th>
                    <th className="px-6 py-4 text-right bg-slate-800">Reste Disponible</th>
                  </tr>
                ) : (
                  <tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                    <th className="px-6 py-4">Poste de dépense</th>
                    <th className="px-6 py-4 text-right">Budget Dispo (Achat HT)</th>
                    <th className="px-6 py-4 text-right">Montant Client (Vente HT)</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-800 text-xs">
                {rows.map((row, idx) => {
                  if (!isSelectionLocked) {
                    return (
                      <tr key={idx}>
                        <td className="px-6 py-4 flex items-center gap-3"><row.icon size={16} className={row.color} /> {row.label}</td>
                        <td className="px-6 py-4 text-right font-mono text-slate-400">{Math.round(row.budget).toLocaleString()} €</td>
                        <td className="px-6 py-4 text-right font-mono text-blue-600 font-black">{Math.round(row.vente).toLocaleString()} €</td>
                      </tr>
                    );
                  } else {
                    const reste = row.budget - row.depense;
                    const isOverBudget = reste < 0 && row.depense > 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 flex items-center gap-3"><row.icon size={16} className={row.color} /> {row.label}</td>
                        <td className="px-6 py-4 text-right border-x border-slate-100 text-blue-600 font-black bg-blue-50/30">{Math.round(row.vente).toLocaleString()} €</td>
                        <td className="px-6 py-4 text-right font-black">{Math.round(row.budget).toLocaleString()} €</td>
                        <td className="px-6 py-4 text-right bg-orange-50/30 border-l border-slate-100 text-orange-600 font-black">{row.depense > 0 ? Math.round(row.depense).toLocaleString() + ' €' : '-'}</td>
                        <td className={`px-6 py-4 text-right font-black ${isOverBudget ? 'bg-red-50 text-red-600' : 'bg-emerald-50/30 text-emerald-600'}`}>
                          {(row.depense > 0 || row.budget > 0) ? Math.round(reste).toLocaleString() + ' €' : '-'}
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOTAL BOX (PRINT ONLY) */}
        <div className="hidden print:flex justify-between items-center bg-slate-900 text-white p-8 rounded-2xl total-box">
            <div>
                <p className="text-[8px] font-black uppercase opacity-50 mb-1 tracking-widest">Budget Achat Disponible</p>
                <p className="text-xl font-black">{Math.round(totalBudgetAchatHT).toLocaleString()} €</p>
            </div>
            <div className="text-right">
                <p className="text-[8px] font-black uppercase opacity-50 mb-1 tracking-widest">Facturation Client (Vente HT)</p>
                <p className="text-4xl font-black total-amount">{Math.round(totalVenteHT).toLocaleString()} €</p>
            </div>
        </div>
      </div>

      {/* STICKY FOOTER */}
      <div className="fixed bottom-8 left-8 right-8 max-w-6xl mx-auto z-40 no-print">
        <div className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 border border-white/10">
          <div className="flex gap-12 items-center">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-500 block mb-1 tracking-widest">Budget Achat Disponible</span>
              <span className="text-2xl font-black font-mono tracking-tighter text-slate-200">{Math.round(totalBudgetAchatHT).toLocaleString()} €</span>
            </div>
          </div>
          <div className="text-center md:text-right">
            <span className="text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-widest">Proposition Client (Vente HT)</span>
            <span className="text-6xl font-black text-white font-mono tracking-tighter">{Math.round(totalVenteHT).toLocaleString()} €</span>
          </div>
        </div>
      </div>
    </div>
  );
}