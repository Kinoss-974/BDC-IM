'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Header from '../../../components/Header';
import { 
  Loader2, Plus, Trash2, Search, Database, 
  Filter, Edit2, Check, X 
} from 'lucide-react';

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Limite d'affichage (50 par défaut, modifiable par l'utilisateur)
  const [displayLimit, setDisplayLimit] = useState<number>(50);
  
  // États pour le filtrage
  const [filters, setFilters] = useState({
    category: '',
    property_type: '',
    product_type: '',
    package_type: ''
  });

  // État pour l'édition
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    // On augmente la limite de fetch à 10000 pour être sûr d'avoir toute ta base
    const { data } = await supabase.from('pack_templates').select('*').limit(10000).order('category', { ascending: true });
    if (data) setTemplates(data);
    setLoading(false);
  };

  // --- ACTIONS ---
  const startEdit = (template: any) => {
    setEditingId(template.id);
    setEditForm({ ...template });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    const { error } = await supabase.from('pack_templates').update(editForm).eq('id', editingId);
    if (!error) {
      setTemplates(templates.map(t => t.id === editingId ? editForm : t));
      setEditingId(null);
    } else {
      alert("Erreur lors de la sauvegarde");
    }
  };

  const deleteTemplate = async (id: string) => {
    if (confirm("Supprimer cet élément ?")) {
      await supabase.from('pack_templates').delete().eq('id', id);
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  // --- LOGIQUE DE FILTRAGE ---
  const filteredTemplates = templates.filter(t => {
    const matchSearch = t.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = filters.category === '' || t.category === filters.category;
    const matchBien = filters.property_type === '' || t.property_type === filters.property_type;
    const matchGamme = filters.product_type === '' || t.product_type === filters.product_type;
    const matchFormule = filters.package_type === '' || t.package_type === filters.package_type;
    return matchSearch && matchCat && matchBien && matchGamme && matchFormule;
  });

  // Extraction des options uniques pour les filtres
  const getOptions = (key: string) => Array.from(new Set(templates.map(t => t[key]).filter(Boolean))).sort();

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 text-slate-900">
      <Header />
      
      <div className="max-w-[1600px] mx-auto p-8 space-y-6">
        
        {/* TOP BAR */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 flex flex-wrap justify-between items-center gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-3 rounded-2xl text-white"><Database size={24} /></div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter">Matrice Globale</h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{filteredTemplates.length} éléments correspondants</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                placeholder="Rechercher une désignation..."
                className="pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 w-80"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* FILTERS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['category', 'property_type', 'product_type', 'package_type'].map((key) => (
            <div key={key} className="bg-white p-2 rounded-2xl border border-slate-200 flex items-center gap-2">
              <Filter size={14} className="ml-2 text-slate-400" />
              <select 
                className="w-full bg-transparent p-2 text-[10px] font-black uppercase outline-none"
                value={filters[key as keyof typeof filters]}
                onChange={e => setFilters({...filters, [key]: e.target.value})}
              >
                <option value="">{key.replace('_', ' ')} (Tous)</option>
                {getOptions(key).map(opt => <option key={opt} value={opt as string}>{opt as string}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-200">
                  <th className="p-5 w-48">Catégorie</th>
                  <th className="p-5">Désignation</th>
                  <th className="p-5 w-24">Bien</th>
                  <th className="p-5 w-32">Gamme</th>
                  <th className="p-5 w-40">Formule</th>
                  <th className="p-5 w-24 text-center">Qté</th>
                  <th className="p-5 w-32 text-right">Prix HT</th>
                  <th className="p-5 w-32 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr><td colSpan={8} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
                ) : (
                  filteredTemplates.slice(0, displayLimit).map((t) => (
                    <tr key={t.id} className={`group transition-colors ${editingId === t.id ? 'bg-blue-50' : 'hover:bg-slate-50/50'}`}>
                      
                      {/* CATEGORY */}
                      <td className="p-4">
                        {editingId === t.id ? (
                          <input className="w-full p-2 rounded-lg border border-blue-200 text-xs font-bold" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} />
                        ) : (
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                            t.category?.toLowerCase().includes('fourniture') 
                              ? 'bg-orange-100 text-orange-600 border border-orange-200' 
                              : 'bg-blue-100 text-blue-600 border border-blue-200'
                          }`}>
                            {t.category}
                          </span>
                        )}
                      </td>

                      {/* NAME */}
                      <td className="p-4 font-bold">
                        {editingId === t.id ? (
                          <input className="w-full p-2 rounded-lg border border-blue-200" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                        ) : t.name}
                      </td>

                      {/* BIEN */}
                      <td className="p-4">
                        {editingId === t.id ? (
                          <input className="w-full p-2 rounded-lg border border-blue-200 text-center" value={editForm.property_type} onChange={e => setEditForm({...editForm, property_type: e.target.value})} />
                        ) : <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">{t.property_type}</span>}
                      </td>

                      {/* GAMME (Product Type) */}
                      <td className="p-4 font-black text-purple-600 text-[10px] uppercase">
                        {editingId === t.id ? (
                          <input className="w-full p-2 rounded-lg border border-blue-200" value={editForm.product_type} onChange={e => setEditForm({...editForm, product_type: e.target.value})} />
                        ) : t.product_type}
                      </td>

                      {/* FORMULE (Package Type) */}
                      <td className="p-4 font-black text-emerald-600 text-[10px] uppercase">
                        {editingId === t.id ? (
                          <input className="w-full p-2 rounded-lg border border-blue-200" value={editForm.package_type} onChange={e => setEditForm({...editForm, package_type: e.target.value})} />
                        ) : t.package_type || t.location}
                      </td>

                      {/* QTY */}
                      <td className="p-4 text-center">
                        {editingId === t.id ? (
                          <input type="number" className="w-16 p-2 rounded-lg border border-blue-200 text-center" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: e.target.value})} />
                        ) : <span className="font-black text-slate-500">{t.quantity}</span>}
                      </td>

                      {/* PRICE */}
                      <td className="p-4 text-right font-black">
                        {editingId === t.id ? (
                          <input type="number" className="w-24 p-2 rounded-lg border border-blue-200 text-right" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} />
                        ) : `${t.price || 0} €`}
                      </td>

                      {/* ACTIONS */}
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          {editingId === t.id ? (
                            <>
                              <button onClick={saveEdit} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-lg shadow-emerald-100"><Check size={16}/></button>
                              <button onClick={cancelEdit} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"><X size={16}/></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(t)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16}/></button>
                              <button onClick={() => deleteTemplate(t.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* BARRE DE PIED DE PAGE : GESTION DE L'AFFICHAGE */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-4">
            <span className="text-xs font-bold text-slate-500">
              Affichage de {Math.min(displayLimit, filteredTemplates.length)} résultats sur un total de {filteredTemplates.length}
            </span>
            
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Lignes par page :</span>
              <select 
                value={displayLimit} 
                onChange={(e) => setDisplayLimit(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer shadow-sm"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={10000}>TOUTES</option>
              </select>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}