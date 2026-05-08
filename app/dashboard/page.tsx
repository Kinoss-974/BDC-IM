'use client';

import React, { useEffect, useState } from 'react';
import { 
  Clock, ChevronRight, AlertCircle, Loader2, ShieldCheck, 
  User as UserIcon, LayoutGrid, ShoppingBag, Calculator, FileEdit, Archive, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import CreateProjectButton from '../../components/CreateProjectButton';
import Header from '../../components/Header';

interface Project {
  id: string;
  name: string;
  client_name: string | null;
  updated_at: string;
  status: string; 
  decorator_id: string;
  property_type: string;
  product_type: string;
  package_type: string;
  is_archived: boolean;
  profiles?: { email: string };
}

export default function DecoratorDashboard() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setRole(profile?.role || 'DECORATRICE');
    }

    const { data, error: fetchError } = await supabase
      .from('projects')
      .select(`
        id, name, client_name, updated_at, status, decorator_id,
        property_type, product_type, package_type, is_archived,
        profiles!projects_decorator_id_fkey ( email )
      `)
      .filter('is_archived', 'eq', false) // Utilisation de .filter pour éviter l'erreur de type
      .order('updated_at', { ascending: false });

    if (fetchError) setError(fetchError.message);
    else setProjects(data as unknown as Project[]);
    setLoading(false);
  };

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (confirm("Archiver ce projet ?")) {
      const { error } = await supabase.from('projects').update({ is_archived: true } as any).eq('id', id);
      if (!error) setProjects(projects?.filter(p => p.id !== id) || null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (confirm("🚨 Supprimer définitivement ce projet ?")) {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (!error) setProjects(projects?.filter(p => p.id !== id) || null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'en_attente_devis': return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-widest"><Clock size={12} /> En attente devis</span>;
      case 'devis_valide':
      case 'devis_traite': return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-widest"><ShoppingBag size={12} /> Phase Achats</span>;
      default: return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-widest"><FileEdit size={12} /> Brouillon</span>;
    }
  };

  const renderProjectCard = (project: Project, isAchat: boolean) => (
    <div key={project.id} className={`bg-white border rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all group relative flex flex-col ${isAchat ? 'border-emerald-100 hover:border-emerald-300' : 'border-slate-200 hover:border-blue-300'}`}>
      {role === 'ADMIN' && (
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button onClick={(e) => handleArchive(e, project.id)} className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white border border-amber-100"><Archive size={14} /></button>
          <button onClick={(e) => handleDelete(e, project.id)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white border border-red-100"><Trash2 size={14} /></button>
        </div>
      )}
      {role === 'ADMIN' && project.profiles && (
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-4 pb-4 border-b border-slate-50">
          <UserIcon size={14} /> Par <span className={isAchat ? "text-emerald-600" : "text-blue-600"}>{project.profiles.email.split('@')[0]}</span>
        </div>
      )}
      <div className="flex justify-between items-center mb-5">
        {getStatusBadge(project.status)}
        <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(project.updated_at).toLocaleDateString('fr-FR')}</span>
      </div>
      <div className="flex-1 mb-5">
        <h3 className={`text-xl font-black mb-1 uppercase tracking-tighter italic ${isAchat ? 'text-emerald-950' : 'text-slate-900'}`}>{project.name}</h3>
        <p className="text-slate-500 text-xs font-bold uppercase">Client : {project.client_name || 'N/C'}</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[9px] font-black uppercase border border-slate-100">{project.property_type || 'T1'}</span>
        <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[9px] font-black uppercase border border-slate-100">{project.product_type}</span>
        <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[9px] font-black uppercase border border-slate-100">{project.package_type}</span>
      </div>
      <div className="pt-5 border-t border-slate-100 flex justify-between items-center">
        <span className="text-[9px] text-slate-400 uppercase font-black">{isAchat ? 'Ouvrir le suivi' : 'Ouvrir le chiffrage'}</span>
        <Link href={`/project/${project.id}/recap`} className={`p-4 text-white rounded-xl shadow-lg ${isAchat ? 'bg-emerald-600' : 'bg-slate-900'}`}><ChevronRight size={20} /></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans pb-20">
      <Header />
      <div className="max-w-[1600px] mx-auto p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">
              {role === 'ADMIN' ? 'Gestion des Projets' : 'Mes Projets'}
            </h1>
            <p className="text-slate-400 text-xs font-bold uppercase mt-2">{projects?.length || 0} dossier(s) actif(s)</p>
          </div>
          <div className="flex items-center gap-4">
            {role === 'ADMIN' && (
              <Link href="/admin/archive" className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase border border-slate-200">
                <Archive size={14} /> Voir Archives
              </Link>
            )}
            <CreateProjectButton onProjectCreated={loadDashboard} />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400"><Loader2 className="animate-spin mb-4 text-blue-600" size={40} /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6 bg-slate-200/50 p-4 rounded-2xl border border-slate-200">
                 <Calculator className="text-slate-500" />
                 <h2 className="font-black uppercase text-sm text-slate-700">Chiffrages en cours</h2>
                 <span className="ml-auto bg-white text-slate-500 px-3 py-1 rounded-full text-xs font-black">{(projects?.filter(p => !p.status || p.status === 'brouillon' || p.status === 'en_attente_devis') || []).length}</span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {(projects?.filter(p => !p.status || p.status === 'brouillon' || p.status === 'en_attente_devis') || []).map(p => renderProjectCard(p, false))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6 bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                 <ShoppingBag className="text-emerald-600" />
                 <h2 className="font-black uppercase text-sm text-emerald-800">Phase Achats (Validés)</h2>
                 <span className="ml-auto bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-black">{(projects?.filter(p => p.status === 'devis_valide' || p.status === 'devis_traite') || []).length}</span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {(projects?.filter(p => p.status === 'devis_valide' || p.status === 'devis_traite') || []).map(p => renderProjectCard(p, true))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}