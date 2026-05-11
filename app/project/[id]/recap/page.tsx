'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { 
  Loader2, Calculator, Home, Package, ChefHat, Tv, 
  Truck, Wrench, Ruler, Briefcase, Printer, AlertTriangle, CheckCircle2,
  User as UserIcon, Lock, Unlock
} from 'lucide-react';

export default function RecapPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [pricing, setPricing] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]); 
  const [purchases, setPurchases] = useState<any[]>([]);
  const [globalMargin, setGlobalMargin] = useState<number>(1.25);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // 1. Récupération du rôle utilisateur
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setUserRole(profile?.role || 'DECORATRICE');
      }

      // 2. Récupération des données
      const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
      const { data: grid } = await supabase.from('pricing_grids').select('*');
      const { data: settings } = await supabase.from('global_settings').select('*');
      const { data: savedItems } = await supabase.from('estimate_items').select('*').eq('project_id', projectId);
      const { data: achats } = await supabase.from('purchase_items').select('*').eq('project_id', projectId);
      
      if (settings) {
        const marginSetting = settings.find(s => s.key === 'default_margin');
        if (marginSetting) setGlobalMargin(parseFloat(marginSetting.value));
      }

      setProject(proj);
      setPricing(grid || []);
      setItems(savedItems || []);
      setPurchases(achats || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const getLotTotalChiffrage = (catName: string) => items
    .filter(i => i.category?.toLowerCase().includes(catName.toLowerCase()))
    .reduce((acc, i) => acc + (parseFloat(i.unit_price) * parseFloat(i.quantity_to_cover) || 0), 0);

  const getLotTotalAchatReel = (catName: string) => purchases
    .filter(p => p.category?.toLowerCase().includes(catName.toLowerCase()))
    .reduce((acc, p) => acc + (parseFloat(p.total_ht) || 0), 0);

  const getGridPrice = (cat: string, sub?: string, type?: string) => {
    const entry = pricing.find(p => p.category === cat && (!sub || p.sub_category === sub) && (!type || p.property_type === type));
    return entry ? parseFloat(entry.price) || 0 : 0;
  };

  const updateProject = async (updates: any) => {
    // Sécurité supplémentaire : on bloque l'update si verrouillé et non admin
    const statusBlocked = ['devis_valide', 'devis_traite', 'termine'].includes(project.status);
    if (statusBlocked && userRole !== 'ADMIN') return;

    setProject((prev: any) => ({ ...prev, ...updates }));
    await supabase.from('projects').update(updates).eq('id', projectId);
  };

  const handlePrintAndSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (project.status === 'brouillon' || !project.status) {
        const marginToSave = project?.margin || globalMargin;
        await supabase.from('projects').update({ status: 'en_attente_devis', margin: marginToSave }).eq('id', projectId);
        setProject((prev: any) => ({ ...prev, status: 'en_attente_devis' }));
      }
      setTimeout(() => { window.print(); }, 500);
    } catch (err: any) { alert(err.message); }
    finally { setIsSubmitting(false); }
  };

  const handleFinishProject = async () => {
    if (!confirm("Clôturer le dossier ? Toutes les données seront définitivement verrouillées.")) return;
    setIsSubmitting(true);
    try {
      await supabase.from('projects').update({ status: 'termine' }).eq('id', projectId);
      setProject((prev: any) => ({ ...prev, status: 'termine' }));
    } catch (err: any) { alert(err.message); }
    finally { setIsSubmitting(false); }
  };

  const handleUnlockProject = async () => {
    if (!confirm("Réouvrir ce dossier ?")) return;
    try {
      await supabase.from('projects').update({ status: 'devis_traite' }).eq('id', projectId);
      setProject((prev: any) => ({ ...prev, status: 'devis_traite' }));
    } catch (err: any) { alert(err.message); }
  };

  if (loading || !project) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  const isAdmin = userRole === 'ADMIN';
  const isFinished = project.status === 'termine';
  // Le verrouillage pour les décoratrices s'applique dès 'devis_valide'
  const isLockedForDecorator = ['devis_valide', 'devis_traite', 'termine'].includes(project.status);
  const showPurchases = ['devis_valide', 'devis_traite', 'termine'].includes(project.status);

  const activeMargin = parseFloat(project.margin) || globalMargin;

  const rows = [
    { label: 'Fournitures', icon: Calculator, budget: getLotTotalChiffrage('Fourniture'), vente: getLotTotalChiffrage('Fourniture') * activeMargin, depense: getLotTotalAchatReel('Fourniture'), color: 'bg-blue-600' },
    { label: 'Cuisine', icon: ChefHat, budget: project.is_cuisine_cuisiniste ? 0 : (getLotTotalChiffrage('Cuisine') || getGridPrice('CUISINE', 'Forfait', project.property_type) / activeMargin), vente: project.is_cuisine_cuisiniste ? 0 : (getLotTotalChiffrage('Cuisine') * activeMargin || getGridPrice('CUISINE', 'Forfait', project.property_type)), depense: getLotTotalAchatReel('Cuisine'), color: 'bg-orange-500' },
    { label: 'Électroménager', icon: Tv, budget: project.is_electro_cuisiniste ? 0 : (getLotTotalChiffrage('Electro') || getGridPrice('ELECTRO', 'Pack Complet', project.property_type) / activeMargin), vente: project.is_electro_cuisiniste ? 0 : (getLotTotalChiffrage('Electro') * activeMargin || getGridPrice('ELECTRO', 'Pack Complet', project.property_type)), depense: getLotTotalAchatReel('Electro'), color: 'bg-purple-500' },
    { label: 'Ameublement', icon: Package, budget: (getLotTotalChiffrage('Ameublement') || getGridPrice('AMEUBLEMENT', project.package_type, project.property_type) / activeMargin), vente: (getLotTotalChiffrage('Ameublement') * activeMargin || getGridPrice('AMEUBLEMENT', project.package_type, project.property_type)), depense: getLotTotalAchatReel('Ameublement'), color: 'bg-indigo-600' },
    { label: 'Logistique', icon: Truck, budget: getGridPrice('LIVRAISON', 'Standard', project.property_type), vente: getGridPrice('LIVRAISON', 'Standard', project.property_type), depense: getLotTotalAchatReel('Livraison'), color: 'bg-slate-500' },
    { label: 'Montage', icon: Wrench, budget: getGridPrice('MO_PACKAGE', project.product_type === "RENO'MALIN" ? "RENO" : "IMMO/DECO", project.property_type), vente: getGridPrice('MO_PACKAGE', project.product_type === "RENO'MALIN" ? "RENO" : "IMMO/DECO", project.property_type), depense: getLotTotalAchatReel('Montage'), color: 'bg-slate-500' },
    { label: 'Main d’œuvre', icon: Ruler, budget: getGridPrice('MO_SUR_MESURE', project.mo_level, project.property_type), vente: getGridPrice('MO_SUR_MESURE', project.mo_level, project.property_type), depense: getLotTotalAchatReel('Main'), color: 'bg-slate-500' }
  ];

  const totalVenteHT = rows.reduce((acc, row) => acc + row.vente, 0);
  const totalBudgetAchatHT = rows.reduce((acc, row) => acc + row.budget, 0);
  const totalDepenseReelleHT = rows.reduce((acc, row) => acc + row.depense, 0);

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-40 font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 10mm; }
          header, .no-print, nav, button, .fixed-footer-recap { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .print-container { padding: 0 !important; max-width: 100% !important; zoom: 0.85; }
          .recap-card { border: 1px solid #eee !important; box-shadow: none !important; border-radius: 12px !important; }
        }
      `}} />

      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8 print-container">
        
        {/* HEADER ACTIONS */}
        <div className="flex justify-between items-end no-print">
          <div>
            <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] mb-2">Finance & Pilotage</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Synthèse du Projet</h1>
          </div>
          <div className="flex gap-3">
            {/* BOUTON CLOTURER : Visible si phase achat et non terminé */}
            {(project.status === 'devis_valide' || project.status === 'devis_traite') && (
              <button onClick={handleFinishProject} className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all">
                <CheckCircle2 size={16} /> Clôturer le dossier
              </button>
            )}

            {/* BOUTON ADMIN REOUVRIR : Uniquement pour ADMIN si terminé */}
            {isFinished && isAdmin && (
              <button onClick={handleUnlockProject} className="flex items-center gap-2 px-6 py-3.5 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all">
                <Unlock size={16} /> Admin : Réouvrir
              </button>
            )}

            <button onClick={handlePrintAndSubmit} className="flex items-center gap-3 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:scale-105 transition-all shadow-2xl">
              <Printer size={16} /> Imprimer
            </button>
          </div>
        </div>

        {/* INFO CARD */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row justify-between items-center gap-8 recap-card relative">
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 ${isFinished ? 'bg-emerald-600' : 'bg-slate-900'} rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl transition-all`}>
              {isFinished ? <CheckCircle2 size={28} /> : <Briefcase size={28} />}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{project.name}</h3>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                  isFinished ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  project.status === 'en_attente_devis' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                  {project.status?.replace(/_/g, ' ') || 'Brouillon'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase flex items-center gap-2">
                <UserIcon size={12} /> Client : <span className="text-slate-600">{project.client_name || 'N/C'}</span>
              </p>
            </div>
          </div>

          {/* SELECTS VERROUILLABLES */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 no-print">
             {[
               { label: 'Bien', value: project.property_type, key: 'property_type', options: ['T1', 'T1 Bis', 'T2', 'T3', 'T4', 'T5', 'T6'], icon: Home },
               { label: 'Pack', value: project.package_type, key: 'package_type', options: ['LLD', 'SAISONNIER'], icon: Package },
               { label: 'Produit', value: project.product_type, key: 'product_type', options: ["IMMO'MALIN", "DECO'MALIN", "RENO'MALIN"], icon: Briefcase },
               { label: 'Niveau', value: project.mo_level, key: 'mo_level', options: ['Niveau 1', 'Niveau 2', 'Niveau 3'], icon: Ruler }
             ].map((cfg, i) => (
               <div key={i} className={`bg-slate-50/50 p-3 rounded-2xl border border-slate-100 min-w-[105px] ${isLockedForDecorator && !isAdmin ? 'opacity-60' : ''}`}>
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <cfg.icon size={10} /> {cfg.label}
                  </p>
                  <select 
                    disabled={isLockedForDecorator && !isAdmin}
                    value={cfg.value || ''} 
                    onChange={e => updateProject({ [cfg.key]: e.target.value })} 
                    className={`bg-transparent text-xs font-black w-full outline-none appearance-none text-slate-800 ${isLockedForDecorator && !isAdmin ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <option value="">...</option>
                    {cfg.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
               </div>
             ))}
          </div>
        </div>

        {/* TABLEAU */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden recap-card">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr>
                <th className="px-8 py-6">Désignation</th>
                <th className="px-8 py-6 text-center">Budget Achat</th>
                <th className="px-8 py-6 text-center">Prix Vente HT</th>
                {showPurchases && <th className="px-8 py-6 text-right">Dépense Réelle</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-bold">
              {rows.map((row, idx) => {
                const isOverBudget = row.depense > row.budget;
                return (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-5 flex items-center gap-5">
                      <div className={`w-10 h-10 rounded-2xl ${row.color} flex items-center justify-center text-white shadow-lg`}>
                        <row.icon size={18} />
                      </div> 
                      <span className="text-slate-800 font-black uppercase text-[11px]">{row.label}</span>
                    </td>
                    <td className="px-8 py-5 text-center font-mono text-slate-400 text-xs">
                      {Math.round(row.budget).toLocaleString()} €
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-xl font-black text-xs">
                        {Math.round(row.vente).toLocaleString()} €
                      </span>
                    </td>
                    {showPurchases && (
                      <td className="px-8 py-5 text-right">
                         <div className={`flex items-center justify-end gap-2 text-sm font-black ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                           {isOverBudget && <AlertTriangle size={14} className="animate-pulse" />}
                           {Math.round(row.depense).toLocaleString()} €
                         </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER DASHBOARD */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 no-print fixed-footer-recap z-50">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl flex flex-col md:flex-row justify-between items-center text-white border border-white/10 backdrop-blur-xl">
          <div className="flex gap-12">
            <div>
              <p className="text-[9px] uppercase text-slate-500 font-black tracking-widest mb-1">Budget Achat</p>
              <p className="text-2xl font-black tracking-tighter">{Math.round(totalBudgetAchatHT).toLocaleString()} €</p>
            </div>
            {showPurchases && (
              <div>
                <p className="text-[9px] uppercase text-slate-500 font-black tracking-widest mb-1">Dépense Réelle</p>
                <p className={`text-2xl font-black tracking-tighter ${totalDepenseReelleHT > totalBudgetAchatHT ? 'text-red-600' : 'text-emerald-400'}`}>
                  {Math.round(totalDepenseReelleHT).toLocaleString()} €
                </p>
              </div>
            )}
            <div>
              <p className="text-[9px] uppercase text-slate-500 font-black tracking-widest mb-1">Marge Brute HT</p>
              <p className="text-2xl font-black text-blue-400 tracking-tighter">{Math.round(totalVenteHT - totalBudgetAchatHT).toLocaleString()} €</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-blue-400 font-black mb-1 tracking-[0.3em]">Offre Client HT</p>
            <p className="text-5xl font-black tracking-tighter italic">
              {Math.round(totalVenteHT).toLocaleString()} <span className="text-xl text-slate-500 font-medium tracking-normal not-italic ml-1">€</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}