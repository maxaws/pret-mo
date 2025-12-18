import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lock } from 'lucide-react';

export const Connexion: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const profile = await signIn(email, password);

      if (profile.role === 'preteuse' || profile.role === 'compta') {
        navigate('/tableau-de-bord');
      } else if (profile.role === 'salarie') {
        navigate('/planning');
      } else if (profile.role === 'accueil') {
        navigate('/planning');
      } else {
        navigate('/planning');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);
    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi de l\'email');
      }

      setResetMessage({
        type: 'success',
        text: 'Un email de réinitialisation a été envoyé à votre adresse. Vérifiez votre boîte de réception.'
      });
      setResetEmail('');
    } catch (err: any) {
      setResetMessage({
        type: 'error',
        text: err.message || 'Erreur lors de l\'envoi de l\'email'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion RH</h1>
          <p className="text-gray-600 mt-2">Prêt de main-d'œuvre à but non lucratif</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {!showForgotPassword ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Connexion</h2>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  Application de gestion du prêt de main-d'œuvre entre écoles
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Réinitialiser le mot de passe</h2>

              {resetMessage && (
                <div className={`mb-4 p-4 rounded-lg ${
                  resetMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${
                    resetMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {resetMessage.text}
                  </p>
                </div>
              )}

              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div>
                  <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse email
                  </label>
                  <input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="votre@email.com"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Un lien de réinitialisation sera envoyé à cette adresse.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetMessage(null);
                    setResetEmail('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Retour à la connexion
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
