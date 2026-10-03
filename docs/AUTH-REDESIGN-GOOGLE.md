# Auth Velatra — refonte et Google Sign-In

## Architecture conservée

Une seule instance Firebase Auth (`firebase.ts`), avec le `GoogleAuthProvider` déjà présent. `App.tsx` conserve son observation du profil `users/{uid}`, la récupération du club, les contrôles de rôle/suspension, l’isolation de session, les restrictions d’email vérifié et l’onboarding. Aucun backend, modèle métier, dashboard, droit ou fichier de Rules modifié.

La vérification du profil manquant utilise `getDocFromServer` : une réponse hors ligne ou une erreur de lecture ne doit jamais être interprétée comme une absence de profil. Les formulaires Auth restent montés pendant la résolution d’une nouvelle session, pour conserver les champs et le verrou anti-double soumission. Les routes privées continuent d’attendre le profil.

## Écrans et parcours

- `/login` : email/mot de passe, affichage du mot de passe, Google uniquement, liens inscription/réinitialisation.
- `/register` : deux choix publics, Coach indépendant (`solo`) ou Salle/Studio (`studio`). Aucun rôle salarié, Manager ou Member dans ces choix.
- Email : prénom, nom, email, mot de passe confirmé ; nom du studio pour `studio`. Le nom de l’espace solo est construit à partir du nom du coach, puis validé par le serveur. Le code bêta existant reste obligatoire.
- Google existant : le UID retrouve le profil Velatra, son organisation et ses droits. Aucun droit n’est extrait du nom, de l’email ou du profil Google.
- Google nouveau : aucune organisation n’est créée lors de l’authentification. Choix explicite du type, informations manquantes, code bêta, puis bouton « Créer mon espace ». Nom et email déjà fournis ne sont pas redemandés. Le parcours peut reprendre après refresh.
- La création utilise uniquement `POST /api/register-club`, avec `accountType`, `ownerName`, `clubName`, `inviteCode`. Le serveur conserve `role`, `plan`, `isActive`, `canAddStaff` et la protection transactionnelle contre un second profil par UID. Une erreur de code permet de corriger puis réessayer avec la même identité Firebase.
- Le formulaire adhérent existant reste accessible via « Rejoindre mon coach », séparément des choix publics, avec son code de club et son onboarding d’origine.
- `/forgot-password` : route dédiée, `sendPasswordResetEmail`, réponse conditionnelle identique pour une adresse présente ou absente.

## Conflits et sessions

Aucun appel applicatif de fusion ou de `linkWithCredential`. En cas de `account-exists-with-different-credential`, `credential-already-in-use` ou `email-already-in-use`, message invitant à la méthode habituelle. Firebase peut reconnaître la même identité vérifiée avec Google et conserver le UID ; ce cas est testé en émulateur sans dupliquer le profil métier. Il ne s’agit pas d’une fusion de profils par email effectuée par Velatra.

Le verrou synchrone anti-double clic couvre les soumissions et la popup Google. Les champs/actions sont désactivés pendant les opérations. Fermeture volontaire de popup discrète ; erreurs traduites sans codes techniques ni messages bruts. Aucune modification de la persistance Firebase ni des exigences de vérification d’email.

## Visuel et accessibilité

Le shell Auth partagé possède le branding unique, le titre et les quatre bénéfices en HTML ; la scène Pitou est décorative. La carte, les formulaires, les erreurs et les CTA restent du vrai React. Champs étiquetés, autocomplete, clavier, focus, mots de passe affichables et alertes/statuts accessibles. Pas de faux sélecteur de langue : interface française.

Desktop en deux zones, tablette resserrée, mobile sans grande illustration ni débordement. Les styles sont confinés à `.va-auth`. Asset `public/brand/auth/pitou-gym.webp` : 1536 × 1024, environ 76 Kio. Aucun chiffre fictif, aucun logo sur le laptop ou le décor. Le logo est réservé au branding et au ventre de Pitou.

### Provenance de la scène

Outil intégré `image_gen` (skill imagegen), référence fournie « Connexion Velatra, le cockpit des coachs.png », puis compression WebP. Prompt final :

> Create the decorative left-side background asset for this Velatra login reference, NOT a UI screenshot. Premium 3D render in deep navy-indigo modern gym with subtle violet/blue neon, same canonical Pitou character exactly (big violet/navy ears, creamy face and belly, friendly purple eyes, Velatra lightning logo ONLY on belly), seated near bottom right looking warmly at viewer, laptop beside him plain unbranded. Wide 3:2 landscape illustration. Reserve upper 45% and left 45% as dark quiet negative space for real HTML copy overlaid later. Pitou should occupy bottom right quadrant prominently, fully visible. Background gym blurred, sports mat, plain dark bottle, towel. Remove ALL text, ALL interface forms, ALL branding except belly lightning. No dashboard panel, no numbers, no lettering, no logos on laptop, bottle, gym or any props. Retain beautiful premium soft photoreal materials and purple edge light of reference. Entire canvas dark scene, no white right panel.

## Configuration Google vérifiée en lecture seule

Projet : `velatra-75daa`. Lecture de Firebase Identity Toolkit Admin API le 3 octobre 2026 : provider `google.com` activé, client OAuth présent, email/password activé. `authDomain` frontend : `velatra-75daa.firebaseapp.com`.

Les domaines autorisés actuellement contiennent `localhost`, `velatra-75daa.firebaseapp.com`, `velatra-75daa.web.app` et les quatre anciens domaines AI Studio. Aucun domaine Vercel n’était présent lors de cette vérification. Aucun secret affiché/copié, aucune configuration production modifiée.

### Action manuelle avant recette Google sur Vercel

1. Ouvrir [Firebase Authentication, projet Velatra](https://console.firebase.google.com/project/velatra-75daa/authentication/settings), onglet Settings → Authorized domains.
2. Ajouter uniquement le hostname exact de la Preview Vercel utilisée pour cette PR : `velatra-app-git-feat-auth-re-6a5502-victordefreitassss-projects.vercel.app` (sans `https://`, chemin ou port). Ajouter aussi le domaine public de production au moment prévu pour la release s’il est absent. Ne pas autoriser tous les domaines `vercel.app`.
3. Dans Sign-in method → Google, conserver le provider activé et le client existant ; vérifier le nom public et l’email d’assistance. Aucun nouveau credential à créer.
4. Si Google retourne `redirect_uri_mismatch`, ouvrir [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials?project=velatra-75daa), le client web utilisé par Firebase, et vérifier l’URI de redirection `https://velatra-75daa.firebaseapp.com/__/auth/handler`. Le frontend garde ce `authDomain` ; le callback n’est pas `/login` et aucun callback Vercel supplémentaire n’est nécessaire pour cette architecture popup. Pour un futur authDomain personnalisé, suivre la procédure Firebase avant de le modifier.
5. Si l’écran de consentement OAuth est en mode Testing, vérifier les utilisateurs de test autorisés dans Google Auth Platform → Audience. Le statut de cet écran n’a pas été modifié ni validé par cette tâche.
6. Tester la Preview avec un compte de recette approuvé : connexion Google existante, annulation, compte nouveau puis choix explicite d’espace avec un code bêta valide. Aucun compte de production créé automatiquement pendant ce travail.

Sources officielles : [Google avec Firebase JS](https://firebase.google.com/docs/auth/web/google-signin), [association des providers](https://firebase.google.com/docs/auth/web/account-linking), [marque Google](https://developers.google.com/identity/branding-guidelines).

## Validation locale

- `npm run lint` : PASS.
- `npm run build` : PASS (avertissement existant de taille de chunks).
- `node --import tsx --test tests/authMessages.test.ts tests/productExperience.test.ts tests/appShellHelpers.test.ts tests/roleFormatExperiences.test.ts` : 57 PASS.
- `npm run test:emulators` : 834 tests PASS + 5 contrôles préalables PASS, projet `demo-velatra` uniquement. Inclut Google nouveau solo/studio, invitation refusée, privilèges forgés ignorés, identité Google existante et email/password de même adresse vérifiée.
- `node scripts/qa/auth-browser.mjs` : 53 contrôles PASS (RootApp réel, réponses Firebase isolées, requêtes externes bloquées).
- `node scripts/qa/role-format-experiences-browser.mjs` : 433 PASS ; mode desktop dédié : 170 PASS.
- `node scripts/qa/onboarding-browser.mjs` : 1049 PASS.
- `node scripts/qa/mobile-foundations-browser.mjs` : 48 PASS.
- `git diff --check` : PASS.

Le simulateur mobile conserve désormais la session courante lors de chaque nouvelle souscription Auth, y compris après logout, au lieu de réinjecter son utilisateur initial. Le test de retour depuis Drive/Prospects attend la destination et son historique (correction de synchronisation déjà validée dans la PR #47, sans reprendre ses changements de widgets). Aucun comportement métier modifié par ces ajustements de tests.

Un job CI Auth dédié conserve les captures 320/390/768/1440 px et les résultats. Les tests navigateur simulent les résultats du provider ; les tests Google serveur utilisent le véritable émulateur Auth. Ils ne remplacent pas un consentement OAuth réel sur le domaine Vercel autorisé. Aucun envoi réel d’email de réinitialisation n’a été effectué.

## Limites et release

Recette Google réelle à effectuer après autorisation du domaine Preview. Le code bêta existant est toujours nécessaire à la création, y compris Google. Les utilisateurs invités conservent le formulaire adhérent historique, hors nouvelle inscription publique Coach/Studio. La PR est dédiée à Auth et reste non mergée pour validation visuelle et fonctionnelle de la Preview.
