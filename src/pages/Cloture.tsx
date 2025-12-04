import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, ClotureMensuelle } from '../lib/supabase';
import { FileCheck, CheckCircle, Clock, Download, Eye, EyeOff, FileDown } from 'lucide-react';
import { exportCloturePDF } from '../utils/pdfExport';

export const Cloture: React.FC = () => {
  const { profile } = useAuth();
  const [clotures, setClotures] = useState<ClotureMensuelle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMois, setSelectedMois] = useState(new Date().toISOString().slice(0, 7));
  const [salaries, setSalaries] = useState<any[]>([]);
  const [showInitForm, setShowInitForm] = useState(false);
  const [expandedClotureId, setExpandedClotureId] = useState<string | null>(null);
  const [clotureDetails, setClotureDetails] = useState<any>(null);

  useEffect(() => {
    loadClotures();
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

  const handleInitierCloture = async (salarieId: string, mois: string) => {
    try {
      await getOrCreateCloture(mois, salarieId);
      setShowInitForm(false);
      loadClotures();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadClotures = async () => {
    try {
      let query = supabase
        .from('cloture_mensuelle')
        .select(`
          *,
          salarie:profiles!cloture_mensuelle_salarie_id_fkey(nom, prenom)
        `)
        .order('mois', { ascending: false });

      if (profile?.role === 'salarie') {
        query = query.eq('salarie_id', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setClotures(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateCloture = async (mois: string, salarieId: string) => {
    const { data: existing } = await supabase
      .from('cloture_mensuelle')
      .select('*')
      .eq('mois', mois)
      .eq('salarie_id', salarieId)
      .maybeSingle();

    if (existing) return existing;

    const { data: newCloture, error } = await supabase
      .from('cloture_mensuelle')
      .insert([{
        mois,
        salarie_id: salarieId,
        statut: 'attente_salarie'
      }])
      .select()
      .single();

    if (error) throw error;
    return newCloture;
  };

  const handleSignerSalarie = async () => {
    try {
      if (!profile) return;
      const cloture = await getOrCreateCloture(selectedMois, profile.id);

      const { error } = await supabase
        .from('cloture_mensuelle')
        .update({
          signature_salarie: true,
          statut: 'attente_accueil'
        })
        .eq('id', cloture.id);

      if (error) throw error;
      loadClotures();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleSignerAccueil = async (clotureId: string) => {
    try {
      const { error } = await supabase
        .from('cloture_mensuelle')
        .update({
          signature_accueil: true,
          statut: 'attente_preteuse'
        })
        .eq('id', clotureId);

      if (error) throw error;
      loadClotures();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleSignerPreteuse = async (clotureId: string) => {
    try {
      const { error } = await supabase
        .from('cloture_mensuelle')
        .update({
          signature_preteuse: true,
          statut: 'cloture',
          date_cloture: new Date().toISOString()
        })
        .eq('id', clotureId);

      if (error) throw error;
      loadClotures();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadClotureDetails = async (clotureId: string, salarieId: string, mois: string) => {
    try {
      const startDate = `${mois}-01`;
      const endDate = new Date(mois + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      const endDateStr = endDate.toISOString().slice(0, 10);

      const [fraisRes, heuresRes, bilansRes] = await Promise.all([
        supabase
          .from('frais')
          .select('*')
          .eq('salarie_id', salarieId)
          .gte('date', startDate)
          .lt('date', endDateStr)
          .order('date', { ascending: false }),

        supabase
          .from('heures')
          .select('*')
          .eq('salarie_id', salarieId)
          .gte('date', startDate)
          .lt('date', endDateStr)
          .order('date', { ascending: false }),

        supabase
          .from('bilans_hebdomadaires')
          .select(`
            *,
            profiles!bilans_hebdomadaires_salarie_id_fkey (nom, prenom)
          `)
          .eq('salarie_id', salarieId)
          .gte('semaine_debut', startDate)
          .lt('semaine_debut', endDateStr)
          .order('semaine_debut', { ascending: false })
      ]);

      const totalFrais = fraisRes.data?.reduce((sum, f) => sum + (f.montant_ttc || 0), 0) || 0;

      const totalHeures = heuresRes.data?.reduce((sum, h) => {
        const debut = new Date(`2000-01-01T${h.heure_debut}`);
        const fin = new Date(`2000-01-01T${h.heure_fin}`);
        const heures = (fin.getTime() - debut.getTime()) / (1000 * 60 * 60);
        return sum + heures;
      }, 0) || 0;

      setClotureDetails({
        frais: fraisRes.data || [],
        heures: heuresRes.data || [],
        bilans: bilansRes.data || [],
        totalFrais,
        totalHeures
      });
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
    }
  };

  const toggleClotureDetails = async (clotureId: string, salarieId: string, mois: string) => {
    if (expandedClotureId === clotureId) {
      setExpandedClotureId(null);
      setClotureDetails(null);
    } else {
      setExpandedClotureId(clotureId);
      await loadClotureDetails(clotureId, salarieId, mois);
    }
  };

  const handleExportCloturePDF = async (cloture: any) => {
    try {
      const startDate = `${cloture.mois}-01`;
      const endDate = new Date(cloture.mois + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      const endDateStr = endDate.toISOString().slice(0, 10);

      const [fraisRes, heuresRes, bilansRes] = await Promise.all([
        supabase
          .from('frais')
          .select('*')
          .eq('salarie_id', cloture.salarie_id)
          .gte('date', startDate)
          .lt('date', endDateStr)
          .order('date', { ascending: false }),

        supabase
          .from('heures')
          .select('*')
          .eq('salarie_id', cloture.salarie_id)
          .gte('date', startDate)
          .lt('date', endDateStr)
          .order('date', { ascending: false }),

        supabase
          .from('bilans_hebdomadaires')
          .select('*')
          .eq('salarie_id', cloture.salarie_id)
          .gte('semaine_debut', startDate)
          .lt('semaine_debut', endDateStr)
          .order('semaine_debut', { ascending: false })
      ]);

      const totalFrais = fraisRes.data?.reduce((sum, f) => sum + (f.montant_ttc || 0), 0) || 0;
      const totalHeures = heuresRes.data?.reduce((sum, h) => {
        const debut = new Date(`2000-01-01T${h.heure_debut}`);
        const fin = new Date(`2000-01-01T${h.heure_fin}`);
        const heures = (fin.getTime() - debut.getTime()) / (1000 * 60 * 60);
        return sum + heures;
      }, 0) || 0;

      await exportCloturePDF({
        mois: cloture.mois,
        salarie: cloture.salarie || { nom: '', prenom: '' },
        bilans: bilansRes.data || [],
        heures: heuresRes.data || [],
        frais: fraisRes.data || [],
        totalHeures,
        totalFrais
      });
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  const clotureMoisCourant = clotures.find(c =>
    c.mois === selectedMois &&
    (profile?.role === 'salarie' ? c.salarie_id === profile.id : true)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Clôture mensuelle</h1>
        <div className="flex items-center space-x-3">
          {profile?.role === 'preteuse' && (
            <button
              onClick={() => setShowInitForm(!showInitForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Initier une clôture
            </button>
          )}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Mois:</label>
            <input
              type="month"
              value={selectedMois}
              onChange={(e) => setSelectedMois(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {showInitForm && profile?.role === 'preteuse' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Initier une clôture mensuelle</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Salarié</label>
                <select
                  id="salarie-select"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un salarié</option>
                  {salaries.map(s => (
                    <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mois</label>
                <input
                  type="month"
                  id="mois-input"
                  defaultValue={selectedMois}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowInitForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  const salarieId = (document.getElementById('salarie-select') as HTMLSelectElement)?.value;
                  const mois = (document.getElementById('mois-input') as HTMLInputElement)?.value;
                  if (salarieId && mois) {
                    handleInitierCloture(salarieId, mois);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Créer la clôture
              </button>
            </div>
          </div>
        </div>
      )}

      {profile?.role === 'salarie' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Circuit de signature - {new Date(selectedMois).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h2>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                clotureMoisCourant?.signature_salarie ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {clotureMoisCourant?.signature_salarie ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <Clock className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">Étape 1: Signature salarié</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Vous devez valider vos heures et frais du mois
                </p>
                {!clotureMoisCourant?.signature_salarie && (
                  <button
                    onClick={handleSignerSalarie}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Signer la clôture
                  </button>
                )}
                {clotureMoisCourant?.signature_salarie && (
                  <p className="text-sm text-green-600 mt-2">✓ Signé</p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                clotureMoisCourant?.signature_accueil ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {clotureMoisCourant?.signature_accueil ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <Clock className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">Étape 2: Signature école d'accueil</h3>
                <p className="text-sm text-gray-600 mt-1">
                  L'école d'accueil doit valider la clôture
                </p>
                {clotureMoisCourant?.signature_accueil && (
                  <p className="text-sm text-green-600 mt-2">✓ Signé</p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                clotureMoisCourant?.signature_preteuse ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {clotureMoisCourant?.signature_preteuse ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <Clock className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">Étape 3: Signature école prêteuse</h3>
                <p className="text-sm text-gray-600 mt-1">
                  L'école prêteuse effectue la clôture finale
                </p>
                {clotureMoisCourant?.signature_preteuse && (
                  <p className="text-sm text-green-600 mt-2">✓ Signé et clôturé</p>
                )}
              </div>
            </div>
          </div>

          {clotureMoisCourant?.statut === 'cloture' && clotureMoisCourant?.pdf_url && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <a
                href={clotureMoisCourant.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-5 w-5 mr-2" />
                Télécharger le PDF
              </a>
            </div>
          )}
        </div>
      )}

      {(profile?.role === 'accueil' || profile?.role === 'preteuse') && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Clôtures en attente</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {clotures
              .filter(c => {
                if (profile?.role === 'accueil') {
                  return c.statut === 'attente_accueil';
                }
                if (profile?.role === 'preteuse') {
                  return c.statut === 'attente_preteuse';
                }
                return false;
              })
              .map((c) => (
                <div key={c.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {(c as any).salarie?.prenom} {(c as any).salarie?.nom}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(c.mois).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm">
                        <span className={c.signature_salarie ? 'text-green-600' : 'text-gray-400'}>
                          {c.signature_salarie ? '✓' : '○'} Salarié
                        </span>
                        <span className={c.signature_accueil ? 'text-green-600' : 'text-gray-400'}>
                          {c.signature_accueil ? '✓' : '○'} Accueil
                        </span>
                        <span className={c.signature_preteuse ? 'text-green-600' : 'text-gray-400'}>
                          {c.signature_preteuse ? '✓' : '○'} Prêteuse
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleClotureDetails(c.id, c.salarie_id, c.mois)}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                      >
                        {expandedClotureId === c.id ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            Masquer
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            Voir détails
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleExportCloturePDF(c)}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                      >
                        <FileDown className="h-4 w-4 mr-1" />
                        PDF
                      </button>
                      {profile?.role === 'accueil' && !c.signature_accueil && (
                        <button
                          onClick={() => handleSignerAccueil(c.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Signer
                        </button>
                      )}
                      {profile?.role === 'preteuse' && !c.signature_preteuse && (
                        <button
                          onClick={() => handleSignerPreteuse(c.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Clôturer
                        </button>
                      )}
                    </div>
                  </div>

                  {expandedClotureId === c.id && clotureDetails && (
                    <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé du mois</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Total des heures</p>
                            <p className="text-2xl font-bold text-gray-900">{clotureDetails.totalHeures}h</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Total des frais</p>
                            <p className="text-2xl font-bold text-gray-900">{clotureDetails.totalFrais.toFixed(2)} €</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Bilans hebdomadaires ({clotureDetails.bilans.length})</h4>
                        {clotureDetails.bilans.length > 0 ? (
                          <div className="space-y-3">
                            {clotureDetails.bilans.map((bilan: any) => (
                              <div key={bilan.id} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="text-sm font-medium text-gray-900">
                                    Semaine du {new Date(bilan.semaine_debut).toLocaleDateString('fr-FR')} au {new Date(bilan.semaine_fin).toLocaleDateString('fr-FR')}
                                  </p>
                                  <div className="flex space-x-2">
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                                      bilan.statut_accueil === 'valide' ? 'bg-green-100 text-green-800' :
                                      bilan.statut_accueil === 'refuse' ? 'bg-red-100 text-red-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      Accueil: {bilan.statut_accueil}
                                    </span>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                                      bilan.statut_preteuse === 'valide' ? 'bg-green-100 text-green-800' :
                                      bilan.statut_preteuse === 'refuse' ? 'bg-red-100 text-red-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      Prêteuse: {bilan.statut_preteuse}
                                    </span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-gray-600">École d'accueil</p>
                                    <p className="font-medium">{bilan.temps_ecole_accueil}h</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600">École prêteuse</p>
                                    <p className="font-medium">{bilan.temps_ecole_preteuse}h</p>
                                  </div>
                                </div>
                                {bilan.commentaire && (
                                  <p className="text-sm text-gray-600 mt-2 italic">Commentaire: {bilan.commentaire}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Aucun bilan hebdomadaire pour ce mois</p>
                        )}
                      </div>

                      <div>
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Heures travaillées ({clotureDetails.heures.length})</h4>
                        {clotureDetails.heures.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Heures</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {clotureDetails.heures.map((heure: any) => {
                                  const debut = new Date(`2000-01-01T${heure.heure_debut}`);
                                  const fin = new Date(`2000-01-01T${heure.heure_fin}`);
                                  const heures = (fin.getTime() - debut.getTime()) / (1000 * 60 * 60);
                                  return (
                                    <tr key={heure.id}>
                                      <td className="px-4 py-2 text-sm text-gray-900">{new Date(heure.date).toLocaleDateString('fr-FR')}</td>
                                      <td className="px-4 py-2 text-sm text-gray-900">{heure.heure_debut} - {heure.heure_fin}</td>
                                      <td className="px-4 py-2 text-sm text-gray-900">{heures.toFixed(1)}h</td>
                                      <td className="px-4 py-2 text-sm text-gray-600">{heure.commentaire || '-'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Aucune heure travaillée pour ce mois</p>
                        )}
                      </div>

                      <div>
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Frais ({clotureDetails.frais.length})</h4>
                        {clotureDetails.frais.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Montant</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {clotureDetails.frais.map((frais: any) => (
                                  <tr key={frais.id}>
                                    <td className="px-4 py-2 text-sm text-gray-900">{new Date(frais.date).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-4 py-2 text-sm text-gray-900">{frais.type_frais}</td>
                                    <td className="px-4 py-2 text-sm text-gray-900">{frais.montant_ttc.toFixed(2)} €</td>
                                    <td className="px-4 py-2 text-sm text-gray-600">{frais.description || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Aucun frais pour ce mois</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Historique des clôtures</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {clotures.map((c) => (
            <div key={c.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    {profile?.role !== 'salarie' && (
                      <p className="font-medium text-gray-900">
                        {(c as any).salarie?.prenom} {(c as any).salarie?.nom}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      {new Date(c.mois).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      c.statut === 'cloture' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {c.statut === 'cloture' ? 'Clôturé' : c.statut.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 mt-2 text-sm">
                    <span className={c.signature_salarie ? 'text-green-600' : 'text-gray-400'}>
                      {c.signature_salarie ? '✓' : '○'} Salarié
                    </span>
                    <span className={c.signature_accueil ? 'text-green-600' : 'text-gray-400'}>
                      {c.signature_accueil ? '✓' : '○'} Accueil
                    </span>
                    <span className={c.signature_preteuse ? 'text-green-600' : 'text-gray-400'}>
                      {c.signature_preteuse ? '✓' : '○'} Prêteuse
                    </span>
                    {c.date_cloture && (
                      <span className="text-gray-600">
                        • Clôturé le {new Date(c.date_cloture).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleClotureDetails(c.id, c.salarie_id, c.mois)}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                  >
                    {expandedClotureId === c.id ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" />
                        Masquer
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Voir détails
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleExportCloturePDF(c)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    PDF
                  </button>
                </div>
              </div>

              {expandedClotureId === c.id && clotureDetails && (
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé du mois</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Total des heures</p>
                        <p className="text-2xl font-bold text-gray-900">{clotureDetails.totalHeures}h</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Total des frais</p>
                        <p className="text-2xl font-bold text-gray-900">{clotureDetails.totalFrais.toFixed(2)} €</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Bilans hebdomadaires ({clotureDetails.bilans.length})</h4>
                    {clotureDetails.bilans.length > 0 ? (
                      <div className="space-y-3">
                        {clotureDetails.bilans.map((bilan: any) => (
                          <div key={bilan.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-sm font-medium text-gray-900">
                                Semaine du {new Date(bilan.semaine_debut).toLocaleDateString('fr-FR')} au {new Date(bilan.semaine_fin).toLocaleDateString('fr-FR')}
                              </p>
                              <div className="flex space-x-2">
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  bilan.statut_accueil === 'valide' ? 'bg-green-100 text-green-800' :
                                  bilan.statut_accueil === 'refuse' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  Accueil: {bilan.statut_accueil}
                                </span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  bilan.statut_preteuse === 'valide' ? 'bg-green-100 text-green-800' :
                                  bilan.statut_preteuse === 'refuse' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  Prêteuse: {bilan.statut_preteuse}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-gray-600">École d'accueil</p>
                                <p className="font-medium">{bilan.temps_ecole_accueil}h</p>
                              </div>
                              <div>
                                <p className="text-gray-600">École prêteuse</p>
                                <p className="font-medium">{bilan.temps_ecole_preteuse}h</p>
                              </div>
                            </div>
                            {bilan.commentaire && (
                              <p className="text-sm text-gray-600 mt-2 italic">Commentaire: {bilan.commentaire}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Aucun bilan hebdomadaire pour ce mois</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Heures travaillées ({clotureDetails.heures.length})</h4>
                    {clotureDetails.heures.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Heures</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {clotureDetails.heures.map((heure: any) => {
                              const debut = new Date(`2000-01-01T${heure.heure_debut}`);
                              const fin = new Date(`2000-01-01T${heure.heure_fin}`);
                              const heures = (fin.getTime() - debut.getTime()) / (1000 * 60 * 60);
                              return (
                                <tr key={heure.id}>
                                  <td className="px-4 py-2 text-sm text-gray-900">{new Date(heure.date).toLocaleDateString('fr-FR')}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900">{heure.heure_debut} - {heure.heure_fin}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900">{heures.toFixed(1)}h</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{heure.commentaire || '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Aucune heure travaillée pour ce mois</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Frais ({clotureDetails.frais.length})</h4>
                    {clotureDetails.frais.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Montant</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {clotureDetails.frais.map((frais: any) => (
                              <tr key={frais.id}>
                                <td className="px-4 py-2 text-sm text-gray-900">{new Date(frais.date).toLocaleDateString('fr-FR')}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{frais.type_frais}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{frais.montant_ttc.toFixed(2)} €</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{frais.description || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Aucun frais pour ce mois</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
