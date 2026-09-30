# Publication des règles Firestore — Billing & Finances V2

## Portée et résultat

- Date : 30 septembre 2026 (observations Firebase Rules API entre 21:46 et 21:49 UTC).
- HEAD applicatif vérifié et déployé : `e8bb229a03cd48775f3f7d071f7472157e20bfd9`.
- Projet Firebase confirmé : `velatra-75daa` (`.firebaserc`, liste des bases Firebase CLI et API Rules).
- Firebase CLI verrouillée : `15.31.0`.
- Fichier publié : `firestore.rules` uniquement. SHA-256 exact : `8b8cf5dcc83c0f1b692d34d0622be196926dacccfcc46db5239927fd9222f03a`.
- Version précédente au commit `1ccde0b9bd8a6e10d05e4ea7bd0f81decaefa298` : SHA-256 `157880bd889b14660f770c9425617ff50986bf325ffd37b4c739f4afd502ace6`.
- Production déjà à jour avant cette opération : **non**. Déploiement ciblé effectué : **oui**.

`firebase.json` déclare deux bases utilisant ce même fichier : `(default)` (édition Standard, région `eur3`) et `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` (édition Enterprise, région `europe-west1`). Leur existence et leur édition ont été relues avec la CLI. Aucun document métier n'a été consulté.

## Releases avant et après

Les noms de release sont fixes ; les identifiants de ruleset changent à chaque publication. Avant et après, chaque release et le contenu de son ruleset ont été lus séparément via des requêtes `GET` à Firebase Rules API. Une seconde lecture de la release pendant chaque contrôle a confirmé qu'elle n'avait pas changé durant l'observation. Les hashes ci-dessous portent sur les octets UTF-8 de la source `firestore.rules` renvoyée par l'API.

| Base | Release | Ruleset avant | SHA-256 source avant | Ruleset après | SHA-256 source après |
| --- | --- | --- | --- | --- | --- |
| `(default)` | `projects/velatra-75daa/releases/cloud.firestore` | `projects/velatra-75daa/rulesets/ccb1aedb-95c7-460d-9f5b-00959de60342` | `157880bd889b14660f770c9425617ff50986bf325ffd37b4c739f4afd502ace6` | `projects/velatra-75daa/rulesets/ddd68205-1617-4026-b1b4-c6d26a358c82` | `8b8cf5dcc83c0f1b692d34d0622be196926dacccfcc46db5239927fd9222f03a` |
| `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/releases/cloud.firestore/ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/rulesets/3d6dfbcc-d972-4bd8-9d7c-d6e599628b91` | `157880bd889b14660f770c9425617ff50986bf325ffd37b4c739f4afd502ace6` | `projects/velatra-75daa/rulesets/ab5769eb-b7af-4d86-930e-b81550baa710` | `8b8cf5dcc83c0f1b692d34d0622be196926dacccfcc46db5239927fd9222f03a` |

Releases actives avant : `(default)` mise à jour `2026-09-30T19:02:14.128037Z` ; base nommée `2026-09-30T19:02:13.538536Z`. Releases actives après : `(default)` `2026-09-30T21:49:29.419286Z` ; base nommée `2026-09-30T21:49:29.541553Z`. Les deux hashes publiés correspondent exactement au hash local du HEAD.

## Vérifications avant publication

- Arbre Git propre, `main` synchronisé par `git fetch origin`, `git switch main`, `git pull --ff-only origin main` ; HEAD égal à celui attendu avant toute action.
- `npm run lint` : réussi.
- `npm run build` : réussi ; avertissement préexistant sur la taille de certains bundles, sans erreur de build.
- `npm run test:emulators` : réussi avec Firebase CLI `15.31.0`, JDK 21 local et le projet d'émulation `demo-velatra`. **298 tests réussis, 0 échec**, plus 5 tests de garde CI.
- `git diff --check` : réussi.
- La suite d'émulateurs couvre les écritures SDK refusées pour `plans`, `subscriptions`, `payments`, `invoices`, et les champs utilisateur `stripeCustomerId`, `stripeCustomerClubId`, `credits`, `sessionCredits`, `paymentStatus`. Elle couvre aussi le refus de lecture du secret Stripe, les lectures membre/owner/coach selon attribution, les refus cross-club et anonymes, ainsi que les régressions Client 360, Planning V2, CRM V2 et Coaching Follow-up dans la suite complète.

Le premier lancement local des émulateurs s'est arrêté avant les tests parce que Java n'était pas sur le `PATH` ; le lancement avec le JDK 21 déjà présent a terminé avec succès. Aucun test de mutation n'a visé la production.

## Commande exécutée et post-vérification

Commande exacte, depuis le HEAD applicatif ci-dessus :

```sh
npx --yes firebase-tools@15.31.0 deploy \
  --only firestore:rules \
  --project velatra-75daa \
  --non-interactive
```

La CLI a compilé deux fois `firestore.rules`, téléversé deux fois le fichier et confirmé deux publications avant `Deploy complete!`. La vérification indépendante par Firebase Rules API a ensuite identifié les **deux** nouveaux rulesets et comparé leurs sources au fichier local. Aucune cible Hosting, Functions, Storage ou autre service n'a été déployée.

## Retour arrière préparé

En cas de défaut vérifié, republier la version précédente depuis le commit `1ccde0b9bd8a6e10d05e4ea7bd0f81decaefa298` :

```sh
git worktree add \
  /tmp/velatra-rules-billing-rollback \
  1ccde0b9bd8a6e10d05e4ea7bd0f81decaefa298
cd /tmp/velatra-rules-billing-rollback
npx --yes firebase-tools@15.31.0 deploy \
  --only firestore:rules \
  --project velatra-75daa \
  --non-interactive
```

Relire ensuite **les deux** releases et rulesets via Firebase Rules API ; chaque source doit correspondre à `157880bd889b14660f770c9425617ff50986bf325ffd37b4c739f4afd502ace6`. Les rulesets précédents sont indiqués dans le tableau pour identifier l'état avant publication. **Aucun rollback n'a été exécuté.**

## Limites et absence d'opérations métier

La lecture des sources publiées prouve le contenu des règles au moment observé ; les refus et lectures applicatifs ont été testés sur émulateurs. Il n'y a eu ni essai de paiement réel, ni webhook de test en production, ni écriture de test dans Firestore production. Cette opération ne valide pas les clés Stripe, les comptes historiques ni les transactions financières live.

**Aucune donnée financière de production n'a été modifiée. Aucun paiement ou remboursement Stripe n'a été effectué. Aucun Customer, Product ou Price Stripe n'a été créé. Aucun compte Firebase Auth n'a été modifié. Aucun service Firebase autre que Firestore Rules n'a été déployé.**
