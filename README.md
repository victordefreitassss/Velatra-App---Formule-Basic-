<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b80dc370-7dfb-4c83-8d03-6fe42e41a878

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Validation et publication

Avec Node 24 et Java 21, sans credentials de production :

```sh
npm ci
npm run lint
npm run build
npm run test:emulators
```

Créer une branche puis une Pull Request vers `main` et attendre le check `quality-gate` avant fusion. Voir le [workflow de release](docs/CI-RELEASE-GATE.md) pour la couverture, les protections et leurs limites.
