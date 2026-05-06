'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Header from '../../../components/Header';
import { Tv, Plus, Trash2, Loader2, Package, Tag } from 'lucide-react';

export default function AdminElectroPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États pour le formulaire d'ajout
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => { fetchCatalog(); }, []);

  const fetchCatalog = async () => {
    setLoading(true);
    const { data } = await supabase.from('pricing_grids').select('*').eq('category', 'ELECTRO').order('item_type', { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  const addArticle = async () => {
    if (!newName || !newPrice) return;
    const { error } = await supabase.from('pricing_grids').insert([{
      category: 'ELECTRO', sub_category: newName, property_type: 'Tous', price: parseFloat(newPrice), item_type: 'ARTICLE'
    }]);
    if (!error) {
      setNewName(''); setNewPrice('');
      fetchCatalog();
    }
  };

  const deleteItem = async (id: string) => {
    await supabase.from('pricing_grids').delete().eq('id', id);
    fetchCatalog();
  };

  const forfaits = items.filter(i => i.item_type === 'FORFAIT');
  const articles = items.filter(i => i.item_type === 'ARTICLE');

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Header />
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="bg-purple-600 p-4 rounded-3xl text-white"><Tv size={28} /></div>
          <div>
            <h1 className="text-2xl font-black uppercase text-slate-900">Base de Prix Électroménager</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Forfaits par bien & Catalogue d'articles</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* SECTION FORFAITS (Automatiques) */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><Package size={16}/> Forfaits par Typologie</h2>
            <div className="space-y-3">
              {forfaits.map(f => (
                <div key={f.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-700">Pack {f.property_type}</span>
                  <span className="font-black text-purple-600">{f.price} €</span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION CATALOGUE (Au détail) */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><Tag size={16}/> Catalogue d'appareils</h2>
            
            {/* Formulaire d'ajout rapide */}
            <div className="flex gap-2">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Four..." className="flex-1 bg-slate-50 p-3 rounded-xl font-bold text-sm outline-none" />
              <input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" placeholder="Prix €" className="w-24 bg-slate-50 p-3 rounded-xl font-black text-sm outline-none text-right" />
              <button onClick={addArticle} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-purple-600 transition-colors"><Plus size={20}/></button>
            </div>

            <div className="space-y-2">
              {articles.map(a => (
                <div key={a.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl group transition-colors">
                  <span className="font-bold text-slate-700 text-sm">{a.sub_category}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-slate-500">{a.price} €</span>
                    <button onClick={() => deleteItem(a.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}