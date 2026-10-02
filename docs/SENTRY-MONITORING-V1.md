# Sentry V1 — erreurs frontend

Base : `003e146bfaed8e5232d5f87a616f38aac52d9cb4` (dernier main au début de la mission).
Branche : `feat/sentry-monitoring-v1`. Aucun merge demandé.

## Activation

- SDK React `@sentry/react` 11.3.0, version verrouillée dans package-lock.json.
- `monitoring/init.ts` est le premier import de `index.tsx`, avant RootApp et le montage React.
- Configurer `VITE_SENTRY_DSN` dans les variables du projet Vercel, uniquement pour les environnements souhaités. Aucun DSN réel n'est inscrit dans le dépôt. Cette variable est une configuration publique du navigateur, pas un token d'administration.
- Un nouveau build est nécessaire pour prendre en compte une variable Vite.
- `enabled = import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN`.
- DSN absent ou développement : aucun client ni transport Sentry initialisé. Une configuration incorrecte ne bloque pas React.
- Environnement : production/development. Release/appVersion : SHA complet fourni par `VERCEL_GIT_COMMIT_SHA`, sinon `unversioned`. Aucun secret n'est exposé par cette définition Vite.

## Périmètre et confidentialité

L'ErrorBoundary existant appelle `Sentry.captureException(error)` via `captureReactError`, sans changement de son écran de secours. L'intégration GlobalHandlers capture aussi les erreurs globales et rejets non gérés. Aucun second Sentry ErrorBoundary n'est ajouté. Le SDK et une WeakSet dans beforeSend évitent la double capture du même objet Error, y compris React/global handler/boundary.

Les intégrations par défaut sont désactivées. Seule GlobalHandlers est installée : aucun Replay, breadcrumb automatique, console/log capture, contexte HTTP, session automatique, instrumentation Stripe ou Firebase.

SDK v11 utilise `dataCollection` à la place de l'ancien `sendDefaultPii` : userInfo, cookies, headers, corps HTTP, query params, variables locales, contexte source, données SQL/queues/GraphQL/IA sont explicitement désactivés.

`beforeSend` reconstruit l'événement avec une liste fermée de champs : type JavaScript connu, message constant masqué, identifiant technique, timestamp, chemins statiques `/assets/*.js` sans origine/query/fragment, ligne/colonne et tags validés. Les messages libres, noms de fonctions, componentStack, user, request, extra, contexts, breadcrumbs, tags arbitraires et pièces jointes sont retirés. Les événements sans exception sont rejetés.

Tags : role (superadmin/owner/manager/coach/member ou anonymous), accountType (solo/studio ou unknown), environment et appVersion. Le contexte est réinitialisé à la déconnexion et au démontage. Aucun UID, clubId, email, nom, téléphone, poids, blessure, message, contenu check-in ou donnée Stripe n'est envoyé dans les événements.

Les tests inspectent aussi une enveloppe produite par le vrai SDK via un transport en mémoire, avec des canaris sensibles dans message/user/extra/breadcrumb/componentStack. Aucun appel réel à Sentry n'est effectué par les tests. Les DSN synthétiques sont générés au runtime sur un domaine `.invalid`.

`tracesSampleRate = 0.1` est configuré comme demandé. V1 ne branche pas BrowserTracing : aucun suivi de navigation/réseau ni profilage. Les spans sont ignorés et les transactions sont rejetées (traceLifecycle static). Cette valeur ne signifie donc pas qu'une instrumentation de performance est activée.

Limite réseau : comme tout service HTTP, l'infrastructure Sentry reçoit nécessairement l'IP de connexion. Le SDK n'ajoute pas d'identité/IP au payload ; activer aussi le retrait/stockage désactivé des IP dans les réglages du projet Sentry. La liste fermée réduit les diagnostics : les messages originaux et détails de contexte ne sont pas disponibles.

## Source maps / Vite / Vercel

Audit : Vite n'active pas build.sourcemap ; Vercel ne configure aucun upload ; aucun plugin Sentry de build n'est installé. La V1 ne publie pas de `.map` et ne prétend pas envoyer des source maps à Sentry. Les positions de bundles restent utiles mais les stacks ne sont pas encore déminifiées.

Procédure ultérieure, avec les accès réels de l'organisation :

1. Installer `@sentry/vite-plugin` en dépendance de développement.
2. Créer un token limité à l'upload de source maps/releases pour le projet choisi et le conserver comme secret serveur Vercel `SENTRY_AUTH_TOKEN`. Ajouter `SENTRY_ORG` et `SENTRY_PROJECT` côté build. Ne jamais employer un préfixe `VITE_` pour le token, ni l'inclure dans define, le code frontend ou Git.
3. Activer `build.sourcemap: 'hidden'` ; placer `sentryVitePlugin` après le plugin React. Lire le token uniquement via `process.env.SENTRY_AUTH_TOKEN` dans vite.config.ts. Utiliser le SHA `VERCEL_GIT_COMMIT_SHA` comme release commune au plugin et au SDK.
4. Configurer `sourcemaps.filesToDeleteAfterUpload: ['dist/**/*.map']`. Vérifier la réussite de l'upload et l'absence de `.map` dans les fichiers réellement publiés. `hidden` seul ne retire pas les fichiers du déploiement.
5. Vérifier une erreur synthétique dans l'environnement autorisé et son déminifiage dans Sentry. Ne pas fournir de secret fictif et ne pas valider l'upload sans preuve.

Référence primaire : [Sentry — Vite source maps](https://docs.sentry.io/platforms/javascript/guides/react/sourcemaps/uploading/vite/). La configuration de collecte est vérifiée dans les types et le code du SDK verrouillé (`@sentry/core`, `@sentry/browser`).

## Validation

- Tests automatisés : absence de DSN, développement, liste fermée des données, tags/reset, déduplication, pièces jointes, transport du vrai SDK et ErrorBoundary.
- Chromium : module d'initialisation réel, React et ErrorBoundary réels ; production sans DSN, développement avec DSN synthétique, production avec transport en mémoire ; erreur React et rejet de promesse ; fallback inchangé, événements masqués et aucune requête externe.
- `npm run lint`, `npm run build`, `npm run test:emulators`, `git diff --check`.
- Résultats locaux : lint PASS ; build de production avec DSN vide PASS (aucun fichier `.map` généré) ; 649 tests et 5 garde-fous CI PASS ; 21 assertions Chromium PASS ; diff --check PASS. Le build conserve l'avertissement existant sur certains chunks de plus de 500 kB.
- Le workflow browser regression exécute aussi le test Sentry, puis les régressions existantes de l'application.
- Aucun bouton de crash ni fonction de test dans l'interface de production.

Activation réelle restante : renseigner le DSN dans Vercel, appliquer les réglages de confidentialité/IP Sentry, puis vérifier la réception dans le projet Sentry. L'upload de source maps reste une étape séparée qui nécessite les secrets serveur réels. Cette mission ne modifie pas les données, rôles, Rules, Stripe ou l'UX.
