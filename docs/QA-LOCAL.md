# Recette locale isolée

Prérequis : Node 24, dépendances installées avec `npm ci`, Java 21+ pour Firestore. Les commandes suivantes utilisent uniquement `demo-velatra` et des données jetables. Ne leur fournir aucune clé de production.

## Suite automatisée

```sh
npm run lint
npm run build
npm run test:emulators
```

La commande `test:emulators` démarre Auth, Firestore et Storage, exécute les tests en série et arrête les émulateurs. Les ports 9099, 8080 et 9199 doivent être libres. `npm test` seul requiert les variables et émulateurs ci-dessous ; les tests serveur refusent de travailler sans émulateur.

## Application HTTP et recette manuelle

Dans un premier terminal :

```sh
npx firebase-tools@15.31.0 emulators:start --project demo-velatra --config firebase.qa.json --only auth,firestore,storage
```

Dans un deuxième terminal, depuis le dépôt :

```sh
GCLOUD_PROJECT=demo-velatra FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node scripts/qa/seed.mjs
npm run dev:qa
```

Ouvrir `http://localhost:3000`. Compte coach propriétaire jetable : `qa-owner@example.test`. Compte coach salarié : `qa-coach@example.test`. Mot de passe fictif, uniquement local : `Local-QA-only-2026!`. Une invitation d’inscription locale utilise `local-qa-invite`.

Dans un troisième terminal, pour le smoke HTTP :

```sh
GCLOUD_PROJECT=demo-velatra node scripts/qa/http-smoke.mjs
```

Le smoke crée un adhérent fictif dont l’adresse est affichée à la fin, avec le même mot de passe local. Ne pas lancer la suite de règles pendant une recette manuelle : elle réinitialise les documents de l’émulateur. Relancer le seed ensuite.

Parcours conseillé : ajout d’adhérent, programme avec exercice, rechargement, onboarding adhérent, séance, rechargement, suivi quotidien, déconnexion/reconnexion. Vérifier refus d’édition des programmes côté adhérent, rôle attribué par le serveur, essai d’un compte d’un autre club, double clic et reprise après erreur réseau.

Tester les viewports 375×812, 390×844, 430×932, 768×1024, 820×1180, 1024×768, 1100×800, 1280×800, 1440×900, 1728×1117 et 1920×1080. Un viewport ne remplace pas un téléphone réel.

`dev:qa` active explicitement les émulateurs. Le build de production force ce mode à `false`, même si la variable QA est présente. Les secrets Gemini, Stripe et SMTP ne sont pas nécessaires ; leurs intégrations réelles doivent être testées séparément dans un environnement approprié.
