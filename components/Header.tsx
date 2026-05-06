'use client';

import React, { useEffect, useState } from 'react';
import { 
  User, 
  LogOut, 
  ShieldCheck, 
  Settings, 
  LayoutGrid, 
  FolderKanban,
  Sofa 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Header() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserEmail(user.email ?? 'Utilisateur');
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserRole(profile.role);
        }
      } else {
        router.push('/login');
      }
    };
    
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Fonction pour gérer la classe active sur les liens
  const isActive = (path: string) => pathname === path ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600';

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm no-print">
      
      <div className="flex items-center gap-10">
        {/* LOGO */}
        <Link 
          href="/dashboard" 
          className="font-black text-xl tracking-tighter text-blue-600 hover:opacity-80 transition-opacity cursor-pointer uppercase"
        >
          IMMO'MALIN
        </Link>

        {/* NAVIGATION PRINCIPALE */}
        <nav className="hidden md:flex items-center gap-4">
          <Link 
            href="/dashboard" 
            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-all ${isActive('/dashboard')}`}
          >
            <FolderKanban size={14} />
            Projets
          </Link>

          {/* SÉPARATEUR SI ADMIN */}
          {userRole === 'ADMIN' && <div className="w-px h-4 bg-slate-200 mx-2"></div>}

          {/* MENUS ADMIN */}
          {userRole === 'ADMIN' && (
            <>
              <Link 
                href="/admin/templates" 
                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-all ${isActive('/admin/templates')}`}
              >
                <LayoutGrid size={14} />
                Packs Fournitures
              </Link>

              <Link 
                href="/admin/ameublement" 
                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-all ${isActive('/admin/ameublement')}`}
              >
                <Sofa size={14} />
                Listing Ameublement
              </Link>

              <Link 
                href="/admin/settings" 
                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-all ${isActive('/admin/settings')}`}
              >
                <Settings size={14} />
                Tarifs & Marges
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* PROFIL ET DÉCONNEXION */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
          <div className="relative">
            <div className="bg-blue-50 p-2 rounded-full border border-blue-100">
              <User size={18} className="text-blue-600" />
            </div>
            {userRole === 'ADMIN' && (
              <div className="absolute -top-1 -right-1 bg-blue-600 text-white p-0.5 rounded-full border-2 border-white shadow-sm">
                <ShieldCheck size={10} />
              </div>
            )}
          </div>
          <div className="flex flex-col leading-none">
              <span className="hidden md:inline font-bold text-slate-800">{userEmail?.split('@')[0]}</span>
              {userRole === 'ADMIN' && <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter mt-1">Administrateur</span>}
          </div>
        </div>
        
        <div className="w-px h-6 bg-slate-200"></div>

        <button 
          onClick={handleLogout}
          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all flex items-center gap-2"
          title="Se déconnecter"
        >
          <LogOut size={18} />
          <span className="hidden md:inline uppercase text-[10px] font-black tracking-widest">Sortie</span>
        </button>
      </div>
    </header>
  );
}