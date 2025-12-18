import { supabase } from '../lib/supabase';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export interface EmailResponse {
  success: boolean;
  data?: {
    id: string;
  };
  error?: string;
  details?: unknown;
}

export async function sendEmail(params: SendEmailParams): Promise<EmailResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Utilisateur non authentifié');
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Échec de l\'envoi de l\'email',
        details: result.details,
      };
    }

    return result;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

export const emailTemplates = {
  bilanSubmitted: (userName: string, weekStart: string, weekEnd: string) => ({
    subject: 'Nouveau bilan hebdomadaire soumis',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Nouveau bilan hebdomadaire</h2>
        <p>Bonjour,</p>
        <p><strong>${userName}</strong> a soumis son bilan hebdomadaire pour la période du <strong>${weekStart}</strong> au <strong>${weekEnd}</strong>.</p>
        <p>Vous pouvez consulter et valider ce bilan dans l'application.</p>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          Cet email a été envoyé automatiquement par le système de gestion des bilans.
        </p>
      </div>
    `,
  }),

  bilanValidated: (userName: string, weekStart: string, weekEnd: string, validatedBy: string) => ({
    subject: 'Votre bilan hebdomadaire a été validé',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Bilan validé</h2>
        <p>Bonjour ${userName},</p>
        <p>Votre bilan hebdomadaire pour la période du <strong>${weekStart}</strong> au <strong>${weekEnd}</strong> a été validé par <strong>${validatedBy}</strong>.</p>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          Cet email a été envoyé automatiquement par le système de gestion des bilans.
        </p>
      </div>
    `,
  }),

  bilanRejected: (userName: string, weekStart: string, weekEnd: string, reason: string) => ({
    subject: 'Votre bilan hebdomadaire nécessite des corrections',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Bilan à corriger</h2>
        <p>Bonjour ${userName},</p>
        <p>Votre bilan hebdomadaire pour la période du <strong>${weekStart}</strong> au <strong>${weekEnd}</strong> nécessite des corrections.</p>
        <p><strong>Raison :</strong></p>
        <p style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626;">
          ${reason}
        </p>
        <p>Veuillez apporter les modifications nécessaires et soumettre à nouveau votre bilan.</p>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          Cet email a été envoyé automatiquement par le système de gestion des bilans.
        </p>
      </div>
    `,
  }),

  weeklyReminder: (userName: string, weekStart: string, weekEnd: string) => ({
    subject: 'Rappel : Soumettez votre bilan hebdomadaire',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Rappel bilan hebdomadaire</h2>
        <p>Bonjour ${userName},</p>
        <p>N'oubliez pas de soumettre votre bilan hebdomadaire pour la période du <strong>${weekStart}</strong> au <strong>${weekEnd}</strong>.</p>
        <p>Veuillez compléter votre bilan dans les meilleurs délais.</p>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          Cet email a été envoyé automatiquement par le système de gestion des bilans.
        </p>
      </div>
    `,
  }),
};
