import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'salarie' | 'accueil' | 'preteuse' | 'compta';

export interface Profile {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: UserRole;
  ecole_id: string | null;
  google_calendar_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Planning {
  id: string;
  salarie_id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  ecole_accueil_id: string;
  statut: 'propose' | 'valide' | 'refuse';
  commentaire_validation?: string;
  valide_par?: string;
  date_validation?: string;
  historique: any[];
  created_at: string;
  updated_at: string;
}

export interface Heures {
  id: string;
  salarie_id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  ecole_concernee: string;
  commentaire?: string;
  statut_accueil: string;
  statut_preteuse: string;
  valide_par?: string;
  date_validation?: string;
  ecart_vs_planning: number;
  created_at: string;
  updated_at: string;
}

export interface Frais {
  id: string;
  salarie_id: string;
  date: string;
  type_frais: string;
  description?: string;
  montant_ttc: number;
  piece_jointe_url?: string;
  affectation: 'preteuse' | 'accueil' | 'mixte';
  taux_ventilation: number;
  part_preteuse?: number;
  part_accueil?: number;
  statut_accueil: string;
  statut_preteuse: string;
  date_validation?: string;
  created_at: string;
  updated_at: string;
}

export interface ClotureMensuelle {
  id: string;
  mois: string;
  salarie_id: string;
  signature_salarie: boolean;
  signature_accueil: boolean;
  signature_preteuse: boolean;
  statut: string;
  pdf_url?: string;
  date_cloture?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  type_document: string;
  fichier_url: string;
  mois?: string;
  upload_par: string;
  date_upload: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  table_name: string;
  action: string;
  ancienne_valeur?: any;
  nouvelle_valeur?: any;
  timestamp: string;
}
