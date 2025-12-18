import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import { Planning, supabase } from '../lib/supabase';

interface CalendarViewProps {
  planning: Planning[];
  onExportToGoogleCalendar: (planningItem: Planning) => void;
  showGoogleCalendar?: boolean;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    date?: string;
  };
  end: {
    dateTime: string;
    date?: string;
  };
}

export const CalendarView: React.FC<CalendarViewProps> = ({ planning, onExportToGoogleCalendar, showGoogleCalendar = true }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoadingGoogleEvents, setIsLoadingGoogleEvents] = useState(false);
  const [googleCalendarError, setGoogleCalendarError] = useState<string | null>(null);

  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentDate);
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  const fetchGoogleCalendarEvents = async () => {
    setIsLoadingGoogleEvents(true);
    setGoogleCalendarError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setGoogleCalendarError('Session non trouvée');
        return;
      }

      const weekStart = weekDates[0];
      const weekEnd = new Date(weekDates[6]);
      weekEnd.setHours(23, 59, 59);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`;
      const response = await fetch(
        `${apiUrl}?action=fetch-events&timeMin=${weekStart.toISOString()}&timeMax=${weekEnd.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setGoogleEvents(data.events || []);
        console.log('Événements Google Calendar chargés:', data.events?.length || 0);
      } else {
        setGoogleCalendarError(data.error || 'Erreur lors du chargement');
        console.error('Erreur Google Calendar:', data.error);
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Erreur de connexion';
      setGoogleCalendarError(errorMsg);
      console.error('Erreur chargement événements Google:', error);
    } finally {
      setIsLoadingGoogleEvents(false);
    }
  };

  useEffect(() => {
    if (showGoogleCalendar) {
      fetchGoogleCalendarEvents();
    }
  }, [currentDate, showGoogleCalendar]);

  const getPlanningForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return planning.filter(p => p.date === dateStr && p.statut === 'valide');
  };

  const getGoogleEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return googleEvents.filter(event => {
      const eventDate = event.start.dateTime || event.start.date;
      return eventDate && eventDate.startsWith(dateStr);
    });
  };

  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getMonthYear = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    if (start.getMonth() === end.getMonth()) {
      return start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    return `${start.toLocaleDateString('fr-FR', { month: 'short' })} - ${end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
        <button
          onClick={previousWeek}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900 capitalize">{getMonthYear()}</h2>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Aujourd'hui
          </button>
          {showGoogleCalendar && (
            <button
              onClick={fetchGoogleCalendarEvents}
              disabled={isLoadingGoogleEvents}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingGoogleEvents ? 'animate-spin' : ''}`} />
              <span>Synchroniser</span>
            </button>
          )}
        </div>

        <button
          onClick={nextWeek}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {showGoogleCalendar && googleCalendarError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Google Calendar non connecté</h3>
              <p className="mt-1 text-sm text-yellow-700">{googleCalendarError}</p>
              <p className="mt-2 text-sm text-yellow-600">
                Allez dans Paramètres pour connecter votre compte Google Calendar
              </p>
            </div>
          </div>
        </div>
      )}

      {showGoogleCalendar && !googleCalendarError && googleEvents.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            {googleEvents.length} événement(s) Google Calendar chargé(s)
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-8 border-b border-gray-200">
          <div className="p-4 bg-gray-50 border-r border-gray-200">
            <span className="text-sm font-medium text-gray-500">Heure</span>
          </div>
          {weekDates.map((date, index) => (
            <div
              key={index}
              className={`p-4 text-center border-r border-gray-200 ${
                isToday(date) ? 'bg-blue-50' : 'bg-gray-50'
              }`}
            >
              <div className="text-sm font-medium text-gray-500">
                {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </div>
              <div className={`text-lg font-semibold ${
                isToday(date) ? 'text-blue-600' : 'text-gray-900'
              }`}>
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-y-auto max-h-[600px]">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-200">
              <div className="p-4 bg-gray-50 border-r border-gray-200 flex items-start justify-center">
                <span className="text-sm text-gray-600">{hour}:00</span>
              </div>
              {weekDates.map((date, dateIndex) => {
                const dayPlanning = getPlanningForDate(date);
                const hourPlanning = dayPlanning.filter(p => {
                  const startHour = parseInt(p.heure_debut.split(':')[0]);
                  const endHour = parseInt(p.heure_fin.split(':')[0]);
                  return hour >= startHour && hour < endHour;
                });

                const dayGoogleEvents = showGoogleCalendar ? getGoogleEventsForDate(date) : [];
                const hourGoogleEvents = dayGoogleEvents.filter(event => {
                  const startTime = new Date(event.start.dateTime || event.start.date!);
                  const endTime = new Date(event.end.dateTime || event.end.date!);
                  const startHour = startTime.getHours();
                  const endHour = endTime.getHours();
                  return hour >= startHour && hour < endHour;
                });

                return (
                  <div
                    key={dateIndex}
                    className={`p-2 border-r border-gray-200 min-h-[60px] ${
                      isToday(date) ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {hourPlanning.map((p) => {
                      const startHour = parseInt(p.heure_debut.split(':')[0]);
                      if (hour === startHour) {
                        return (
                          <div
                            key={p.id}
                            className="relative bg-green-100 border-l-4 border-green-500 rounded p-2 mb-1 group cursor-pointer hover:bg-green-200 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-xs font-semibold text-green-900">
                                  {p.heure_debut} - {p.heure_fin}
                                </div>
                                <div className="text-xs text-green-700 mt-1">
                                  École d'accueil
                                </div>
                              </div>
                              {showGoogleCalendar && (
                                <button
                                  onClick={() => onExportToGoogleCalendar(p)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                                  title="Ajouter à Google Agenda"
                                >
                                  <CalendarIcon className="h-4 w-4 text-green-700" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                    {hourGoogleEvents.map((event) => {
                      const startTime = new Date(event.start.dateTime || event.start.date!);
                      const startHour = startTime.getHours();
                      if (hour === startHour) {
                        return (
                          <div
                            key={event.id}
                            className="relative bg-blue-100 border-l-4 border-blue-500 rounded p-2 mb-1 cursor-pointer hover:bg-blue-200 transition-colors"
                            title={event.description || event.summary}
                          >
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-blue-900">
                                {startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end.dateTime || event.end.date!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="text-xs text-blue-700 mt-1">
                                {event.summary}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
