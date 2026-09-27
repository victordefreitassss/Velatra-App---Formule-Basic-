# Velatra

Application web de coaching : React, TypeScript et Vite, API Express, Firebase et Gemini côté serveur. Déploiement via Vercel.

## Développement local

Prérequis : Node 24 ; Java 21 pour les émulateurs Firebase.

```sh
npm ci
npm run dev
```

L'application est servie sur `http://localhost:3000`. Pour travailler avec des comptes fictifs et les émulateurs, suivre la [recette locale isolée](docs/QA-LOCAL.md), qui utilise `npm run dev:qa`.

Les intégrations réelles nécessitent leurs variables d'environnement côté serveur, notamment `GEMINI_API_KEY` pour l'IA. Ne pas les versionner ni les injecter dans le code navigateur.

## Repères

- `components/`, `pages/` : interfaces ; `server/`, `server.ts`, `api/` : API.
- `scripts/qa/`, `tests/` : recette et tests ; `docs/` : procédures et audits techniques.
- `public/` : ressources publiques. `functions/` est un backend Firebase historique conservé, distinct du déploiement Vercel courant.

## Validation et publication

Avec Node 24 et Java 21, sans credentials de production :

```sh
npm ci
npm run lint
npm run build
npm run test:emulators
```

Créer une branche puis une Pull Request vers `main` et attendre le check `quality-gate` avant fusion. Voir le [workflow de release](docs/CI-RELEASE-GATE.md) pour la couverture, les protections et leurs limites.
