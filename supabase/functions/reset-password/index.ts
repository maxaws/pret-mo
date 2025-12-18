import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_API_KEY = "re_MvNR3u2f_5SP9dkY8gYHanB1Ek2P4zb9T";

interface ResetPasswordRequest {
  email: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email }: ResetPasswordRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "L'adresse email est requise" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: true, message: "Si cette adresse existe, un email a été envoyé" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const origin = new URL(req.url).origin;
    const redirectUrl = `${origin}/connexion`;

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error("Erreur génération lien:", error);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la génération du lien" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const resetLink = data.properties.action_link;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center;">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: bold;">Réinitialisation de mot de passe</h1>
        </div>
        
        <div style="background-color: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Vous avez demandé à réinitialiser votre mot de passe pour votre compte Gestion RH.
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
            Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">
              Réinitialiser mon mot de passe
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 25px 0 0 0;">
            Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
          </p>
          <p style="color: #3b82f6; font-size: 13px; word-break: break-all; margin: 10px 0 0 0;">
            ${resetLink}
          </p>
        </div>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
          <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
            <strong>Important :</strong> Ce lien est valable pendant 1 heure. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.
          </p>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 0;">
            Cet email a été envoyé automatiquement par le système de gestion RH.<br>
            Prêt de main-d'œuvre à but non lucratif
          </p>
        </div>
      </div>
    `;

    const emailData = {
      from: "onboarding@resend.dev",
      to: [email],
      subject: "Réinitialisation de votre mot de passe - Gestion RH",
      html: emailHtml,
    };

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailData),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Erreur Resend:", emailResult);
      return new Response(
        JSON.stringify({ error: "Échec de l'envoi de l'email" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email de réinitialisation envoyé avec succès" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erreur lors de la réinitialisation:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur", message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});