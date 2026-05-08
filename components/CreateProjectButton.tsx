'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Loader2 } from 'lucide-react';

interface CreateProjectButtonProps {
  onProjectCreated?: () => void;
}

export default function CreateProjectButton({ onProjectCreated }: CreateProjectButtonProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    // 1. On demande les deux infos
    const name = prompt("Nom du projet :");
    if (!name) return;

    const clientName = prompt("Nom du client :");
    // Note: on laisse continuer même si le client est vide

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('projects')
        .insert([{ 
          name, 
          client_name: clientName, // On ajoute le champ client ici
          decorator_id: user?.id,
          status: 'brouillon',
          is_archived: false 
        }]);

      if (error) throw error;
      if (onProjectCreated) onProjectCreated();

    } catch (error: any) {
      console.error(error);
      alert("Erreur lors de la création : " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <button 
      onClick={handleCreate}
      disabled={isCreating}
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 transition-all shadow-lg active:scale-95"
    >
      {isCreating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
      NOUVEAU PROJET
    </button>
  );
}