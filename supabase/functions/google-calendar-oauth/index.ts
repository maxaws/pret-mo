import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (code && state) {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
      const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-oauth`;

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Erreur token OAuth:', error);
        return new Response(
          `<html><body><script>window.close();</script><p>Erreur lors de l'authentification. Veuillez réessayer.</p></body></html>`,
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/html',
            },
          }
        );
      }

      const tokens = await tokenResponse.json();
      
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + tokens.expires_in);

      const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token,
          google_token_expiry: expiryDate.toISOString(),
          google_calendar_sync_enabled: true,
        })
        .eq('id', state);

      if (updateError) {
        console.error('Erreur mise à jour profil:', updateError);
        return new Response(
          `<html><body><script>window.close();</script><p>Erreur lors de la sauvegarde. Veuillez réessayer.</p></body></html>`,
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/html',
            },
          }
        );
      }

      return new Response(
        `<html><body><script>window.opener.postMessage({type:'google-calendar-connected'}, '*'); window.close();</script><p>Authentification réussie! Vous pouvez fermer cette fenêtre.</p></body></html>`,
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html',
          },
        }
      );
    }

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('Authentification requise');
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    if (action === 'get-auth-url') {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-oauth`;
      
      if (!clientId) {
        throw new Error('GOOGLE_CLIENT_ID non configuré');
      }

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar')}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${user.id}`;

      return new Response(
        JSON.stringify({ authUrl }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'disconnect') {
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expiry: null,
          google_calendar_sync_enabled: false,
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Erreur déconnexion: ${updateError.message}`);
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
    console.error('Erreur dans google-calendar-oauth:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erreur lors de l\'authentification Google'
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