import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Building2, Users, Plus, Pencil, Trash2, KeyRound, Shield } from 'lucide-react';

interface Ecole {
  id: string;
  nom: string;
  adresse: string;
  contact_nom: string;
  contact_email: string;
  contact_telephone: string;
  created_at: string;
}

interface Salarie {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  ecole_id: string | null;
  created_at: string;
  ecoles?: { nom: string } | null;
}

interface Utilisateur {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'accueil' | 'preteuse' | 'salarie';
  ecole_id: string | null;
  created_at: string;
  ecoles?: { nom: string } | null;
}

export const Administration: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'ecoles' | 'salaries' | 'utilisateurs'>('ecoles');
  const [ecoles, setEcoles] = useState<Ecole[]>([]);
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEcoleForm, setShowEcoleForm] = useState(false);
  const [showSalarieForm, setShowSalarieForm] = useState(false);
  const [showUtilisateurForm, setShowUtilisateurForm] = useState(false);
  const [editingEcole, setEditingEcole] = useState<Ecole | null>(null);
  const [editingSalarie, setEditingSalarie] = useState<Salarie | null>(null);
  const [editingUtilisateur, setEditingUtilisateur] = useState<Utilisateur | null>(null);

  const [ecoleForm, setEcoleForm] = useState({
    nom: '',
    adresse: '',
    contact_nom: '',
    contact_email: '',
    contact_telephone: ''
  });

  const [salarieForm, setSalarieForm] = useState({
    email: '',
    nom: '',
    prenom: '',
    ecole_id: '',
    mot_de_passe: ''
  });

  const [utilisateurForm, setUtilisateurForm] = useState({
    email: '',
    nom: '',
    prenom: '',
    role: 'salarie' as 'accueil' | 'preteuse' | 'salarie',
    ecole_id: '',
    mot_de_passe: ''
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<Utilisateur | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadEcoles();
    loadSalaries();
    loadUtilisateurs();
  }, []);

  const loadEcoles = async () => {
    try {
      const { data, error } = await supabase
        .from('ecoles')
        .select('*')
        .order('nom');
      if (error) throw error;
      setEcoles(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSalaries = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          ecoles(nom)
        `)
        .eq('role', 'salarie')
        .order('nom');
      if (error) throw error;
      setSalaries(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadUtilisateurs = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          ecoles(nom)
        `)
        .order('role', { ascending: true })
        .order('nom');
      if (error) throw error;
      setUtilisateurs(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleSaveEcole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEcole) {
        const { error } = await supabase
          .from('ecoles')
          .update(ecoleForm)
          .eq('id', editingEcole.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ecoles')
          .insert([ecoleForm]);
        if (error) throw error;
      }

      setShowEcoleForm(false);
      setEditingEcole(null);
      setEcoleForm({
        nom: '',
        adresse: '',
        contact_nom: '',
        contact_email: '',
        contact_telephone: ''
      });
      loadEcoles();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleEditEcole = (ecole: Ecole) => {
    setEditingEcole(ecole);
    setEcoleForm({
      nom: ecole.nom,
      adresse: ecole.adresse,
      contact_nom: ecole.contact_nom,
      contact_email: ecole.contact_email,
      contact_telephone: ecole.contact_telephone
    });
    setShowEcoleForm(true);
  };

  const handleDeleteEcole = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette école ?')) return;

    try {
      const { error } = await supabase
        .from('ecoles')
        .delete()
        .eq('id', id);
      if (error) throw error;
      loadEcoles();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Impossible de supprimer cette école. Elle est peut-être liée à des salariés.');
    }
  };

  const handleSaveSalarie = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Début création salarié');

    try {
      if (editingSalarie) {
        const { error } = await supabase
          .from('profiles')
          .update({
            nom: salarieForm.nom,
            prenom: salarieForm.prenom,
            ecole_id: salarieForm.ecole_id || null
          })
          .eq('id', editingSalarie.id);
        if (error) throw error;
        alert('Salarié modifié avec succès!');
      } else {
        console.log('Tentative de création utilisateur avec:', salarieForm.email);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Session non disponible');
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: salarieForm.email,
            password: salarieForm.mot_de_passe,
            nom: salarieForm.nom,
            prenom: salarieForm.prenom,
            ecole_id: salarieForm.ecole_id || null
          })
        });

        const result = await response.json();
        console.log('Résultat API:', result);

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Erreur lors de la création');
        }

        alert('Salarié créé avec succès!');
      }

      setShowSalarieForm(false);
      setEditingSalarie(null);
      setSalarieForm({
        email: '',
        nom: '',
        prenom: '',
        ecole_id: '',
        mot_de_passe: ''
      });

      setTimeout(() => {
        loadSalaries();
      }, 1000);
    } catch (error: any) {
      console.error('Erreur complète:', error);
      alert(error.message || 'Une erreur est survenue lors de la création du salarié');
    }
  };

  const handleEditSalarie = (salarie: Salarie) => {
    setEditingSalarie(salarie);
    setSalarieForm({
      email: salarie.email,
      nom: salarie.nom,
      prenom: salarie.prenom,
      ecole_id: salarie.ecole_id || '',
      mot_de_passe: ''
    });
    setShowSalarieForm(true);
  };

  const handleDeleteSalarie = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce salarié ?')) return;

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.admin.deleteUser(id);
      if (authError) console.warn('Erreur suppression auth:', authError);

      loadSalaries();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Impossible de supprimer ce salarié.');
    }
  };

  const handleSaveUtilisateur = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUtilisateur) {
        const { error } = await supabase
          .from('profiles')
          .update({
            nom: utilisateurForm.nom,
            prenom: utilisateurForm.prenom,
            role: utilisateurForm.role,
            ecole_id: utilisateurForm.ecole_id || null
          })
          .eq('id', editingUtilisateur.id);
        if (error) throw error;
        alert('Utilisateur modifié avec succès!');
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Session non disponible');
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: utilisateurForm.email,
            password: utilisateurForm.mot_de_passe,
            nom: utilisateurForm.nom,
            prenom: utilisateurForm.prenom,
            role: utilisateurForm.role,
            ecole_id: utilisateurForm.ecole_id || null
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Erreur lors de la création');
        }

        alert('Utilisateur créé avec succès!');
      }

      setShowUtilisateurForm(false);
      setEditingUtilisateur(null);
      setUtilisateurForm({
        email: '',
        nom: '',
        prenom: '',
        role: 'salarie',
        ecole_id: '',
        mot_de_passe: ''
      });

      setTimeout(() => {
        loadUtilisateurs();
        loadSalaries();
      }, 1000);
    } catch (error: any) {
      console.error('Erreur complète:', error);
      alert(error.message || 'Une erreur est survenue');
    }
  };

  const handleEditUtilisateur = (utilisateur: Utilisateur) => {
    setEditingUtilisateur(utilisateur);
    setUtilisateurForm({
      email: utilisateur.email,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      role: utilisateur.role,
      ecole_id: utilisateur.ecole_id || '',
      mot_de_passe: ''
    });
    setShowUtilisateurForm(true);
  };

  const handleDeleteUtilisateur = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.admin.deleteUser(id);
      if (authError) console.warn('Erreur suppression auth:', authError);

      loadUtilisateurs();
      loadSalaries();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Impossible de supprimer cet utilisateur.');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserForPassword) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session non disponible');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-password`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserForPassword.id,
          newPassword: newPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la mise à jour du mot de passe');
      }

      alert('Mot de passe modifié avec succès!');
      setShowPasswordModal(false);
      setSelectedUserForPassword(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(error.message || 'Une erreur est survenue');
    }
  };

  if (profile?.role !== 'preteuse' && profile?.role !== 'accueil') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Accès réservé aux administrateurs</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('ecoles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ecoles'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building2 className="inline-block h-5 w-5 mr-2" />
            Écoles bénéficiaires
          </button>
          <button
            onClick={() => setActiveTab('utilisateurs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'utilisateurs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="inline-block h-5 w-5 mr-2" />
            Tous les utilisateurs
          </button>
          <button
            onClick={() => setActiveTab('salaries')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'salaries'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="inline-block h-5 w-5 mr-2" />
            Salariés
          </button>
        </nav>
      </div>

      {activeTab === 'ecoles' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingEcole(null);
                setEcoleForm({
                  nom: '',
                  adresse: '',
                  contact_nom: '',
                  contact_email: '',
                  contact_telephone: ''
                });
                setShowEcoleForm(!showEcoleForm);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nouvelle école
            </button>
          </div>

          {showEcoleForm && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingEcole ? 'Modifier l\'école' : 'Nouvelle école'}
              </h2>
              <form onSubmit={handleSaveEcole} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom de l'école</label>
                  <input
                    type="text"
                    value={ecoleForm.nom}
                    onChange={(e) => setEcoleForm({ ...ecoleForm, nom: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                  <input
                    type="text"
                    value={ecoleForm.adresse}
                    onChange={(e) => setEcoleForm({ ...ecoleForm, adresse: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact - Nom</label>
                    <input
                      type="text"
                      value={ecoleForm.contact_nom}
                      onChange={(e) => setEcoleForm({ ...ecoleForm, contact_nom: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact - Email</label>
                    <input
                      type="email"
                      value={ecoleForm.contact_email}
                      onChange={(e) => setEcoleForm({ ...ecoleForm, contact_email: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact - Téléphone</label>
                    <input
                      type="tel"
                      value={ecoleForm.contact_telephone}
                      onChange={(e) => setEcoleForm({ ...ecoleForm, contact_telephone: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEcoleForm(false);
                      setEditingEcole(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingEcole ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adresse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ecoles.map((ecole) => (
                  <tr key={ecole.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {ecole.nom}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {ecole.adresse}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>{ecole.contact_nom}</div>
                      <div className="text-gray-500">{ecole.contact_email}</div>
                      <div className="text-gray-500">{ecole.contact_telephone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditEcole(ecole)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Modifier"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEcole(ecole.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Supprimer"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'utilisateurs' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingUtilisateur(null);
                setUtilisateurForm({
                  email: '',
                  nom: '',
                  prenom: '',
                  role: 'salarie',
                  ecole_id: '',
                  mot_de_passe: ''
                });
                setShowUtilisateurForm(!showUtilisateurForm);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nouvel utilisateur
            </button>
          </div>

          {showUtilisateurForm && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingUtilisateur ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h2>
              <form onSubmit={handleSaveUtilisateur} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={utilisateurForm.email}
                      onChange={(e) => setUtilisateurForm({ ...utilisateurForm, email: e.target.value })}
                      required
                      disabled={!!editingUtilisateur}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  {!editingUtilisateur && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
                      <input
                        type="password"
                        value={utilisateurForm.mot_de_passe}
                        onChange={(e) => setUtilisateurForm({ ...utilisateurForm, mot_de_passe: e.target.value })}
                        required
                        minLength={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                    <input
                      type="text"
                      value={utilisateurForm.nom}
                      onChange={(e) => setUtilisateurForm({ ...utilisateurForm, nom: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                    <input
                      type="text"
                      value={utilisateurForm.prenom}
                      onChange={(e) => setUtilisateurForm({ ...utilisateurForm, prenom: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
                    <select
                      value={utilisateurForm.role}
                      onChange={(e) => setUtilisateurForm({ ...utilisateurForm, role: e.target.value as 'accueil' | 'preteuse' | 'salarie' })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="salarie">Salarié</option>
                      <option value="preteuse">Prêteuse</option>
                      <option value="accueil">Accueil</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">École prêteuse (optionnel)</label>
                  <select
                    value={utilisateurForm.ecole_id}
                    onChange={(e) => setUtilisateurForm({ ...utilisateurForm, ecole_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Aucune école</option>
                    {ecoles.map(e => (
                      <option key={e.id} value={e.id}>{e.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUtilisateurForm(false);
                      setEditingUtilisateur(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingUtilisateur ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">École</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {utilisateurs.map((utilisateur) => (
                  <tr key={utilisateur.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {utilisateur.prenom} {utilisateur.nom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {utilisateur.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        utilisateur.role === 'accueil'
                          ? 'bg-purple-100 text-purple-800'
                          : utilisateur.role === 'preteuse'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {utilisateur.role === 'accueil' ? 'Accueil' : utilisateur.role === 'preteuse' ? 'Prêteuse' : 'Salarié'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {utilisateur.ecoles?.nom || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditUtilisateur(utilisateur)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Modifier"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUserForPassword(utilisateur);
                            setShowPasswordModal(true);
                            setNewPassword('');
                          }}
                          className="text-orange-600 hover:text-orange-800"
                          title="Changer le mot de passe"
                        >
                          <KeyRound className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUtilisateur(utilisateur.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Supprimer"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'salaries' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingSalarie(null);
                setSalarieForm({
                  email: '',
                  nom: '',
                  prenom: '',
                  ecole_id: '',
                  mot_de_passe: ''
                });
                setShowSalarieForm(!showSalarieForm);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nouveau salarié
            </button>
          </div>

          {showSalarieForm && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingSalarie ? 'Modifier le salarié' : 'Nouveau salarié'}
              </h2>
              <form onSubmit={handleSaveSalarie} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={salarieForm.email}
                      onChange={(e) => setSalarieForm({ ...salarieForm, email: e.target.value })}
                      required
                      disabled={!!editingSalarie}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  {!editingSalarie && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
                      <input
                        type="password"
                        value={salarieForm.mot_de_passe}
                        onChange={(e) => setSalarieForm({ ...salarieForm, mot_de_passe: e.target.value })}
                        required
                        minLength={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                    <input
                      type="text"
                      value={salarieForm.nom}
                      onChange={(e) => setSalarieForm({ ...salarieForm, nom: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                    <input
                      type="text"
                      value={salarieForm.prenom}
                      onChange={(e) => setSalarieForm({ ...salarieForm, prenom: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">École prêteuse (optionnel)</label>
                  <select
                    value={salarieForm.ecole_id}
                    onChange={(e) => setSalarieForm({ ...salarieForm, ecole_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Aucune école</option>
                    {ecoles.map(e => (
                      <option key={e.id} value={e.id}>{e.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSalarieForm(false);
                      setEditingSalarie(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingSalarie ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">École prêteuse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salaries.map((salarie) => (
                  <tr key={salarie.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {salarie.prenom} {salarie.nom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {salarie.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {salarie.ecoles?.nom || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditSalarie(salarie)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Modifier"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSalarie(salarie.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Supprimer"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPasswordModal && selectedUserForPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">
              Changer le mot de passe
            </h2>
            <p className="text-gray-600 mb-4">
              Utilisateur : <span className="font-medium">{selectedUserForPassword.prenom} {selectedUserForPassword.nom}</span>
            </p>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 6 caractères"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setSelectedUserForPassword(null);
                    setNewPassword('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Changer le mot de passe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
