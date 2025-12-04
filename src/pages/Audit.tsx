import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, AuditLog } from '../lib/supabase';
import { History, Filter, Search } from 'lucide-react';

export const Audit: React.FC = () => {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTable, setFilterTable] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [searchUser, setSearchUser] = useState('');

  useEffect(() => {
    if (profile?.role === 'preteuse') {
      loadLogs();
    }
  }, [profile]);

  const loadLogs = async () => {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:profiles!audit_logs_user_id_fkey(nom, prenom, email)
        `)
        .order('timestamp', { ascending: false })
        .limit(500);

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'preteuse') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Accès non autorisé</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  const filteredLogs = logs.filter(log => {
    if (filterTable && log.table_name !== filterTable) return false;
    if (filterAction && log.action !== filterAction) return false;
    if (searchUser && !(log as any).user) return false;
    if (searchUser) {
      const user = (log as any).user;
      const searchLower = searchUser.toLowerCase();
      if (!user.nom.toLowerCase().includes(searchLower) &&
          !user.prenom.toLowerCase().includes(searchLower) &&
          !user.email.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    return true;
  });

  const uniqueTables = Array.from(new Set(logs.map(l => l.table_name)));
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Audit des modifications</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <History className="h-5 w-5" />
          <span>{logs.length} entrées</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtres:</span>
          <select
            value={filterTable}
            onChange={(e) => setFilterTable(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Toutes les tables</option>
            {uniqueTables.map(table => (
              <option key={table} value={table}>{table}</option>
            ))}
          </select>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Toutes les actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              placeholder="Rechercher un utilisateur..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {(filterTable || filterAction || searchUser) && (
            <button
              onClick={() => {
                setFilterTable('');
                setFilterAction('');
                setSearchUser('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Heure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Table</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Détails</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{new Date(log.timestamp).toLocaleDateString('fr-FR')}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(log as any).user ? (
                      <div>
                        <div>{(log as any).user.prenom} {(log as any).user.nom}</div>
                        <div className="text-xs text-gray-500">{(log as any).user.email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Système</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                      {log.table_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      log.action === 'INSERT' ? 'bg-green-100 text-green-800' :
                      log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                      log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <details className="cursor-pointer">
                      <summary className="text-blue-600 hover:text-blue-800">Voir les changements</summary>
                      <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono max-w-md overflow-auto">
                        {log.ancienne_valeur && (
                          <div className="mb-2">
                            <div className="font-semibold text-red-600 mb-1">Avant:</div>
                            <pre className="whitespace-pre-wrap">{JSON.stringify(log.ancienne_valeur, null, 2)}</pre>
                          </div>
                        )}
                        {log.nouvelle_valeur && (
                          <div>
                            <div className="font-semibold text-green-600 mb-1">Après:</div>
                            <pre className="whitespace-pre-wrap">{JSON.stringify(log.nouvelle_valeur, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucune entrée d'audit trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
};
