'use client';

import React, { useEffect, useState } from 'react';
import { 
  Clock, 
  CheckCircle, 
  FileEdit, 
  ChevronRight, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  User as UserIcon 
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import CreateProjectButton from '../../components/CreateProjectButton';
import Header from '../../components/Header';

// Types
interface EstimateInfo {
  status: 'BROUILLON' | 'SOUMIS' | 'VALIDE' | 'REFUSE';
  total_ht: number;
}

interface ProjectWithEstimates {
  id: string;
  name: string;
  client_name: string | null;
  updated_at: string;
  decorator_id: string;
  estimates: EstimateInfo[];
  profiles?: { email: string }; // Email de la décoratrice pour la vue Admin
}

export default function DecoratorDashboard() {
  const [projects, setProjects] = useState<ProjectWithEstimates[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      
      // 1. Récupérer le rôle de l'utilisateur
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setRole(profile?.role || 'DECORATRICE');
      }

      // 2. Récupérer les projets
      // On utilise une jointure (profiles!decorator_id) pour obtenir l'email du créateur
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select(`
          id, 
          name, 
          client_name, 
          updated_at,
          decorator_id,
          estimates (
            status,
            total_ht
          ),
          profiles!projects_decorator_id_fkey (
            email
          )
        `)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setProjects(data as unknown as ProjectWithEstimates[]);
      }
      setLoading(false);
    };

    loadDashboard();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BROUILLON':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 uppercase"><FileEdit size={12} /> Brouillon</span>;
      case 'SOUMIS':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 uppercase"><Clock size={12} /> Devis à faire</span>;
      case 'VALIDE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800 uppercase"><CheckCircle size={12} /> Devis fait</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 uppercase">Refusé</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Header />
      
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
                {role === 'ADMIN' ? 'Gestion des Projets' : 'Mes Projets'}
              </h1>
              {role === 'ADMIN' && (
                <span className="flex items-center gap-1 bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-sm">
                  <ShieldCheck size={12} /> Mode Admin
                </span>
              )}
            </div>
            <p className="text-slate-500 mt-1 font-medium">
              {role === 'ADMIN' 
                ? "Vue d'ensemble de tous les chiffrages IMMO'MALIN." 
                : "Suivi de vos dossiers et interface comptabilité."}
            </p>
          </div>
          <CreateProjectButton />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="font-bold uppercase text-xs tracking-widest">Chargement des dossiers...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-red-600 bg-red-50 rounded-2xl flex items-center gap-3 font-bold border border-red-100 shadow-inner">
            <AlertCircle /> Erreur : {error}
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-16 text-center text-slate-400">
            <p className="font-bold text-lg mb-4">Aucun projet trouvé</p>
            <p className="text-sm">Cliquez sur le bouton "Nouveau Projet" pour commencer un chiffrage.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => {
              const estimate = project.estimates && project.estimates.length > 0 
                ? project.estimates[0] 
                : { status: 'BROUILLON' as const, total_ht: 0 };
              
              return (
                <div key={project.id} className="bg-white border border-slate-200 rounded-[2rem] p-7 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col">
                  {/* Petit indicateur visuel de rôle pour l'Admin */}
                  {role === 'ADMIN' && project.profiles && (
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-4 pb-4 border-b border-slate-50">
                      <UserIcon size={12} /> 
                      Décoratrice : <span className="text-blue-600">{project.profiles.email.split('@')[0]}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-6">
                    {getStatusBadge(estimate.status)}
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {new Date(project.updated_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-slate-800 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1 uppercase tracking-tighter">
                      {project.name}
                    </h3>
                    <p className="text-slate-500 text-sm font-medium mb-6">Client : {project.client_name || 'Particulier'}</p>
                  </div>

                  <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-[0.2em] block mb-1">Total HT</span>
                      <span className="block font-black text-2xl text-slate-900 tracking-tighter">
                        {estimate.total_ht > 0 ? `${Math.round(estimate.total_ht).toLocaleString('fr-FR')} €` : '-- €'}
                      </span>
                    </div>
                    
                    <Link href={`/project/${project.id}/recap`} className="bg-slate-900 p-3 text-white group-hover:bg-blue-600 rounded-2xl transition-all shadow-lg shadow-slate-100 group-hover:shadow-blue-100 active:scale-95">
                      <ChevronRight size={24} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}