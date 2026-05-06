'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Header from '../../../components/Header';
import { 
  Save, Loader2, Settings, Percent, Truck, Wrench, Sofa, 
  Ruler, Plus, Trash2, ChefHat, Tv, Info 
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('marge');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [margin, setMargin] = useState(1.25);
  const [grids, setGrids] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: settings } = await supabase.from('global_settings').select('*');
    const { data: gridData } = await supabase.from('pricing_grids').select('*').order('property_type', { ascending: true });
    
    if (settings) {
      const m = settings.find(s => s.key === 'default_margin');
      if (m) setMargin(m.value);
    }
    if (gridData) setGrids(gridData);
    setLoading(false);
  };

  const handleUpdate = (id: string, field: string, value: any) => {
    setGrids(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const addLine = (category: string) => {
    const newLine = { id: crypto.randomUUID(), category, sub_category: 'Standard', property_type: 'T1', price: 0 };
    setGrids([...grids, newLine]);
  };

  const deleteLine = (id: string) => setGrids(grids.filter(g => g.id !== id));

  const saveAll = async () => {
    setSaving(true);
    await supabase.from('global_settings').upsert({ key: 'default_margin', value: margin });
    const cleanGrids = grids.map(({ created_at, updated_at, id, ...rest }) => rest);
    await supabase.from('pricing_grids').delete().neq('category', 'PROTECT');
    const { error } = await supabase.from('pricing_grids').insert(cleanGrids);
    if (!error) {
      alert("✅ Configuration mise à jour !");
      fetchData();
    }
    setSaving(false);
  };

  const renderTable = (categoryName: string, showSub: boolean = true) => {
    const filtered = grids.filter(g => g.category === categoryName);
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">{categoryName}</h3>
            {categoryName === 'MO_SUR_MESURE' && (
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">N1 = 0 élém. | N2 = 1 élém. | N3 = 2 élém.</p>
            )}
          </div>
          <button onClick={() => addLine(categoryName)} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-blue-600 transition-all">
            <Plus size={14} /> Ajouter un tarif
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {filtered.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm group">
              {showSub && (
                <div className="relative">
                   <input 
                    value={item.sub_category || ''} 
                    onChange={e => handleUpdate(item.id, 'sub_category', e.target.value)}
                    className={`border-2 p-2 rounded-xl text-[10px] font-black w-32 outline-none transition-colors ${
                      item.sub_category?.includes('Niveau 1') ? 'border-slate-100 text-slate-400' : 
                      item.sub_category?.includes('Niveau 2') ? 'border-blue-100 text-blue-600' : 
                      item.sub_category?.includes('Niveau 3') ? 'border-orange-100 text-orange-600' : 'border-slate-100'
                    }`}
                  />
                </div>
              )}
              <input 
                value={item.property_type || ''} 
                onChange={e => handleUpdate(item.id, 'property_type', e.target.value)}
                className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-[10px] font-black w-20 text-center outline-none"
              />
              <div className="flex-1 flex items-center gap-2">
                <input 
                  type="number" 
                  value={item.price} 
                  onChange={e => handleUpdate(item.id, 'price', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-100 p-2 rounded-xl text-right font-black text-slate-800 outline-none"
                />
                <span className="font-bold text-slate-300 text-xs">€</span>
              </div>
              <button onClick={() => deleteLine(item.id)} className="text-slate-200 hover:text-red-500 p-2"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header />
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        
        <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-xl shadow-blue-100"><Settings size={28} /></div>
            <h1 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Tarifs & Forfaits</h1>
          </div>
          <button onClick={saveAll} disabled={saving} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl">
            {saving ? <Loader2 className="animate-spin" /> : <Save />} SAUVEGARDER
          </button>
        </div>

        <div className="flex gap-2 bg-white p-2 rounded-[2rem] border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
          {[
            { id: 'marge', icon: Percent, label: 'Marge' },
            { id: 'AMEUBLEMENT', icon: Sofa, label: 'Ameublement' },
            { id: 'CUISINE', icon: ChefHat, label: 'Cuisine' },
            { id: 'ELECTRO', icon: Tv, label: 'Électro' },
            { id: 'LIVRAISON', icon: Truck, label: 'Livraison' },
            { id: 'MO_PACKAGE', icon: Wrench, label: 'Montage' },
            { id: 'MO_SUR_MESURE', icon: Ruler, label: 'Sur Mesure' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm p-10 min-h-[500px]">
          {activeTab === 'marge' && (
            <div className="max-w-xs space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Coeff. de marge global</label>
              <input type="number" step="0.01" value={margin} onChange={e => setMargin(parseFloat(e.target.value))} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-5xl font-black text-blue-600 outline-none" />
              <div className="flex gap-2 items-center text-slate-400 bg-slate-50 p-4 rounded-2xl">
                <Info size={16} />
                <p className="text-[10px] font-bold">Exemple: 1.25 applique +25% sur les prix d'achat.</p>
              </div>
            </div>
          )}
          {activeTab === 'AMEUBLEMENT' && renderTable('AMEUBLEMENT')}
          {activeTab === 'CUISINE' && renderTable('CUISINE')}
          {activeTab === 'ELECTRO' && renderTable('ELECTRO')}
          {activeTab === 'LIVRAISON' && renderTable('LIVRAISON', false)}
          {activeTab === 'MO_PACKAGE' && renderTable('MO_PACKAGE')}
          {activeTab === 'MO_SUR_MESURE' && renderTable('MO_SUR_MESURE')}
        </div>
      </div>
    </div>
  );
}