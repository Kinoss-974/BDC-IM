'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Header from '../../../components/Header';
import { 
  Plus, Trash2, Save, Loader2, Sofa, 
  Search, Filter, ChevronRight, Edit2, X, Check, Briefcase, Package, Home 
} from 'lucide-react';

export default function AdminAmeublementListing() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Nouveaux filtres pour correspondre à ton CSV
  const [filterProduct, setFilterProduct] = useState("IMMO'MALIN");
  const [filterPackage, setFilterPackage] = useState('Forfait LLD');
  const [filterBien, setFilterBien] = useState('T1');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from('pack_templates')
      .select('*')
      .ilike('category', 'Ameublement%')
      .order('category', { ascending: true });
    if (data) setTemplates(data);
    setLoading(false);
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const saveEdit = async () => {
    const { error } = await supabase.from('pack_templates').update(editForm).eq('id', editingId);
    if (!error) {
      setTemplates(templates.map(t => t.id === editingId ? editForm : t));
      setEditingId(null);
    }
  };

  // Logique de filtrage mise à jour avec les 3 critères
  const filtered = templates.filter(t => 
    t.property_type === filterBien && 
    t.package_type === filterPackage &&
    t.product_type === filterProduct
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-7xl mx-auto p-8 space-y-6">
        
        {/* HEADER & FILTRES */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-xl shadow-slate-200">
              <Sofa size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">Matrice Ameublement</h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                {templates.length} articles chargés
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black uppercase text-slate-400 px-1">Produit</span>
              <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} className="bg-white border p-2 rounded-xl font-bold text-[10px] outline-none">
                <option value="IMMO'MALIN">IMMO'MALIN</option>
                <option value="RENO'MALIN">RENO'MALIN</option>
                <option value="DECO'MALIN">DECO'MALIN</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black uppercase text-slate-400 px-1">Gamme</span>
              <select value={filterPackage} onChange={(e) => setFilterPackage(e.target.value)} className="bg-white border p-2 rounded-xl font-bold text-[10px] outline-none">
                <option value="Forfait LLD">Forfait LLD</option>
                <option value="Forfait SAISONNIER">Forfait SAISONNIER</option>
                <option value="Forfait BASIC +">Forfait BASIC +</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black uppercase text-slate-400 px-1">Bien</span>
              <select value={filterBien} onChange={(e) => setFilterBien(e.target.value)} className="bg-white border p-2 rounded-xl font-bold text-[10px] outline-none">
                {['T1', 'T2', 'T3', 'T4', 'T5', 'T6 ou +'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* TABLEAU */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Catégorie</th>
                <th className="px-8 py-5">Nom de l'article</th>
                <th className="px-4 py-5 text-center">Produit</th>
                <th className="px-4 py-5 text-center">Gamme</th>
                <th className="px-4 py-5 text-center">Qté</th>
                <th className="px-6 py-5 text-center">Prix HT</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(item => (
                <tr key={item.id} className="group hover:bg-slate-50/50 transition-all text-xs">
                  <td className="px-8 py-5 font-bold text-blue-600 text-[10px] uppercase">{item.category}</td>
                  <td className="px-8 py-5 font-bold text-slate-700">{item.name}</td>
                  <td className="px-4 py-5 text-center text-[9px] text-slate-400">{item.product_type}</td>
                  <td className="px-4 py-5 text-center text-[9px] text-slate-400">{item.package_type}</td>
                  <td className="px-4 py-5 text-center">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-black">{item.quantity}</span>
                  </td>
                  <td className="px-6 py-5 text-center font-mono text-slate-400">{item.unit_price_ht} €</td>
                  <td className="px-8 py-5 text-right">
                    <button onClick={() => startEdit(item)} className="text-slate-200 hover:text-blue-600 transition-colors">
                      <Edit2 size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-20 text-center text-slate-300 italic">
              Aucun article trouvé pour cette combinaison de filtres.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}