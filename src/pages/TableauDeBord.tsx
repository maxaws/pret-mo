import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Clock, TrendingUp, AlertCircle, CheckCircle, FileText } from 'lucide-react';

interface DashboardStats {
  heuresPrevues: number;
  heuresRealisees: number;
  pourcentageTemps: number;
  fraisTotaux: number;
  fraisPreteuse: number;
  fraisAccueil: number;
  alertes: Array<{ type: string; message: string }>;
  statutCloture: string;
}

export const TableauDeBord: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const moisCourant = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const startOfMonth = `${moisCourant}-01`;
      const endOfMonth = new Date(new Date(startOfMonth).getFullYear(), new Date(startOfMonth).getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

      const { data: planningData } = await supabase
        .from('planning')
        .select('heure_debut, heure_fin')
        .eq('statut', 'valide')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      const { data: heuresData } = await supabase
        .from('heures')
        .select('heure_debut, heure_fin, statut_preteuse, ecart_vs_planning')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      const { data: fraisData } = await supabase
        .from('frais')
        .select('montant_ttc, part_preteuse, part_accueil, statut_preteuse')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      const { data: clotureData } = await supabase
        .from('cloture_mensuelle')
        .select('statut')
        .eq('mois', moisCourant)
        .maybeSingle();

      let heuresPrevues = 0;
      if (planningData) {
        heuresPrevues = planningData.reduce((total, p) => {
          const debut = new Date(`2000-01-01T${p.heure_debut}`);
          const fin = new Date(`2000-01-01T${p.heure_fin}`);
          return total + (fin.getTime() - debut.getTime()) / (1000 * 60 * 60);
        }, 0);
      }

      let heuresRealisees = 0;
      const alertes: Array<{ type: string; message: string }> = [];
      if (heuresData) {
        heuresRealisees = heuresData.reduce((total, h) => {
          const debut = new Date(`2000-01-01T${h.heure_debut}`);
          const fin = new Date(`2000-01-01T${h.heure_fin}`);
          return total + (fin.getTime() - debut.getTime()) / (1000 * 60 * 60);
        }, 0);

        heuresData.forEach(h => {
          if (Math.abs(h.ecart_vs_planning) > 1) {
            alertes.push({
              type: 'warning',
              message: `Écart de ${h.ecart_vs_planning.toFixed(1)}h détecté sur une déclaration`
            });
          }
        });
      }

      let fraisTotaux = 0;
      let fraisPreteuse = 0;
      let fraisAccueil = 0;
      if (fraisData) {
        fraisData.forEach(f => {
          if (f.statut_preteuse === 'valide') {
            fraisTotaux += f.montant_ttc;
            fraisPreteuse += f.part_preteuse || 0;
            fraisAccueil += f.part_accueil || 0;
          }
        });
      }

      if (!clotureData) {
        alertes.push({
          type: 'info',
          message: 'Aucune clôture mensuelle initiée pour ce mois'
        });
      }

      setStats({
        heuresPrevues,
        heuresRealisees,
        pourcentageTemps: heuresPrevues > 0 ? (heuresRealisees / heuresPrevues) * 100 : 0,
        fraisTotaux,
        fraisPreteuse,
        fraisAccueil,
        alertes,
        statutCloture: clotureData?.statut || 'non_initiee'
      });
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <div className="text-sm text-gray-500">
          Mois en cours: {new Date(moisCourant).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Heures prévues</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.heuresPrevues.toFixed(1)}h</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Heures réalisées</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.heuresRealisees.toFixed(1)}h</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Utilisation du temps</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pourcentageTemps.toFixed(1)}%</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Frais totaux</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.fraisTotaux.toFixed(2)} €</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ventilation des frais</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">École prêteuse</span>
                <span className="text-sm font-semibold text-gray-900">{stats.fraisPreteuse.toFixed(2)} €</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${stats.fraisTotaux > 0 ? (stats.fraisPreteuse / stats.fraisTotaux) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">École d'accueil</span>
                <span className="text-sm font-semibold text-gray-900">{stats.fraisAccueil.toFixed(2)} €</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${stats.fraisTotaux > 0 ? (stats.fraisAccueil / stats.fraisTotaux) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Statut de clôture</h2>
          <div className="flex items-center space-x-3 mb-4">
            <div
              className={`h-3 w-3 rounded-full ${
                stats.statutCloture === 'cloture' ? 'bg-green-500' : 'bg-yellow-500'
              }`}
            ></div>
            <span className="text-sm font-medium text-gray-900 capitalize">
              {stats.statutCloture.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {stats.statutCloture === 'cloture'
              ? 'La clôture mensuelle est finalisée'
              : 'La clôture mensuelle est en cours'}
          </p>
        </div>
      </div>

      {stats.alertes.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertes</h2>
          <div className="space-y-3">
            {stats.alertes.map((alerte, index) => (
              <div
                key={index}
                className={`flex items-start space-x-3 p-3 rounded-lg ${
                  alerte.type === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'
                }`}
              >
                <AlertCircle
                  className={`h-5 w-5 mt-0.5 ${
                    alerte.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                  }`}
                />
                <p className={`text-sm ${alerte.type === 'warning' ? 'text-yellow-800' : 'text-blue-800'}`}>
                  {alerte.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
