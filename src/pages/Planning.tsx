import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Planning as PlanningType } from '../lib/supabase';
import { Calendar, Check, X, Clock, Plus, Download } from 'lucide-react';
import { CalendarView } from '../components/CalendarView';

export const Planning: React.FC = () => {
  const { profile } = useAuth();
  const [planning, setPlanning] = useState<PlanningType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    salarie_id: '',
    date: '',
    heure_debut: '',
    heure_fin: ''
  });
  const [salaries, setSalaries] = useState<any[]>([]);
  const [selectedSalarieId, setSelectedSalarieId] = useState<string>('');

  useEffect(() => {
    loadPlanning();
    if (profile?.role === 'accueil' || profile?.role === 'preteuse') {
      loadSalaries();
    }
  }, [profile, selectedSalarieId]);

  const loadSalaries = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, nom, prenom')
      .eq('role', 'salarie');
    if (data) setSalaries(data);
  };

  const loadPlanning = async () => {
    try {
      let query = supabase
        .from('planning')
        .select(`
          *,
          salarie:profiles!planning_salarie_id_fkey(nom, prenom),
          valideur:profiles!planning_valide_par_fkey(nom, prenom)
        `)
        .order('date', { ascending: false });

      if (profile?.role === 'salarie') {
        query = query.eq('salarie_id', profile.id);
      } else if (selectedSalarieId && (profile?.role === 'accueil' || profile?.role === 'preteuse')) {
        query = query.eq('salarie_id', selectedSalarieId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPlanning(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProposer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('planning').insert([{
        ...formData,
        ecole_accueil_id: profile?.ecole_id || '',
        statut: 'propose',
        historique: [{
          action: 'propose',
          date: new Date().toISOString(),
          user_id: profile?.id
        }]
      }]);

      if (error) throw error;

      setShowForm(false);
      setFormData({
        salarie_id: '',
        date: '',
        heure_debut: '',
        heure_fin: ''
      });
      loadPlanning();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleValider = async (id: string) => {
    try {
      const planningItem = planning.find(p => p.id === id);
      const { error } = await supabase
        .from('planning')
        .update({
          statut: 'valide',
          valide_par: profile?.id,
          date_validation: new Date().toISOString(),
          historique: [
            ...(planningItem?.historique || []),
            {
              action: 'valide',
              date: new Date().toISOString(),
              user_id: profile?.id
            }
          ]
        })
        .eq('id', id);

      if (error) throw error;
      loadPlanning();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleRefuser = async (id: string, commentaire: string) => {
    try {
      const planningItem = planning.find(p => p.id === id);
      const { error } = await supabase
        .from('planning')
        .update({
          statut: 'refuse',
          valide_par: profile?.id,
          date_validation: new Date().toISOString(),
          commentaire_validation: commentaire,
          historique: [
            ...(planningItem?.historique || []),
            {
              action: 'refuse',
              date: new Date().toISOString(),
              user_id: profile?.id,
              commentaire
            }
          ]
        })
        .eq('id', id);

      if (error) throw error;
      loadPlanning();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const exportToGoogleCalendar = (planningItem: PlanningType) => {
    const startDateTime = new Date(`${planningItem.date}T${planningItem.heure_debut}`);
    const endDateTime = new Date(`${planningItem.date}T${planningItem.heure_fin}`);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const title = encodeURIComponent('Travail - École d\'accueil');
    const details = encodeURIComponent(`Planning validé pour la journée`);
    const dates = `${formatDate(startDateTime)}/${formatDate(endDateTime)}`;

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`;
    window.open(googleCalendarUrl, '_blank');
  };

  const exportAllToGoogleCalendar = () => {
    const planningValide = planning.filter(p => p.statut === 'valide');
    planningValide.forEach(p => exportToGoogleCalendar(p));
  };

  const downloadICalFile = () => {
    const planningValide = planning.filter(p => p.statut === 'valide');

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Gestion RH//Planning//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Planning École',
      'X-WR-TIMEZONE:Europe/Paris'
    ];

    planningValide.forEach(p => {
      const startDateTime = new Date(`${p.date}T${p.heure_debut}`);
      const endDateTime = new Date(`${p.date}T${p.heure_fin}`);

      const formatICalDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      icsContent.push(
        'BEGIN:VEVENT',
        `DTSTART:${formatICalDate(startDateTime)}`,
        `DTEND:${formatICalDate(endDateTime)}`,
        `SUMMARY:Travail - École d'accueil`,
        `DESCRIPTION:Planning validé`,
        `STATUS:CONFIRMED`,
        `SEQUENCE:0`,
        `UID:${p.id}@gestion-rh.fr`,
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `planning-${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Planning</h1>
        <div className="flex items-center space-x-3">
          {profile?.role === 'salarie' && planning.filter(p => p.statut === 'valide').length > 0 && (
            <>
              <button
                onClick={downloadICalFile}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Download className="h-5 w-5 mr-2" />
                Télécharger (.ics)
              </button>
              <button
                onClick={exportAllToGoogleCalendar}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Calendar className="h-5 w-5 mr-2" />
                Exporter vers Google Agenda
              </button>
            </>
          )}
          {(profile?.role === 'accueil' || profile?.role === 'preteuse') && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              {profile?.role === 'preteuse' ? 'Créer un planning' : 'Proposer un planning'}
            </button>
          )}
        </div>
      </div>

      {(profile?.role === 'accueil' || profile?.role === 'preteuse') && (
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Voir le planning d'un salarié
          </label>
          <select
            value={selectedSalarieId}
            onChange={(e) => setSelectedSalarieId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les salariés (vue tableau)</option>
            {salaries.map(s => (
              <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>
            ))}
          </select>
        </div>
      )}

      {showForm && (profile?.role === 'accueil' || profile?.role === 'preteuse') && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Nouveau planning</h2>
          <form onSubmit={handleProposer} className="space-y-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Heure début</label>
                <input
                  type="time"
                  value={formData.heure_debut}
                  onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heure fin</label>
                <input
                  type="time"
                  value={formData.heure_fin}
                  onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
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
                Proposer
              </button>
            </div>
          </form>
        </div>
      )}

      {(profile?.role === 'salarie' || selectedSalarieId) ? (
        <CalendarView
          planning={planning}
          onExportToGoogleCalendar={exportToGoogleCalendar}
          showGoogleCalendar={profile?.role === 'salarie'}
        />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salarié</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heures</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {planning.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(p as any).salarie?.prenom} {(p as any).salarie?.nom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(p.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        {p.heure_debut} - {p.heure_fin}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        p.statut === 'valide' ? 'bg-green-100 text-green-800' :
                        p.statut === 'refuse' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {p.statut === 'valide' ? 'Validé' : p.statut === 'refuse' ? 'Refusé' : 'Proposé'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        {profile?.role === 'preteuse' && p.statut === 'propose' && (
                          <>
                            <button
                              onClick={() => handleValider(p.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Valider"
                            >
                              <Check className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                const commentaire = prompt('Raison du refus:');
                                if (commentaire) handleRefuser(p.id, commentaire);
                              }}
                              className="text-red-600 hover:text-red-800"
                              title="Refuser"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
