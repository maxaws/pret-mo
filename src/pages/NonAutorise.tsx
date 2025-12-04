import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

export const NonAutorise: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <ShieldOff className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Accès non autorisé</h1>
        <p className="text-gray-600 mb-6">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </p>
        <button
          onClick={() => navigate('/tableau-de-bord')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retour au tableau de bord
        </button>
      </div>
    </div>
  );
};
