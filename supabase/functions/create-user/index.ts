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

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user: currentUser }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (profile?.role !== 'preteuse') {
      throw new Error('Accès refusé: rôle prêteuse requis');
    }

    const { email, password, nom, prenom, ecole_id } = await req.json();

    if (!email || !password || !nom || !prenom) {
      throw new Error('Email, mot de passe, nom et prénom sont requis');
    }

    console.log('Création utilisateur avec email:', email);

    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser.users.find(u => u.email === email);

    if (userExists) {
      throw new Error('Un utilisateur avec cet email existe déjà');
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nom,
        prenom,
        role: 'salarie'
      }
    });

    if (createError) {
      console.error('Erreur création utilisateur:', createError);
      throw new Error(`Erreur auth: ${createError.message}`);
    }

    if (!newUser.user) {
      throw new Error('Aucun utilisateur créé');
    }

    console.log('Utilisateur créé, ID:', newUser.user.id);

    console.log('Création du profil');
    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email: email,
        nom,
        prenom,
        role: 'salarie',
        ecole_id: ecole_id || null
      });

    if (insertError) {
      console.error('Erreur création profil:', insertError);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Erreur profil: ${insertError.message}`);
    }

    console.log('Profil créé avec succès');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user.id,
          email: newUser.user.email
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Erreur dans create-user:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erreur lors de la création de l\'utilisateur'
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