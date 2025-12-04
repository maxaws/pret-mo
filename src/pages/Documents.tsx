import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Document } from '../lib/supabase';
import { FolderLock, Upload, FileText, Download, Filter } from 'lucide-react';

export const Documents: React.FC = () => {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterMois, setFilterMois] = useState('');
  const [formData, setFormData] = useState({
    type_document: '',
    fichier_url: '',
    mois: ''
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      let query = supabase
        .from('documents')
        .select(`
          *,
          uploader:profiles!documents_upload_par_fkey(nom, prenom)
        `)
        .order('date_upload', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('documents').insert([{
        type_document: formData.type_document,
        fichier_url: formData.fichier_url,
        mois: formData.mois || null,
        upload_par: profile?.id
      }]);

      if (error) throw error;

      setShowForm(false);
      setFormData({
        type_document: '',
        fichier_url: '',
        mois: ''
      });
      loadDocuments();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  const filteredDocuments = documents.filter(doc => {
    if (filterType && doc.type_document !== filterType) return false;
    if (filterMois && doc.mois !== filterMois) return false;
    return true;
  });

  const uniqueTypes = Array.from(new Set(documents.map(d => d.type_document)));
  const uniqueMois = Array.from(new Set(documents.map(d => d.mois).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Coffre-fort documentaire</h1>
        {profile?.role === 'preteuse' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-5 w-5 mr-2" />
            Ajouter un document
          </button>
        )}
      </div>

      {showForm && profile?.role === 'preteuse' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Nouveau document</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de document</label>
              <select
                value={formData.type_document}
                onChange={(e) => setFormData({ ...formData, type_document: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner un type</option>
                <option value="contrat">Contrat</option>
                <option value="avenant">Avenant</option>
                <option value="cloture">Clôture mensuelle</option>
                <option value="justificatif">Justificatif</option>
                <option value="rapport">Rapport</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">URL du fichier</label>
              <input
                type="url"
                value={formData.fichier_url}
                onChange={(e) => setFormData({ ...formData, fichier_url: e.target.value })}
                required
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mois (optionnel)</label>
              <input
                type="month"
                value={formData.mois}
                onChange={(e) => setFormData({ ...formData, mois: e.target.value })}
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
                Ajouter
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtres:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={filterMois}
            onChange={(e) => setFilterMois(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les mois</option>
            {uniqueMois.map(mois => (
              <option key={mois} value={mois}>
                {new Date(mois!).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
          {(filterType || filterMois) && (
            <button
              onClick={() => {
                setFilterType('');
                setFilterMois('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {doc.type_document}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(doc.date_upload).toLocaleDateString('fr-FR')}
                  </p>
                  {doc.mois && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(doc.mois).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Par: {(doc as any).uploader?.prenom} {(doc as any).uploader?.nom}
                  </p>
                  <a
                    href={doc.fichier_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center mt-3 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Télécharger
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <FolderLock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun document trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
};
