import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, CheckCircle, XCircle, AlertTriangle, User, MessageSquare } from 'lucide-react';
import { sendEmail, emailTemplates } from '../utils/emailService';

interface BilanHebdo {
  id: string;
  salarie_id: string;
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
  profiles: {
    nom: string;
    prenom: string;
    email: string;
  };
}

interface Alerte {
  id: string;
  type_alerte: string;
  message: string;
  resolue: boolean;
}

export const ValidationBilans: React.FC = () => {
  const { profile } = useAuth();
  const [bilans, setBilans] = useState<BilanHebdo[]>([]);
  const [alertes, setAlertes] = useState<{ [key: string]: Alerte[] }>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'valide' | 'refuse'>('en_attente');
  const [selectedBilan, setSelectedBilan] = useState<BilanHebdo | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadBilans();
  }, [profile, filter]);

  const loadBilans = async () => {
    if (!profile) return;

    try {
      let query = supabase
        .from('bilans_hebdomadaires')
        .select(`
          *,
          profiles!bilans_hebdomadaires_salarie_id_fkey (
            nom,
            prenom,
            email
          )
        `)
        .order('semaine_debut', { ascending: false });

      if (profile.role === 'accueil' && filter !== 'all') {
        const statutField = 'statut_accueil';
        if (filter !== 'all') {
          query = query.eq(statutField, filter);
        }
      } else if (profile.role === 'preteuse' && filter !== 'all') {
        const statutField = 'statut_preteuse';
        if (filter !== 'all') {
          query = query.eq(statutField, filter);
        }
      }

      const { data, error } = await query;

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

  const handleValidation = async (bilanId: string, action: 'valide' | 'refuse') => {
    if (!profile) return;

    try {
      const updates: any = {};

      if (profile.role === 'accueil') {
        updates.statut_accueil = action;
        if (commentaire) {
          updates.commentaire_accueil = commentaire;
        }
      } else if (profile.role === 'preteuse') {
        updates.statut_preteuse = action;
        if (commentaire) {
          updates.commentaire_preteuse = commentaire;
        }
      }

      const { error } = await supabase
        .from('bilans_hebdomadaires')
        .update(updates)
        .eq('id', bilanId);

      if (error) throw error;

      const bilan = bilans.find(b => b.id === bilanId);
      if (bilan) {
        const validatedBy = `${profile.prenom} ${profile.nom}`;
        const weekStart = formatDate(bilan.semaine_debut);
        const weekEnd = formatDate(bilan.semaine_fin);

        if (action === 'valide') {
          const emailTemplate = emailTemplates.bilanValidated(
            `${bilan.profiles.prenom} ${bilan.profiles.nom}`,
            weekStart,
            weekEnd,
            validatedBy
          );

          await sendEmail({
            to: bilan.profiles.email,
            ...emailTemplate,
          });
        } else if (action === 'refuse' && commentaire) {
          const emailTemplate = emailTemplates.bilanRejected(
            `${bilan.profiles.prenom} ${bilan.profiles.nom}`,
            weekStart,
            weekEnd,
            commentaire
          );

          await sendEmail({
            to: bilan.profiles.email,
            ...emailTemplate,
          });
        }
      }

      setMessage({
        type: 'success',
        text: `Bilan ${action === 'valide' ? 'validé' : 'refusé'} avec succès. Email envoyé au salarié.`
      });
      setSelectedBilan(null);
      setCommentaire('');
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

  const canValidate = (bilan: BilanHebdo) => {
    if (bilan.verrouille) return false;
    if (profile?.role === 'accueil') {
      return bilan.statut_accueil === 'en_attente';
    }
    if (profile?.role === 'preteuse') {
      return bilan.statut_preteuse === 'en_attente';
    }
    return false;
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Validation des Bilans Hebdomadaires</h1>
        <p className="text-gray-600 mt-2">Validez ou refusez les bilans des salariés</p>
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

      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Tous
        </button>
        <button
          onClick={() => setFilter('en_attente')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'en_attente' ? 'bg-yellow-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          En attente
        </button>
        <button
          onClick={() => setFilter('valide')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'valide' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Validés
        </button>
        <button
          onClick={() => setFilter('refuse')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'refuse' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Refusés
        </button>
      </div>

      <div className="space-y-4">
        {bilans.map((bilan) => (
          <div key={bilan.id} className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center mb-2">
                    <User className="h-5 w-5 text-gray-400 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {bilan.profiles.prenom} {bilan.profiles.nom}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Semaine du {formatDate(bilan.semaine_debut)} au {formatDate(bilan.semaine_fin)}
                  </p>
                  <p className="text-sm text-gray-500">Déclaré le {formatDate(bilan.date_declaration)}</p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  {profile?.role === 'accueil' && getStatutBadge(bilan.statut_accueil)}
                  {profile?.role === 'preteuse' && getStatutBadge(bilan.statut_preteuse)}
                  {bilan.verrouille && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Verrouillé
                    </span>
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
                  <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">
                    {bilan.contenu_ecole_accueil || 'Aucun contenu'}
                  </p>
                  <p className="text-sm font-medium text-gray-900">Temps: {bilan.temps_ecole_accueil}h</p>
                  <div className="mt-2">{getStatutBadge(bilan.statut_accueil)}</div>
                  {bilan.commentaire_accueil && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      Commentaire: {bilan.commentaire_accueil}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">École prêteuse</h4>
                  <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">
                    {bilan.contenu_ecole_preteuse || 'Aucun contenu'}
                  </p>
                  <p className="text-sm font-medium text-gray-900">Temps: {bilan.temps_ecole_preteuse}h</p>
                  <div className="mt-2">{getStatutBadge(bilan.statut_preteuse)}</div>
                  {bilan.commentaire_preteuse && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      Commentaire: {bilan.commentaire_preteuse}
                    </p>
                  )}
                </div>
              </div>

              {bilan.commentaire && (
                <div className="border-t pt-4 mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Commentaire du salarié:</span> {bilan.commentaire}
                  </p>
                </div>
              )}

              {canValidate(bilan) && (
                <div className="border-t pt-4">
                  {selectedBilan?.id === bilan.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <MessageSquare className="h-4 w-4 inline mr-1" />
                          Commentaire (optionnel)
                        </label>
                        <textarea
                          value={commentaire}
                          onChange={(e) => setCommentaire(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ajoutez un commentaire..."
                        />
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleValidation(bilan.id, 'valide')}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Valider
                        </button>
                        <button
                          onClick={() => handleValidation(bilan.id, 'refuse')}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <XCircle className="h-5 w-5 mr-2" />
                          Refuser
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBilan(null);
                            setCommentaire('');
                          }}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedBilan(bilan)}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Examiner ce bilan
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {bilans.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun bilan à valider pour le moment</p>
          </div>
        )}
      </div>
    </div>
  );
};
