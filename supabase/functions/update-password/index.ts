import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UpdatePasswordRequest {
  userId: string;
  newPassword: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentification requise');
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user: currentUser }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (profile?.role !== 'preteuse' && profile?.role !== 'accueil') {
      throw new Error('Accès refusé: rôle administrateur requis');
    }

    const { userId, newPassword }: UpdatePasswordRequest = await req.json();

    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: "L'ID utilisateur et le nouveau mot de passe sont requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Le mot de passe doit contenir au moins 6 caractères" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error("Erreur mise à jour mot de passe:", error);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la mise à jour du mot de passe" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Mot de passe mis à jour avec succès" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erreur lors de la mise à jour:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur", message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});