'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Header from '../../../components/Header';
import { 
  Loader2, Archive, RotateCcw, Trash2, 
  User, ChevronRight, Inbox
} from 'lucide-react';
import Link from 'next/link';

export default function AdminArchivePage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchivedProjects();
  }, []);

  const fetchArchivedProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('is_archived', true)
      .order('updated_at', { ascending: false });
      
    if (data) setProjects(data);
    setLoading(false);
  };

  const restoreProject = async (id: string) => {
    if (confirm("Restaurer ce projet vers le dashboard ?")) {
      await supabase.from('projects').update({ is_archived: false }).eq('id', id);
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  const deletePermanently = async (id: string) => {
    if (confirm("Supprimer DÉFINITIVEMENT ce projet ? Cette action est irréversible.")) {
      await supabase.from('projects').delete().eq('id', id);
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <span className="text-[10px] font-black uppercase text-slate-400">Chargement des archives...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Header />
      
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-6">
            <div className="bg-slate-900 p-5 rounded-[2rem] text-white shadow-xl shadow-slate-200">
              <Archive size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Projets Archivés</h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                {projects.length} projet(s) dans la corbeille
              </p>
            </div>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 p-20 rounded-[3rem] text-center">
            <Inbox className="mx-auto text-slate-200 mb-4" size={64} />
            <p className="text-slate-400 font-bold uppercase text-sm tracking-widest">L'archive est vide</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((proj) => (
              <div key={proj.id} className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-lg text-slate-900 uppercase italic tracking-tighter">{proj.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-slate-400">
                      <User size={14} />
                      <span className="text-xs font-bold">{proj.client_name || 'N/C'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => restoreProject(proj.id)}
                      className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                      title="Restaurer"
                    >
                      <RotateCcw size={18} />
                    </button>
                    <button 
                      onClick={() => deletePermanently(proj.id)}
                      className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-100"
                      title="Supprimer définitivement"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <span className="text-[9px] font-black uppercase px-2 py-1 bg-slate-50 text-slate-400 rounded-lg">{proj.property_type}</span>
                  <span className="text-[9px] font-black uppercase px-2 py-1 bg-slate-50 text-slate-400 rounded-lg">{proj.status}</span>
                </div>

                <Link 
                  href={`/project/${proj.id}/recap`}
                  className="flex items-center justify-between w-full p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group/btn"
                >
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Consulter en lecture seule</span>
                  <ChevronRight size={16} className="text-slate-300 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}