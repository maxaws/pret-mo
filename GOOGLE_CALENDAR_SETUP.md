# Configuration Google Calendar API

## Étape 1 : Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Cliquez sur "Sélectionner un projet" > "Nouveau projet"
3. Nommez votre projet (ex: "Gestion Mise à Disposition")
4. Cliquez sur "Créer"

## Étape 2 : Activer l'API Google Calendar

1. Dans le menu de gauche, allez dans "APIs & Services" > "Library"
2. Recherchez "Google Calendar API"
3. Cliquez dessus et cliquez sur "Activer"

## Étape 3 : Créer les credentials OAuth 2.0

1. Dans le menu de gauche, allez dans "APIs & Services" > "Credentials"
2. Cliquez sur "Create Credentials" > "OAuth client ID"
3. Si c'est votre premier OAuth, configurez d'abord l'écran de consentement :
   - Cliquez sur "Configure Consent Screen"
   - Choisissez "External" (ou "Internal" si vous avez Google Workspace)
   - Remplissez les informations obligatoires :
     - App name: Nom de votre application
     - User support email: Votre email
     - Developer contact: Votre email
   - Cliquez sur "Save and Continue"
   - Dans "Scopes", cliquez sur "Add or Remove Scopes"
   - Recherchez et ajoutez : `https://www.googleapis.com/auth/calendar`
   - Cliquez sur "Save and Continue"
   - Ajoutez des utilisateurs de test (leurs emails)
   - Cliquez sur "Save and Continue"

4. Revenez à "Credentials" > "Create Credentials" > "OAuth client ID"
5. Type d'application : "Web application"
6. Nom : "Gestion Mise à Disposition Web Client"
7. **Authorized redirect URIs** - IMPORTANT : Ajoutez cette URL exacte :
   ```
   https://orxxfmesmvuddldkajlt.supabase.co/functions/v1/google-calendar-oauth
   ```
   ⚠️ **Copiez cette URL EXACTEMENT comme elle est écrite ci-dessus**
   - Pas de trailing slash `/` à la fin
   - Pas de query parameters comme `?action=callback`
8. Cliquez sur "Create"
9. **Copiez le Client ID et Client Secret** qui s'affichent

## Étape 4 : Configurer les secrets dans Supabase

1. Allez sur votre dashboard Supabase
2. Allez dans "Project Settings" > "Edge Functions" > "Secrets"
3. Ajoutez deux nouveaux secrets :
   - Nom : `GOOGLE_CLIENT_ID`
     Valeur : (collez votre Client ID)

   - Nom : `GOOGLE_CLIENT_SECRET`
     Valeur : (collez votre Client Secret)

## Étape 5 : Redéployez les edge functions

Après avoir ajouté les secrets, les edge functions utiliseront automatiquement ces credentials.

## Résolution des problèmes

### Erreur "redirect_uri_mismatch"
- Vérifiez que l'URL de redirection dans Google Cloud Console correspond EXACTEMENT à :
  `https://VOTRE_PROJET_ID.supabase.co/functions/v1/google-calendar-oauth`
- Pas de trailing slash `/` à la fin
- Utilisez `https://` et non `http://`

### Erreur "access_denied"
- Vérifiez que vous avez ajouté le scope `https://www.googleapis.com/auth/calendar` dans l'écran de consentement
- Vérifiez que l'utilisateur est ajouté comme "Test user" si l'app est en mode test

### Erreur "invalid_client"
- Vérifiez que les secrets GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont correctement configurés dans Supabase
- Vérifiez qu'il n'y a pas d'espaces avant/après les valeurs

## Test

Une fois configuré :
1. Allez dans l'application > Paramètres
2. Cliquez sur "Connecter" dans la section Google Calendar
3. Une fenêtre popup s'ouvrira
4. Autorisez l'accès à votre Google Calendar
5. La fenêtre devrait se fermer et votre compte sera connecté
