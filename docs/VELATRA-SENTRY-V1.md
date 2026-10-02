# Velatra — Sentry V1

Base main : `003e146bfaed8e5232d5f87a616f38aac52d9cb4`.
Branche : `feat/sentry-monitoring-v1`, PR #39. Aucun merge dans cette mission.

## Objectif et installation

Détecter les exceptions frontend réelles sans modifier l’UX. `@sentry/react` 11.3.0 est verrouillé dans package-lock.json ; plugin de build `@sentry/vite-plugin` 5.4.0. `monitoring/init.ts`, premier import de `index.tsx`, initialise avant React et le render.

## Variables Vercel et activation

`VITE_SENTRY_DSN` : DSN du projet, configuration publique du navigateur, aucun DSN réel dans Git. Cette variable a déjà été renseignée dans Vercel lors de la configuration précédente du compte connecté ; ce changement de code n’a pas besoin d’un nouveau compte. Un nouveau build est nécessaire après modification de la variable.

Activation uniquement si `import.meta.env.PROD`, DSN présent et cible de build production. Preview Vercel, développement, test, CI GitHub et émulateurs sont désactivés, même avec un DSN. La cible est définie côté Vite, à partir de `VERCEL_ENV`, `VERCEL`, `CI`, `GITHUB_ACTIONS`, mode et `VITE_USE_FIREBASE_EMULATORS`. Vercel Production reste autorisée même si Vercel expose CI=true. Sans DSN, aucun client ni transport n’est initialisé. Une erreur d’initialisation ne bloque pas React.

Release/appVersion : SHA complet valide de `VERCEL_GIT_COMMIT_SHA`, sinon aucun identifiant de release inventé. Aucun token serveur n’est exposé par les définitions Vite.

## Exceptions et UX

L’ErrorBoundary existant appelle `captureReactError` puis conserve l’écran « Une erreur est survenue. » et « Recharger la page ». Le contexte React ne conserve que les positions dans les bundles statiques. Aucun second ErrorBoundary Sentry. GlobalHandlers capture les exceptions/rejets non gérés ; beforeSend déduplique le même objet Error.

Pas de capture systématique des 403/404/409, ni des erreurs Firestore métier attendues. Aucun nouveau hook dans handleFirestoreError. Les erreurs non gérées restent couvertes.

## Tracing et Router

BrowserTracing avec intégration React Router compatible v7 ; les Routes existantes dans App et MarketingSite sont enveloppées sans refonte. `tracesSampleRate = 0.1` ; seules transactions pageload/navigation conservées. Aucune propagation de headers de tracing, instrumentation fetch/XHR, timings HTTP, collecte de ressources, longues tâches ou Web Vitals. Les sous-spans et leurs données sont retirés avant envoi.

Les routes sont réduites à une liste de pages publiques, `/dashboard/*`, `/blog/:slug` ou `/other`. Query params, fragments et identifiants de chemin sont retirés. Le navigateur est réduit à sa famille et version majeure ; aucun user-agent complet.

## Confidentialité

`monitoring/privacy.ts` fournit les filtres purs/testables. beforeSend reconstruit une liste fermée : type JS, message constant masqué, stack avec chemins `/assets/*.js`, ligne/colonne, identifiant technique, timestamp, route, navigateur, trace technique et componentStack filtré. Les debug IDs statiques sont conservés pour les source maps. Les autres contextes, request, headers Authorization, cookies, bodies, tokens Firebase, breadcrumbs, extra, pièces jointes et texte libre sont supprimés.

Tags autorisés : role (superadmin/owner/manager/coach/member ou anonymous), accountType (solo/studio ou unknown), environment, appVersion si SHA réel. Le contexte est remplacé lorsque le rôle/format change, remis à zéro au logout et au démontage. Aucun Sentry.setUser dans l’application.

Champs interdits : noms, email, téléphone, adresse, memberId/prospectId/clubId, poids, taille, blessures, objectifs, nutrition, messages, check-ins, Stripe IDs/paiements, tokens. Les canaris de tests vérifient leur absence dans les événements et les enveloppes SDK.

SDK v11 : dataCollection désactive userInfo, cookies, headers, bodies, query params, données SQL/GraphQL/IA/queues, variables locales et contexte source. Intégrations par défaut désactivées : aucun Replay, session automatique, breadcrumbs ou capture console. beforeSendLog/beforeSendMetric rejettent tout. Les réglages serveur Sentry de retrait IP et géolocalisation ont été configurés précédemment ; le réseau de Sentry reçoit nécessairement l’IP de connexion HTTP, même si l’événement ne la conserve pas.

## Source maps

Upload conditionnel configuré dans vite.config.ts. Le plugin ne s’active qu’en production et avec trois variables **serveur de build** :

- `SENTRY_AUTH_TOKEN` : token limité à l’upload, jamais VITE_*, jamais dans Git ni le navigateur.
- `SENTRY_ORG` : slug organisation, ici velatra.
- `SENTRY_PROJECT` : slug projet, ici javascript-react.

Avec ces variables : maps hidden, upload via plugin, suppression des fichiers dist/**/*.map après upload ; télémétrie plugin désactivée. Sans elles : aucune map générée/publiée et aucun upload. Un échec plugin doit faire échouer le build, ne pas publier des maps. Le SHA sert de release seulement s’il est fourni réellement.

Aucun token créé, aucune valeur secrète inventée, aucun upload réel validé dans cette mission. La déminification TypeScript/React reste à vérifier après configuration serveur et déploiement autorisé.

## Vérification et désactivation

Tests automatiques : SDK réel avec transport en mémoire et DSN synthétique .invalid ; Chromium bloque toute requête externe. Le test de tracing utilise sampling 1 uniquement dans sa fixture isolée pour être déterministe ; l’application reste à 0.1. Aucun bouton de crash en production.

Après merge/déploiement, obtenir une validation explicite avant toute première erreur de test sur velatra.app. Vérifier ensuite dans Sentry : stack, route générique, navigateur, environment, role/accountType ; absence de user, email, santé, Stripe, tokens, attachments et Replay. Aucun nouvel événement réel envoyé pendant cette révision.

Pour désactiver : retirer VITE_SENTRY_DSN de Production puis reconstruire/déployer le frontend. Preview est toujours désactivée par le code.

## Validation et limites

Résultats locaux finaux : npm run lint PASS ; npm run build sans DSN PASS, aucune map générée ; npm run test:emulators 651 tests applicatifs et 5 garde-fous CI PASS ; git diff --check PASS ; Chromium Sentry 37 assertions PASS, aucune requête externe. Six tests Sentry (deux ajoutés dans cette révision) couvrent aussi le logout avec un club encore en mémoire. Avertissement de taille de chunks existant conservé. CI et régression navigateur complète attendues sur le HEAD pushé.

Messages masqués et componentStack réduit limitent le diagnostic ; source maps pas encore uploadées, extensions/frames non issues de bundles retirées. Routes inconnues regroupées sous /other. Aucun monitoring backend, Replay, profilage, ou capture manuelle systématique Firestore/API.

Firestore Rules changed NO. Storage Rules changed NO. Deployment Firebase required NO. Déploiement frontend Vercel Production nécessaire après merge pour activer le nouveau code ; aucune mise en production ni merge dans cette mission.
