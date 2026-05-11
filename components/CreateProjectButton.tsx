'use client';

import React, { useState } from 'react';
import { Plus, X, Loader2, Layout, Home, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function CreateProjectButton({ onProjectCreated }: { onProjectCreated: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // États du formulaire
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState(''); // NOUVEAU CHAMP
  const [propertyType, setPropertyType] = useState('T2');
  const [productType, setProductType] = useState("IMMO'MALIN");
  const [packageType, setPackageType] = useState('LLD');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !clientName) return alert("Nom du projet et Nom du client requis");
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('projects').insert({
        name,
        client_name: clientName, // Insertion du nom du client
        property_type: propertyType,
        product_type: productType,
        package_type: packageType,
        decorator_id: user?.id,
        status: 'brouillon'
      });

      if (error) throw error;
      
      setIsOpen(false);
      setName('');
      setClientName('');
      onProjectCreated();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
      >
        <Plus size={18} /> Nouveau Projet
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-8 bg-slate-50 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter italic">Créer un dossier</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Nouveau projet de chiffrage</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-8 space-y-6">
              {/* NOM DU PROJET */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Nom du Projet (ex: Villa Cap d'Ail)</label>
                <input 
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {/* NOM DU CLIENT (NOUVEAU) */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Nom du Client</label>
                <input 
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="M. ou Mme Martin..."
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {/* SÉLECTEURS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Type de Bien</label>
                  <select value={propertyType} onChange={e => setPropertyType(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none cursor-pointer">
                    {['T1', 'T1 Bis', 'T2', 'T3', 'T4', 'T5', 'T6'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Offre</label>
                  <select value={productType} onChange={e => setProductType(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none cursor-pointer">
                    {["IMMO'MALIN", "DECO'MALIN", "RENO'MALIN"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-blue-600 transition-all shadow-xl flex justify-center items-center gap-3 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Générer le dossier"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}