'use client';

import React from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { ArrowLeft, ChefHat, Tv, ClipboardList, Calculator, Package } from 'lucide-react';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const id = params?.id as string;

  // Liste des onglets mise à jour
  const tabs = [
    { name: 'Récapitulatif', href: `/project/${id}/recap`, icon: ClipboardList },
    { name: 'Fournitures', href: `/project/${id}/fournitures`, icon: Calculator },
    { name: 'Ameublement', href: `/project/${id}/ameublement`, icon: Package },
    { name: 'Cuisine', href: `/project/${id}/cuisine`, icon: ChefHat },
    { name: 'Électroménager', href: `/project/${id}/electromenager`, icon: Tv },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* IMPORTANT : Si le header apparaît 2 fois, 
          supprime la ligne <Header /> ci-dessous.
      */}
      <Header />
      
      <div className="bg-white border-b border-slate-200 no-print">
        <div className="max-w-7xl mx-auto px-8">
          {/* BOUTON RETOUR */}
          <div className="py-4">
            <Link 
              href="/dashboard" 
              className="text-slate-400 hover:text-blue-600 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors w-fit"
            >
              <ArrowLeft size={14} />
              Retour au Dashboard
            </Link>
          </div>

          {/* NAVIGATION DES ONGLETS */}
          <nav className="flex gap-8 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                    isActive 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}