import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Frais as FraisType } from '../lib/supabase';
import { Receipt, Check, X, Plus, Upload, FileText } from 'lucide-react';

export const Frais: React.FC = () => {
  const { profile } = useAuth();
  const [frais, setFrais] = useState<FraisType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    salarie_id: '',
    date: '',
    type_frais: '',
    description: '',
    montant_ttc: '',
    affectation: 'mixte' as 'preteuse' | 'accueil' | 'mixte',
    taux_ventilation: '0.5',
    piece_jointe_url: ''
  });

  useEffect(() => {
    loadFrais();
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

  const loadFrais = async () => {
    try {
      let query = supabase
        .from('frais')
        .select(`
          *,
          salarie:profiles!frais_salarie_id_fkey(nom, prenom)
        `)
        .order('date', { ascending: false });

      if (profile?.role === 'salarie') {
        query = query.eq('salarie_id', profile.id);
      } else if (profile?.role === 'compta') {
        query = query.in('statut_preteuse', ['valide']);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFrais(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclarer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetSalarieId = profile?.role === 'preteuse' ? formData.salarie_id : profile?.id;
      const { error } = await supabase.from('frais').insert([{
        salarie_id: targetSalarieId,
        date: formData.date,
        type_frais: formData.type_frais,
        description: formData.description,
        montant_ttc: parseFloat(formData.montant_ttc),
        affectation: formData.affectation,
        taux_ventilation: parseFloat(formData.taux_ventilation),
        piece_jointe_url: formData.piece_jointe_url,
        statut_accueil: profile?.role === 'preteuse' ? 'valide' : 'en_attente',
        statut_preteuse: profile?.role === 'preteuse' ? 'valide' : 'en_attente'
      }]);

      if (error) throw error;

      setShowForm(false);
      setFormData({
        salarie_id: '',
        date: '',
        type_frais: '',
        description: '',
        montant_ttc: '',
        affectation: 'mixte',
        taux_ventilation: '0.5',
        piece_jointe_url: ''
      });
      loadFrais();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleValiderAccueil = async (id: string) => {
    try {
      const { error } = await supabase
        .from('frais')
        .update({
          statut_accueil: 'valide',
          date_validation: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      loadFrais();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleRefuserAccueil = async (id: string) => {
    try {
      const { error } = await supabase
        .from('frais')
        .update({
          statut_accueil: 'refuse',
          date_validation: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      loadFrais();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleValiderPreteuse = async (id: string) => {
    try {
      const { error } = await supabase
        .from('frais')
        .update({
          statut_preteuse: 'valide',
          date_validation: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      loadFrais();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleRefuserPreteuse = async (id: string) => {
    try {
      const { error } = await supabase
        .from('frais')
        .update({
          statut_preteuse: 'refuse',
          date_validation: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      loadFrais();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  const fraisEnAttenteAccueil = frais.filter(f => f.statut_accueil === 'en_attente');
  const fraisEnAttentePreteuse = frais.filter(f => f.statut_accueil === 'valide' && f.statut_preteuse === 'en_attente');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Frais professionnels</h1>
        {(profile?.role === 'salarie' || profile?.role === 'preteuse') && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Déclarer des frais
          </button>
        )}
      </div>

      {showForm && (profile?.role === 'salarie' || profile?.role === 'preteuse') && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Déclarer des frais</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de frais</label>
                <select
                  value={formData.type_frais}
                  onChange={(e) => setFormData({ ...formData, type_frais: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un type</option>
                  <option value="transport">Transport</option>
                  <option value="repas">Repas</option>
                  <option value="hebergement">Hébergement</option>
                  <option value="materiel">Matériel</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Montant TTC (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.montant_ttc}
                  onChange={(e) => setFormData({ ...formData, montant_ttc: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Affectation</label>
                <select
                  value={formData.affectation}
                  onChange={(e) => setFormData({ ...formData, affectation: e.target.value as any })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mixte">Mixte (50/50)</option>
                  <option value="preteuse">École prêteuse</option>
                  <option value="accueil">École d'accueil</option>
                </select>
              </div>
            </div>
            {formData.affectation === 'mixte' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taux de ventilation (part prêteuse: {(parseFloat(formData.taux_ventilation) * 100).toFixed(0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.taux_ventilation}
                  onChange={(e) => setFormData({ ...formData, taux_ventilation: e.target.value })}
                  className="w-full"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pièce jointe (URL)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  value={formData.piece_jointe_url}
                  onChange={(e) => setFormData({ ...formData, piece_jointe_url: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <Upload className="h-5 w-5 text-gray-400" />
              </div>
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

      {profile?.role === 'accueil' && fraisEnAttenteAccueil.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Frais en attente de validation (Accueil)</h2>
          <div className="space-y-4">
            {fraisEnAttenteAccueil.map((f) => (
              <div key={f.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">
                        {(f as any).salarie?.prenom} {(f as any).salarie?.nom}
                      </p>
                      <span className="text-lg font-bold text-gray-900">{f.montant_ttc.toFixed(2)} €</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(f.date).toLocaleDateString('fr-FR')} - {f.type_frais}
                    </p>
                    {f.description && (
                      <p className="text-sm text-gray-600 mt-2">{f.description}</p>
                    )}
                    <div className="mt-2 flex items-center space-x-4 text-sm">
                      <span className="text-gray-600">
                        Part prêteuse: {f.part_preteuse?.toFixed(2)} €
                      </span>
                      <span className="text-gray-600">
                        Part accueil: {f.part_accueil?.toFixed(2)} €
                      </span>
                    </div>
                    {f.piece_jointe_url && (
                      <a
                        href={f.piece_jointe_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Voir la pièce jointe
                      </a>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleValiderAccueil(f.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleRefuserAccueil(f.id)}
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

      {profile?.role === 'preteuse' && fraisEnAttentePreteuse.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Frais en attente de validation (Prêteuse)</h2>
          <div className="space-y-4">
            {fraisEnAttentePreteuse.map((f) => (
              <div key={f.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">
                        {(f as any).salarie?.prenom} {(f as any).salarie?.nom}
                      </p>
                      <span className="text-lg font-bold text-gray-900">{f.montant_ttc.toFixed(2)} €</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(f.date).toLocaleDateString('fr-FR')} - {f.type_frais}
                    </p>
                    {f.description && (
                      <p className="text-sm text-gray-600 mt-2">{f.description}</p>
                    )}
                    <div className="mt-2 flex items-center space-x-4 text-sm">
                      <span className="text-gray-600">
                        Part prêteuse: {f.part_preteuse?.toFixed(2)} €
                      </span>
                      <span className="text-gray-600">
                        Part accueil: {f.part_accueil?.toFixed(2)} €
                      </span>
                    </div>
                    {f.piece_jointe_url && (
                      <a
                        href={f.piece_jointe_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Voir la pièce jointe
                      </a>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleValiderPreteuse(f.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleRefuserPreteuse(f.id)}
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
          <h2 className="text-xl font-semibold">Historique des frais</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {profile?.role !== 'salarie' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salarié</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ventilation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut Accueil</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut Prêteuse</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {frais.map((f) => (
                <tr key={f.id}>
                  {profile?.role !== 'salarie' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(f as any).salarie?.prenom} {(f as any).salarie?.nom}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(f.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {f.type_frais}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {f.montant_ttc.toFixed(2)} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="text-xs">
                      <div>P: {f.part_preteuse?.toFixed(2)} €</div>
                      <div>A: {f.part_accueil?.toFixed(2)} €</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      f.statut_accueil === 'valide' ? 'bg-green-100 text-green-800' :
                      f.statut_accueil === 'refuse' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {f.statut_accueil === 'valide' ? 'Validé' : f.statut_accueil === 'refuse' ? 'Refusé' : 'En attente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      f.statut_preteuse === 'valide' ? 'bg-green-100 text-green-800' :
                      f.statut_preteuse === 'refuse' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {f.statut_preteuse === 'valide' ? 'Validé' : f.statut_preteuse === 'refuse' ? 'Refusé' : 'En attente'}
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
