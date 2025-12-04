import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, Save, Info, Link2, Unlink } from 'lucide-react';

export const Parametres: React.FC = () => {
  const { profile } = useAuth();
  const [googleCalendarId, setGoogleCalendarId] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (profile?.google_calendar_id) {
      setGoogleCalendarId(profile.google_calendar_id);
    }
    if ((profile as any)?.google_calendar_sync_enabled) {
      setGoogleConnected(true);
    }
  }, [profile]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'google-calendar-connected') {
        setGoogleConnected(true);
        setConnectingGoogle(false);
        setMessage({ type: 'success', text: 'Google Calendar connecté avec succès!' });
        window.location.reload();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-oauth`;
      const response = await fetch(`${apiUrl}?action=get-auth-url`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Erreur lors de la récupération de l\'URL d\'authentification');

      const { authUrl } = await response.json();
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      window.open(
        authUrl,
        'Google Calendar Auth',
        `width=${width},height=${height},top=${top},left=${left}`
      );

      setMessage({ type: 'success', text: 'Veuillez autoriser l\'accès à Google Calendar dans la fenêtre qui s\'est ouverte' });
    } catch (error) {
      console.error('Erreur:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la connexion à Google Calendar' });
      setConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-oauth`;
      const response = await fetch(`${apiUrl}?action=disconnect`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Erreur lors de la déconnexion');

      setGoogleConnected(false);
      setMessage({ type: 'success', text: 'Google Calendar déconnecté avec succès' });
    } catch (error) {
      console.error('Erreur:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la déconnexion' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ google_calendar_id: googleCalendarId || null })
        .eq('id', profile?.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Paramètres enregistrés avec succès' });
    } catch (error) {
      console.error('Erreur:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'enregistrement' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600 mt-2">Configurez vos préférences et intégrations</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <Calendar className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Synchronisation Google Calendar</h2>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Connexion à Google Calendar</h3>
              <p className="text-sm text-gray-600 mt-1">
                {googleConnected
                  ? 'Votre compte Google Calendar est connecté. Vos événements seront synchronisés automatiquement.'
                  : 'Connectez votre compte Google Calendar pour synchroniser automatiquement vos plannings.'
                }
              </p>
            </div>
            {googleConnected ? (
              <button
                onClick={handleDisconnectGoogle}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Unlink className="h-5 w-5 mr-2" />
                Déconnecter
              </button>
            ) : (
              <button
                onClick={handleConnectGoogle}
                disabled={connectingGoogle}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Link2 className="h-5 w-5 mr-2" />
                {connectingGoogle ? 'Connexion...' : 'Connecter'}
              </button>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export manuel vers Google Agenda</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <Info className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Comment trouver votre ID de calendrier Google :</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Ouvrez Google Agenda sur votre ordinateur</li>
                <li>Dans la liste de gauche, trouvez le calendrier que vous souhaitez synchroniser</li>
                <li>Cliquez sur les trois points à côté du nom du calendrier</li>
                <li>Sélectionnez "Paramètres et partage"</li>
                <li>Faites défiler jusqu'à "Intégrer l'agenda"</li>
                <li>Copiez l'ID du calendrier (ressemble à : votre-email@gmail.com ou xxxxx@group.calendar.google.com)</li>
              </ol>
            </div>
          </div>
        </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID de votre calendrier Google
              </label>
              <input
                type="text"
                value={googleCalendarId}
                onChange={(e) => setGoogleCalendarId(e.target.value)}
                placeholder="votre-email@gmail.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-2">
                Une fois configuré, vos missions planifiées seront synchronisées avec votre Google Agenda.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-5 w-5 mr-2" />
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Informations du profil</h2>
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-500">Nom complet :</span>
            <p className="text-gray-900">{profile?.prenom} {profile?.nom}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Email :</span>
            <p className="text-gray-900">{profile?.email}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Rôle :</span>
            <p className="text-gray-900 capitalize">{profile?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
