import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_API_KEY = "re_MvNR3u2f_5SP9dkY8gYHanB1Ek2P4zb9T";

interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, subject, html, text, from }: EmailRequest = await req.json();

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "Les champs 'to' et 'subject' sont requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!html && !text) {
      return new Response(
        JSON.stringify({ error: "Au moins un champ 'html' ou 'text' est requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailData = {
      from: from || "onboarding@resend.dev",
      to: Array.isArray(to) ? to : [to],
      subject,
      ...(html && { html }),
      ...(text && { text }),
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Erreur Resend:", result);
      return new Response(
        JSON.stringify({ error: "Échec de l'envoi de l'email", details: result }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur", message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});