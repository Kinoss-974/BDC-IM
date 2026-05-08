'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Header from '../../../components/Header';
import { 
  Loader2, Clock, FileText, User, ChevronRight, 
  CheckCircle, Calculator, Package, Info
} from 'lucide-react';

export default function AdminDevisPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [pricingGrids, setPricingGrids] = useState<any[]>([]);
  const [globalMargin, setGlobalMargin] = useState<number>(1.25);
  const [loading, setLoading] = useState(true);
  
  // États pour le projet sélectionné
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectItems, setProjectItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    fetchPendingProjects();
  }, []);

  const fetchPendingProjects = async () => {
    setLoading(true);
    // On récupère les projets, les forfaits et la marge
    const { data: projs } = await supabase.from('projects').select('*').eq('status', 'en_attente_devis').order('created_at', { ascending: false });
    const { data: grids } = await supabase.from('pricing_grids').select('*');
    const { data: settings } = await supabase.from('global_settings').select('*');
      
    if (projs) setProjects(projs);
    if (grids) setPricingGrids(grids);
    if (settings) {
      const marginSetting = settings.find((s: any) => s.key === 'default_margin');
      if (marginSetting) setGlobalMargin(parseFloat(marginSetting.value));
    }
    setLoading(false);
  };

  const loadProjectDetails = async (project: any) => {
    setSelectedProject(project);
    setLoadingItems(true);
    
    // On récupère tous les chiffrages détaillés (meubles, fournitures, etc.)
    const { data } = await supabase.from('estimate_items').select('*').eq('project_id', project.id);
      
    setProjectItems(data || []);
    setLoadingItems(false);
  };

  const markAsProcessed = async () => {
    if (!selectedProject) return;
    if (confirm("Valider ce projet ? Il sera marqué comme 'Devis validé' et passera en phase d'achat.")) {
      await supabase.from('projects').update({ status: 'devis_valide' }).eq('id', selectedProject.id);
      setProjects(projects.filter(p => p.id !== selectedProject.id));
      setSelectedProject(null);
    }
  };

  // --- LOGIQUE MATHÉMATIQUE (Idem Page Recap) ---
  const getPrice = (cat: string, sub?: string, type?: string) => {
    const entry = pricingGrids.find(p => p.category === cat && (!sub || p.sub_category === sub) && (!type || p.property_type === type));
    return entry ? parseFloat(entry.price) || 0 : 0;
  };

  const activeMargin = parseFloat(selectedProject?.margin) || globalMargin;
  const pType = selectedProject?.property_type || '';
  const packType = selectedProject?.package_type || '';
  const prodType = selectedProject?.product_type || '';
  const moLevel = selectedProject?.mo_level || '';

  // Calcul du total Fournitures pures
  const fournituresTotal = projectItems
    .filter(i => i.category?.toLowerCase().includes('fourniture'))
    .reduce((acc, item) => acc + (parseFloat(item.unit_price) * parseFloat(item.quantity_to_cover)), 0) || 0;

  // Calcul des forfaits
  const amtAmeublement = getPrice('AMEUBLEMENT', packType, pType);
  const amtCuisine = getPrice('CUISINE', 'Forfait', pType);
  const amtElectro = getPrice('ELECTRO', 'Pack Complet', pType);
  const amtLivraison = getPrice('LIVRAISON', 'Standard', pType);
  const moSub = prodType === "RENO'MALIN" ? "RENO" : "IMMO/DECO";
  const amtMontage = getPrice('MO_PACKAGE', moSub, pType);
  const amtSurMesure = getPrice('MO_SUR_MESURE', moLevel, pType);

  const totalVenteHT = (fournituresTotal + amtCuisine + amtElectro) * activeMargin + amtAmeublement + amtLivraison + amtMontage + amtSurMesure;

  // --- GROUPEMENT DES ÉLÉMENTS DÉTAILLÉS ---
  const groupedItems = projectItems.reduce((acc: any, item) => {
    // On crée des grandes familles propres pour l'affichage
    let mainCategory = 'Autres / Divers';
    if (item.category?.toLowerCase().includes('fourniture')) mainCategory = 'Fournitures & Matériaux';
    if (item.category?.toLowerCase().includes('ameublement')) mainCategory = 'Ameublement (Meubles, Déco...)';
    if (item.category?.toUpperCase() === 'CUISINE') mainCategory = 'Cuisine & Mobilier';
    if (item.category?.toUpperCase() === 'ELECTRO') mainCategory = 'Électroménager';

    if (!acc[mainCategory]) acc[mainCategory] = [];
    acc[mainCategory].push(item);
    return acc;
  }, {});


  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recherche des devis en attente...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 text-slate-900">
      <Header />
      
      <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-6">
        
        {/* TOP BAR */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="bg-amber-500 p-5 rounded-[2rem] text-white shadow-xl shadow-amber-500/20">
              <Clock size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Devis à éditer</h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                {projects.length} projet(s) en attente de traitement
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLONNE DE GAUCHE : LISTE DES PROJETS */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-4">Projets en attente</h2>
            
            {projects.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 p-12 rounded-[2rem] text-center">
                <CheckCircle className="mx-auto text-emerald-400 mb-4" size={32} />
                <p className="font-bold text-slate-500 text-sm">Aucun devis en attente !</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2">Beau travail.</p>
              </div>
            ) : (
              projects.map(proj => (
                <div 
                  key={proj.id} 
                  onClick={() => loadProjectDetails(proj)}
                  className={`p-6 rounded-[2rem] border transition-all cursor-pointer flex flex-col gap-4 ${
                    selectedProject?.id === proj.id 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-600/20' 
                      : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-lg">{proj.name}</h3>
                      <div className="flex items-center gap-2 mt-2 opacity-80">
                        <User size={14} />
                        <span className="text-xs font-bold">{proj.client_name || 'Client Inconnu'}</span>
                      </div>
                    </div>
                    <ChevronRight size={20} className={selectedProject?.id === proj.id ? 'text-white' : 'text-slate-300'} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* COLONNE DE DROITE : DÉTAILS DU PROJET SÉLECTIONNÉ */}
          <div className="lg:col-span-8">
            {!selectedProject ? (
              <div className="h-full min-h-[400px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center p-8 text-center">
                <FileText className="text-slate-300 mb-4" size={48} />
                <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Sélectionnez un projet<br/>pour voir le détail du chiffrage</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header du détail */}
                <div className="bg-slate-900 p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Détail du projet</p>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">{selectedProject.name}</h2>
                    <p className="text-sm font-bold opacity-80 mt-1">Client : {selectedProject.client_name || 'N/C'}</p>
                  </div>
                  <button 
                    onClick={markAsProcessed}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
                  >
                    <CheckCircle size={18} /> VALIDER LE PROJET
                  </button>
                </div>

                <div className="p-8 space-y-8">
                  {loadingItems ? (
                    <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>
                  ) : (
                    <>
                      {/* BLOC 1 : SYNTHÈSE GLOBALE (RÉCAPITULATIF) */}
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                        <div className="flex items-center gap-2 mb-4 text-blue-600">
                            <Calculator size={18} />
                            <h3 className="font-black uppercase tracking-widest text-xs text-slate-700">Synthèse Globale à facturer</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-100"><span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Fournitures (Vente)</span><span className="font-black text-sm">{Math.round(fournituresTotal * activeMargin)} €</span></div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100"><span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Cuisine (Forfait)</span><span className="font-black text-sm">{Math.round(amtCuisine * activeMargin)} €</span></div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100"><span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Électro (Forfait)</span><span className="font-black text-sm">{Math.round(amtElectro * activeMargin)} €</span></div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100"><span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Ameublement (Forfait)</span><span className="font-black text-sm">{Math.round(amtAmeublement)} €</span></div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100"><span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Livraison</span><span className="font-black text-sm">{Math.round(amtLivraison)} €</span></div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100"><span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Montage</span><span className="font-black text-sm">{Math.round(amtMontage)} €</span></div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100"><span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Main d'oeuvre</span><span className="font-black text-sm">{Math.round(amtSurMesure)} €</span></div>
                        </div>
                        <div className="flex justify-between items-center bg-blue-600 text-white p-6 rounded-2xl shadow-lg">
                            <span className="font-black uppercase text-[10px] tracking-widest opacity-80">Prix Client Proposé (Vente HT)</span>
                            <span className="text-3xl font-black italic">{Math.round(totalVenteHT).toLocaleString()} €</span>
                        </div>
                      </div>

                      {/* BLOC 2 : DÉTAIL DES LIGNES (MEUBLES, PEINTURE, ETC) */}
                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 mb-6">
                            <Package size={18} className="text-blue-500" />
                            <h3 className="font-black uppercase tracking-widest text-xs text-slate-700">Détail des éléments saisis</h3>
                        </div>

                        {projectItems.length === 0 ? (
                          <div className="bg-amber-50 text-amber-700 p-6 rounded-2xl flex gap-3 text-sm font-bold">
                            <Info size={20} />
                            <p>Aucun élément détaillé n'a été saisi par la décoratrice. Seuls les forfaits s'appliquent pour ce projet.</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {Object.keys(groupedItems).sort().map((categoryGroup) => {
                              const itemsInGroup = groupedItems[categoryGroup];
                              const totalGroupHT = itemsInGroup.reduce((acc: number, item: any) => acc + ((parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity_to_cover) || 1)), 0);

                              return (
                                <div key={categoryGroup} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                  <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                                    <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">{categoryGroup}</h4>
                                    <span className="text-[9px] font-black text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                                      Total Achat HT : {Math.round(totalGroupHT).toLocaleString()} €
                                    </span>
                                  </div>
                                  
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                          <th className="py-2 px-4">Désignation</th>
                                          <th className="py-2 px-4">Sous-rubrique</th>
                                          <th className="py-2 px-4 text-center">Qté</th>
                                          <th className="py-2 px-4 text-right">Prix U. HT</th>
                                          <th className="py-2 px-4 text-right">Total HT</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50">
                                        {itemsInGroup.map((item: any) => (
                                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-700">{item.name}</td>
                                            <td className="py-3 px-4 text-[10px] text-slate-400 uppercase">{item.category}</td>
                                            <td className="py-3 px-4 text-center font-black">{item.quantity_to_cover}</td>
                                            <td className="py-3 px-4 text-right text-slate-500">{item.unit_price} €</td>
                                            <td className="py-3 px-4 text-right font-black text-slate-900">{Math.round((item.unit_price || 0) * (item.quantity_to_cover || 1))} €</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}