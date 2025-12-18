import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Impossible de rafraîchir le token');
  }

  return await response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('Authentification requise');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('google_access_token, google_refresh_token, google_token_expiry, google_calendar_sync_enabled')
      .eq('id', user.id)
      .single();

    if (!profile?.google_calendar_sync_enabled || !profile.google_access_token) {
      throw new Error('Google Calendar non connecté');
    }

    let accessToken = profile.google_access_token;

    if (profile.google_token_expiry && new Date(profile.google_token_expiry) <= new Date()) {
      if (!profile.google_refresh_token) {
        throw new Error('Token expiré et aucun refresh token disponible');
      }

      const newTokens = await refreshAccessToken(profile.google_refresh_token);
      accessToken = newTokens.access_token;

      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + newTokens.expires_in);

      await supabaseClient
        .from('profiles')
        .update({
          google_access_token: accessToken,
          google_token_expiry: expiryDate.toISOString(),
        })
        .eq('id', user.id);
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'fetch-events') {
      const timeMin = url.searchParams.get('timeMin') || new Date().toISOString();
      const timeMax = url.searchParams.get('timeMax');

      let calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&` +
        `singleEvents=true&` +
        `orderBy=startTime`;

      if (timeMax) {
        calendarUrl += `&timeMax=${encodeURIComponent(timeMax)}`;
      }

      const response = await fetch(calendarUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur API Google Calendar:', response.status, errorText);
        throw new Error(`Erreur API Google (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      return new Response(
        JSON.stringify({ success: true, events: data.items }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'create-event') {
      const { summary, description, start, end } = await req.json();

      const event = {
        summary,
        description,
        start: {
          dateTime: start,
          timeZone: 'Europe/Paris',
        },
        end: {
          dateTime: end,
          timeZone: 'Europe/Paris',
        },
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erreur création événement: ${error}`);
      }

      const createdEvent = await response.json();

      return new Response(
        JSON.stringify({ success: true, event: createdEvent }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'delete-event') {
      const { eventId } = await req.json();

      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        throw new Error('Erreur suppression événement');
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    throw new Error('Action non reconnue');

  } catch (error: any) {
    console.error('Erreur dans google-calendar-sync:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erreur lors de la synchronisation'
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});