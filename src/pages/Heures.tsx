import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Heures as HeuresType } from '../lib/supabase';
import { Clock, Check, X, Plus, AlertCircle } from 'lucide-react';

export const Heures: React.FC = () => {
  const { profile } = useAuth();
  const [heures, setHeures] = useState<HeuresType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [ecoles, setEcoles] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    salarie_id: '',
    date: '',
    heure_debut: '',
    heure_fin: '',
    ecole_concernee: '',
    commentaire: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadHeures();
    loadEcoles();
    if (profile?.role === 'preteuse') {
      loadSalaries();
    }
  }, [profile]);

  const loadSalaries = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, nom, prenom')
      .eq('role', 'salarie');
    if (data) setSalaries(data);
  };

  const loadEcoles = async () => {
    const { data } = await supabase
      .from('ecoles')
      .select('id, nom')
      .order('nom');
    if (data) setEcoles(data);
  };

  const loadHeures = async () => {
    try {
      let query = supabase
        .from('heures')
        .select(`
          *,
          salarie:profiles!heures_salarie_id_fkey(nom, prenom)
        `)
        .order('date', { ascending: false });

      if (profile?.role === 'salarie') {
        query = query.eq('salarie_id', profile.id);
      } else if (profile?.role === 'compta') {
        query = query.in('statut_preteuse', ['valide']);
      }

      const { data, error } = await query;
      if (error) throw error;
      setHeures(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculerEcartPlanning = async (date: string, heureDebut: string, heureFin: string, salarieId?: string) => {
    const targetSalarieId = salarieId || profile?.id;
    const { data: planning } = await supabase
      .from('planning')
      .select('heure_debut, heure_fin')
      .eq('salarie_id', targetSalarieId)
      .eq('date', date)
      .eq('statut', 'valide')
      .maybeSingle();

    if (!planning) return 0;

    const planningDebut = new Date(`2000-01-01T${planning.heure_debut}`);
    const planningFin = new Date(`2000-01-01T${planning.heure_fin}`);
    const heuresDebut = new Date(`2000-01-01T${heureDebut}`);
    const heuresFin = new Date(`2000-01-01T${heureFin}`);

    const dureePreve = (planningFin.getTime() - planningDebut.getTime()) / (1000 * 60 * 60);
    const dureeReelle = (heuresFin.getTime() - heuresDebut.getTime()) / (1000 * 60 * 60);

    return dureeReelle - dureePreve;
  };

  const handleDeclarer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const targetSalarieId = profile?.role === 'preteuse' ? formData.salarie_id : profile?.id;

      if (!targetSalarieId) {
        setError('Identifiant du salarié manquant');
        return;
      }

      const ecart = await calculerEcartPlanning(formData.date, formData.heure_debut, formData.heure_fin, targetSalarieId);

      const { error: insertError } = await supabase.from('heures').insert([{
        salarie_id: targetSalarieId,
        date: formData.date,
        heure_debut: formData.heure_debut,
        heure_fin: formData.heure_fin,
        ecole_concernee: formData.ecole_concernee,
        commentaire: formData.commentaire || null,
        ecart_vs_planning: ecart,
        statut_accueil: profile?.role === 'preteuse' ? 'valide' : 'en_attente',
        statut_preteuse: profile?.role === 'preteuse' ? 'valide' : 'en_attente'
      }]);

      if (insertError) throw insertError;

      setSuccess('Heures déclarées avec succès');
      setShowForm(false);
      setFormData({
        salarie_id: '',
        date: '',
        heure_debut: '',
        heure_fin: '',
        ecole_concernee: '',
        commentaire: ''
      });
      loadHeures();
    } catch (error: any) {
      console.error('Erreur:', error);
      setError(error.message || 'Erreur lors de la déclaration des heures');
    }
  };

  const handleValiderAccueil = async (id: string) => {
    try {
      const { error } = await supabase
        .from('heures')
        .update({
          statut_accueil: 'valide',
          valide_par: profile?.id,
          date_validation: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      loadHeures();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleRefuserAccueil = async (id: string) => {
    try {
      const { error } = await supabase
        .from('heures')
        .update({
          statut_accueil: 'refuse',
          valide_par: profile?.id,
          date_validation: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      loadHeures();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleValiderPreteuse = async (id: string) => {
    try {
      const { error } = await supabase
        .from('heures')
        .update({
          statut_preteuse: 'valide',
          valide_par: profile?.id,
          date_validation: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      loadHeures();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleRefuserPreteuse = async (id: string) => {
    try {
      const { error } = await supabase
        .from('heures')
        .update({
          statut_preteuse: 'refuse',
          valide_par: profile?.id,
          date_validation: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      loadHeures();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  const heuresEnAttenteAccueil = heures.filter(h => h.statut_accueil === 'en_attente');
  const heuresEnAttentePreteuse = heures.filter(h => h.statut_accueil === 'valide' && h.statut_preteuse === 'en_attente');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Heures</h1>
        {(profile?.role === 'salarie' || profile?.role === 'preteuse') && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Déclarer des heures
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {showForm && (profile?.role === 'salarie' || profile?.role === 'preteuse') && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Déclarer des heures</h2>
          <form onSubmit={handleDeclarer} className="space-y-4">
            {profile?.role === 'preteuse' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Salarié</label>
                <select
                  value={formData.salarie_id}
                  onChange={(e) => setFormData({ ...formData, salarie_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un salarié</option>
                  {salaries.map(s => (
                    <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heure début</label>
                <input
                  type="time"
                  value={formData.heure_debut}
                  onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heure fin</label>
                <input
                  type="time"
                  value={formData.heure_fin}
                  onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">École concernée</label>
              <select
                value={formData.ecole_concernee}
                onChange={(e) => setFormData({ ...formData, ecole_concernee: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner une école</option>
                {ecoles.map(ecole => (
                  <option key={ecole.id} value={ecole.id}>{ecole.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Commentaire (optionnel)</label>
              <textarea
                value={formData.commentaire}
                onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Déclarer
              </button>
            </div>
          </form>
        </div>
      )}

      {profile?.role === 'accueil' && heuresEnAttenteAccueil.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Heures en attente de validation (Accueil)</h2>
          <div className="space-y-4">
            {heuresEnAttenteAccueil.map((h) => (
              <div key={h.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {(h as any).salarie?.prenom} {(h as any).salarie?.nom}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(h.date).toLocaleDateString('fr-FR')} - {h.heure_debut} à {h.heure_fin}
                    </p>
                    {h.commentaire && (
                      <p className="text-sm text-gray-600 mt-2">{h.commentaire}</p>
                    )}
                    {Math.abs(h.ecart_vs_planning) > 1 && (
                      <div className="flex items-center mt-2 text-yellow-600">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span className="text-sm">Écart de {h.ecart_vs_planning.toFixed(1)}h avec le planning</span>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleValiderAccueil(h.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleRefuserAccueil(h.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile?.role === 'preteuse' && heuresEnAttentePreteuse.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Heures en attente de validation (Prêteuse)</h2>
          <div className="space-y-4">
            {heuresEnAttentePreteuse.map((h) => (
              <div key={h.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {(h as any).salarie?.prenom} {(h as any).salarie?.nom}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(h.date).toLocaleDateString('fr-FR')} - {h.heure_debut} à {h.heure_fin}
                    </p>
                    {h.commentaire && (
                      <p className="text-sm text-gray-600 mt-2">{h.commentaire}</p>
                    )}
                    {Math.abs(h.ecart_vs_planning) > 1 && (
                      <div className="flex items-center mt-2 text-yellow-600">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span className="text-sm">Écart de {h.ecart_vs_planning.toFixed(1)}h avec le planning</span>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleValiderPreteuse(h.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleRefuserPreteuse(h.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Historique des heures</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {profile?.role !== 'salarie' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salarié</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heures</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Écart</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut Accueil</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut Prêteuse</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {heures.map((h) => (
                <tr key={h.id}>
                  {profile?.role !== 'salarie' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(h as any).salarie?.prenom} {(h as any).salarie?.nom}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(h.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      {h.heure_debut} - {h.heure_fin}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={Math.abs(h.ecart_vs_planning) > 1 ? 'text-yellow-600 font-medium' : 'text-gray-600'}>
                      {h.ecart_vs_planning > 0 ? '+' : ''}{h.ecart_vs_planning.toFixed(1)}h
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      h.statut_accueil === 'valide' ? 'bg-green-100 text-green-800' :
                      h.statut_accueil === 'refuse' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {h.statut_accueil === 'valide' ? 'Validé' : h.statut_accueil === 'refuse' ? 'Refusé' : 'En attente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      h.statut_preteuse === 'valide' ? 'bg-green-100 text-green-800' :
                      h.statut_preteuse === 'refuse' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {h.statut_preteuse === 'valide' ? 'Validé' : h.statut_preteuse === 'refuse' ? 'Refusé' : 'En attente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
