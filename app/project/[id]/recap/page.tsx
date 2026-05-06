'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { 
  Loader2, Calculator, Home, 
  Package, ChefHat, Tv, Truck, Wrench, Ruler, 
  Briefcase, Printer, Info 
} from 'lucide-react';

export default function RecapPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [pricing, setPricing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fournituresTotal, setFournituresTotal] = useState(0);

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
      const { data: grid } = await supabase.from('pricing_grids').select('*');
      const { data: items } = await supabase.from('estimate_items').select('*').eq('project_id', projectId);
      
      const totalF = items?.reduce((acc, item) => acc + (item.unit_price * item.quantity_to_cover * (1 + item.margin_waste / 100)), 0) || 0;

      setProject(proj);
      setPricing(grid || []);
      setFournituresTotal(totalF);
    } catch (error) {
      console.error("Erreur:", error);
    }
    setLoading(false);
  };

  const getPrice = (cat: string, sub?: string, type?: string) => {
    const entry = pricing.find(p => 
      p.category === cat && 
      (!sub || p.sub_category === sub) && 
      (!type || p.property_type === type)
    );
    return entry ? entry.price : 0;
  };

  const updateProject = async (updates: any) => {
    setProject({ ...project, ...updates });
    await supabase.from('projects').update(updates).eq('id', projectId);
  };

  if (loading || !project) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }

  // CALCULS
  const amtAmeublement = getPrice('AMEUBLEMENT', project.package_type, project.property_type);
  const amtCuisine = getPrice('CUISINE', 'Forfait', project.property_type);
  const amtElectro = getPrice('ELECTRO', 'Pack Complet', project.property_type);
  const amtLivraison = getPrice('LIVRAISON', 'Standard', project.property_type);
  const moSub = project.product_type === "RENO'MALIN" ? "RENO" : "IMMO/DECO";
  const amtMontage = getPrice('MO_PACKAGE', moSub, project.property_type);
  const amtSurMesure = getPrice('MO_SUR_MESURE', project.mo_level, project.property_type);
  const marginCoeff = project.margin || 1.25;

  const totalAchatHT = fournituresTotal + amtAmeublement + amtCuisine + amtElectro + amtLivraison + amtMontage + amtSurMesure;
  const totalVenteHT = (fournituresTotal + amtCuisine + amtElectro) * marginCoeff + amtAmeublement + amtLivraison + amtMontage + amtSurMesure;

  return (
    <div className="min-h-screen font-sans pb-60 bg-slate-50">
      
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          /* Masquer tout l'UI */
          header, .no-print, .fixed-bar, button, select, nav { 
            display: none !important; 
          }
          /* Forcer l'affichage du contenu sur fond blanc */
          body, .print-content {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            visibility: visible !important;
          }
          /* Compresser les cartes pour que ça tienne sur 1 page */
          .recap-card {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            margin-bottom: 10px !important;
            padding: 15px !important;
            border-radius: 15px !important;
          }
          h1 { font-size: 18px !important; margin-bottom: 5px !important; }
          table th, table td { 
            padding: 8px 12px !important; 
            font-size: 11px !important; 
          }
          .total-box {
            padding: 15px !important;
            margin-top: 10px !important;
            border-radius: 15px !important;
          }
          .total-amount { font-size: 32px !important; }
        }
      `}</style>

      {/* Note: Pas de composant <Header /> ici pour éviter le doublon avec le layout global */}

      <div className="max-w-6xl mx-auto p-6 space-y-6 print-content">
        
        {/* TITRE ET ACTION */}
        <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm recap-card">
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase text-slate-900">Synthèse Financière</h1>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">
                Projet : {project.name} | Client : {project.client_name || 'N/C'} | {new Date().toLocaleDateString('fr-FR')}
            </p>
          </div>
          <button 
            onClick={() => window.print()}
            className="no-print bg-slate-900 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg text-sm"
          >
            <Printer size={18} /> Transmettre au conseiller
          </button>
        </div>

        {/* CONFIGURATION DU BIEN */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 recap-card">
          {[
            { label: 'Produit', value: project.product_type, icon: Briefcase, key: 'product_type', options: ["IMMO'MALIN", "DECO'MALIN", "RENO'MALIN"] },
            { label: 'Bien', value: project.property_type, icon: Home, key: 'property_type', options: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6 ou +'] },
            { label: 'Ameublement', value: project.package_type, icon: Package, key: 'package_type', options: [['LLD', 'LLD'], ['SAISONNIER', 'SAISONNIER']] },
            { label: 'Travaux', value: project.mo_level, icon: Ruler, key: 'mo_level', options: ['Niveau 1', 'Niveau 2', 'Niveau 3'] }
          ].map((item, idx) => (
            <div key={idx} className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <item.icon size={12} className="text-blue-600" /> {item.label}
              </label>
              <div className="no-print">
                <select 
                  value={item.value} 
                  onChange={(e) => updateProject({ [item.key]: e.target.value })}
                  className="w-full p-2 bg-slate-50 border-none rounded-lg font-black text-slate-800 text-xs outline-none cursor-pointer"
                >
                  {item.options.map((opt: any) => (
                    <option key={Array.isArray(opt) ? opt[0] : opt} value={Array.isArray(opt) ? opt[0] : opt}>
                      {Array.isArray(opt) ? opt[1] : opt}
                    </option>
                  ))}
                </select>
              </div>
              <p className="hidden print:block font-black text-slate-800 text-sm">{item.value}</p>
            </div>
          ))}
        </div>

        {/* TABLEAU RÉCAPITULATIF */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden recap-card">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Poste de dépense</th>
                <th className="px-6 py-4 text-right">Coût Réel (Achat HT)</th>
                <th className="px-6 py-4 text-right">Prix Client (Vente HT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold text-slate-800">
              {[
                { label: 'Fournitures', icon: Calculator, achat: fournituresTotal, vente: fournituresTotal * marginCoeff, color: 'text-blue-500' },
                { label: 'Cuisine', icon: ChefHat, achat: amtCuisine, vente: amtCuisine * marginCoeff, color: 'text-orange-500' },
                { label: 'Électroménager', icon: Tv, achat: amtElectro, vente: amtElectro * marginCoeff, color: 'text-purple-500' },
                { label: 'Forfait Ameublement', icon: Package, achat: amtAmeublement, vente: amtAmeublement, color: 'text-slate-400', isFixed: true },
                { label: 'Livraison & Logistique', icon: Truck, achat: amtLivraison, vente: amtLivraison, color: 'text-slate-400', isFixed: true },
                { label: 'Montage & Mise en scène', icon: Wrench, achat: amtMontage, vente: amtMontage, color: 'text-slate-400', isFixed: true },
                { label: 'Main d\'œuvre (Niveau)', icon: Ruler, achat: amtSurMesure, vente: amtSurMesure, color: 'text-slate-400', isFixed: true }
              ].map((row, idx) => (
                <tr key={idx} className={row.isFixed ? "bg-slate-50/20" : ""}>
                  <td className="px-6 py-4 flex items-center gap-3 text-xs">
                    <row.icon size={16} className={row.color} /> {row.label}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-400 text-xs">{Math.round(row.achat).toLocaleString()} €</td>
                  <td className={`px-6 py-4 text-right font-mono text-xs ${row.isFixed ? 'text-slate-800' : 'text-blue-600 font-black'}`}>
                    {Math.round(row.vente).toLocaleString()} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SECTION TOTAUX POUR PDF */}
        <div className="hidden print:flex justify-between items-center bg-slate-900 text-white p-8 rounded-2xl total-box">
            <div>
                <p className="text-[8px] font-black uppercase opacity-50 mb-1 tracking-widest">Total Coût Réel HT</p>
                <p className="text-xl font-black">{Math.round(totalAchatHT).toLocaleString()} €</p>
            </div>
            <div className="text-right">
                <p className="text-[8px] font-black uppercase opacity-50 mb-1 tracking-widest">Proposition Client HT</p>
                <p className="text-4xl font-black total-amount">{Math.round(totalVenteHT).toLocaleString()} €</p>
            </div>
        </div>
      </div>

      {/* BARRE FIXE UI (DASHBOARD) */}
      <div className="fixed bottom-8 left-8 right-8 max-w-6xl mx-auto z-40 no-print">
        <div className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 border border-white/10">
          <div className="flex gap-12 items-center">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-500 block mb-1 tracking-widest">Coût Réel (Achat HT)</span>
              <span className="text-2xl font-black font-mono tracking-tighter text-slate-200">{Math.round(totalAchatHT).toLocaleString()} €</span>
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