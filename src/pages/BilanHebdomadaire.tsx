import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, Save, Plus, Edit2, Trash2, AlertTriangle, Lock, CheckCircle, XCircle, FileDown } from 'lucide-react';
import { exportBilanHebdoPDF } from '../utils/pdfExport';

interface BilanHebdo {
  id: string;
  semaine_debut: string;
  semaine_fin: string;
  contenu_ecole_accueil: string;
  temps_ecole_accueil: number;
  contenu_ecole_preteuse: string;
  temps_ecole_preteuse: number;
  commentaire: string;
  date_declaration: string;
  statut_accueil: string;
  statut_preteuse: string;
  commentaire_accueil: string;
  commentaire_preteuse: string;
  verrouille: boolean;
}

interface Alerte {
  id: string;
  type_alerte: string;
  message: string;
  resolue: boolean;
}

export const BilanHebdomadaire: React.FC = () => {
  const { profile } = useAuth();
  const [bilans, setBilans] = useState<BilanHebdo[]>([]);
  const [alertes, setAlertes] = useState<{ [key: string]: Alerte[] }>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBilan, setEditingBilan] = useState<BilanHebdo | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    semaine_debut: '',
    semaine_fin: '',
    contenu_ecole_accueil: '',
    temps_ecole_accueil: 0,
    contenu_ecole_preteuse: '',
    temps_ecole_preteuse: 0,
    commentaire: ''
  });

  useEffect(() => {
    loadBilans();
  }, [profile]);

  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const getSunday = (d: Date) => {
    const monday = getMonday(d);
    return new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  };

  const loadBilans = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('bilans_hebdomadaires')
        .select('*')
        .eq('salarie_id', profile.id)
        .order('semaine_debut', { ascending: false });

      if (error) throw error;
      setBilans(data || []);

      if (data) {
        for (const bilan of data) {
          loadAlertes(bilan.id);
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlertes = async (bilanId: string) => {
    try {
      const { data, error } = await supabase
        .from('alertes_bilans')
        .select('*')
        .eq('bilan_id', bilanId)
        .eq('resolue', false);

      if (error) throw error;
      if (data) {
        setAlertes(prev => ({ ...prev, [bilanId]: data }));
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleNewBilan = () => {
    const today = new Date();
    const monday = getMonday(today);
    const sunday = getSunday(today);

    setFormData({
      semaine_debut: monday.toISOString().split('T')[0],
      semaine_fin: sunday.toISOString().split('T')[0],
      contenu_ecole_accueil: '',
      temps_ecole_accueil: 0,
      contenu_ecole_preteuse: '',
      temps_ecole_preteuse: 0,
      commentaire: ''
    });
    setEditingBilan(null);
    setShowForm(true);
  };

  const handleEdit = (bilan: BilanHebdo) => {
    setFormData({
      semaine_debut: bilan.semaine_debut,
      semaine_fin: bilan.semaine_fin,
      contenu_ecole_accueil: bilan.contenu_ecole_accueil,
      temps_ecole_accueil: bilan.temps_ecole_accueil,
      contenu_ecole_preteuse: bilan.contenu_ecole_preteuse,
      temps_ecole_preteuse: bilan.temps_ecole_preteuse,
      commentaire: bilan.commentaire
    });
    setEditingBilan(bilan);
    setShowForm(true);
  };

  const handleDelete = async (bilanId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bilan ?')) return;

    try {
      const { error } = await supabase
        .from('bilans_hebdomadaires')
        .delete()
        .eq('id', bilanId);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Bilan supprimé avec succès' });
      loadBilans();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      if (editingBilan) {
        const { error } = await supabase
          .from('bilans_hebdomadaires')
          .update({
            ...formData,
            date_declaration: new Date().toISOString()
          })
          .eq('id', editingBilan.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Bilan mis à jour avec succès' });
      } else {
        const { error } = await supabase
          .from('bilans_hebdomadaires')
          .insert({
            salarie_id: profile?.id,
            ...formData,
            date_declaration: new Date().toISOString()
          });

        if (error) throw error;
        setMessage({ type: 'success', text: 'Bilan créé avec succès' });
      }

      setShowForm(false);
      loadBilans();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const getStatutBadge = (statut: string) => {
    const styles = {
      en_attente: 'bg-yellow-100 text-yellow-800',
      valide: 'bg-green-100 text-green-800',
      refuse: 'bg-red-100 text-red-800'
    };
    const icons = {
      en_attente: Calendar,
      valide: CheckCircle,
      refuse: XCircle
    };
    const Icon = icons[statut as keyof typeof icons];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[statut as keyof typeof styles]}`}>
        <Icon className="h-3 w-3 mr-1" />
        {statut === 'en_attente' ? 'En attente' : statut === 'valide' ? 'Validé' : 'Refusé'}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const handleExportPDF = async (bilan: BilanHebdo) => {
    try {
      const { data: fraisData } = await supabase
        .from('frais')
        .select('*')
        .eq('salarie_id', profile?.id)
        .gte('date', bilan.semaine_debut)
        .lte('date', bilan.semaine_fin);

      await exportBilanHebdoPDF(
        {
          ...bilan,
          profiles: {
            nom: profile?.nom || '',
            prenom: profile?.prenom || ''
          }
        },
        fraisData || []
      );
      setMessage({ type: 'success', text: 'PDF exporté avec succès' });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erreur lors de l\'export PDF' });
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bilans Hebdomadaires</h1>
          <p className="text-gray-600 mt-2">Déclarez vos activités de la semaine</p>
        </div>
        {!showForm && (
          <button
            onClick={handleNewBilan}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouveau Bilan
          </button>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {message.text}
          </p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {editingBilan ? 'Modifier le bilan' : 'Nouveau bilan hebdomadaire'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Début de semaine
                </label>
                <input
                  type="date"
                  value={formData.semaine_debut}
                  onChange={(e) => setFormData({ ...formData, semaine_debut: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fin de semaine
                </label>
                <input
                  type="date"
                  value={formData.semaine_fin}
                  onChange={(e) => setFormData({ ...formData, semaine_fin: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">École d'accueil</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contenu des activités
                  </label>
                  <textarea
                    value={formData.contenu_ecole_accueil}
                    onChange={(e) => setFormData({ ...formData, contenu_ecole_accueil: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Décrivez vos activités pour l'école d'accueil..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temps estimé (heures)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.temps_ecole_accueil}
                    onChange={(e) => setFormData({ ...formData, temps_ecole_accueil: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">École prêteuse</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contenu des activités
                  </label>
                  <textarea
                    value={formData.contenu_ecole_preteuse}
                    onChange={(e) => setFormData({ ...formData, contenu_ecole_preteuse: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Décrivez vos activités pour l'école prêteuse..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temps estimé (heures)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.temps_ecole_preteuse}
                    onChange={(e) => setFormData({ ...formData, temps_ecole_preteuse: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commentaire (optionnel)
              </label>
              <textarea
                value={formData.commentaire}
                onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ajoutez un commentaire..."
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="h-5 w-5 mr-2" />
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {bilans.map((bilan) => (
          <div key={bilan.id} className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Semaine du {formatDate(bilan.semaine_debut)} au {formatDate(bilan.semaine_fin)}
                  </h3>
                  <p className="text-sm text-gray-500">Déclaré le {formatDate(bilan.date_declaration)}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {bilan.verrouille && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <Lock className="h-3 w-3 mr-1" />
                      Verrouillé
                    </span>
                  )}
                  {!bilan.verrouille && bilan.statut_accueil === 'en_attente' && bilan.statut_preteuse === 'en_attente' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(bilan)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(bilan.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {alertes[bilan.id] && alertes[bilan.id].length > 0 && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-orange-800 mb-2">Alertes de cohérence</h4>
                      {alertes[bilan.id].map((alerte) => (
                        <p key={alerte.id} className="text-sm text-orange-700">{alerte.message}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">École d'accueil</h4>
                  <p className="text-sm text-gray-600 mb-2">{bilan.contenu_ecole_accueil || 'Aucun contenu'}</p>
                  <p className="text-sm font-medium text-gray-900">Temps: {bilan.temps_ecole_accueil}h</p>
                  <div className="mt-2">{getStatutBadge(bilan.statut_accueil)}</div>
                  {bilan.commentaire_accueil && (
                    <p className="text-sm text-gray-600 mt-2 italic">Commentaire: {bilan.commentaire_accueil}</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">École prêteuse</h4>
                  <p className="text-sm text-gray-600 mb-2">{bilan.contenu_ecole_preteuse || 'Aucun contenu'}</p>
                  <p className="text-sm font-medium text-gray-900">Temps: {bilan.temps_ecole_preteuse}h</p>
                  <div className="mt-2">{getStatutBadge(bilan.statut_preteuse)}</div>
                  {bilan.commentaire_preteuse && (
                    <p className="text-sm text-gray-600 mt-2 italic">Commentaire: {bilan.commentaire_preteuse}</p>
                  )}
                </div>
              </div>

              {bilan.commentaire && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Commentaire:</span> {bilan.commentaire}
                  </p>
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <button
                  onClick={() => handleExportPDF(bilan)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Exporter en PDF
                </button>
              </div>
            </div>
          </div>
        ))}

        {bilans.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun bilan hebdomadaire pour le moment</p>
            <button
              onClick={handleNewBilan}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Créer votre premier bilan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
