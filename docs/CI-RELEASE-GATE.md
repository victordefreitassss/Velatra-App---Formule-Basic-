# CI et publication Velatra

## Audit avant création du workflow

Base vérifiée : `541954c21aa0d5e332bcb97413280bc31a3a62cd`, identique à `origin/main` après fetch ; arbre propre. Aucun workflow, aucune protection classique de `main`, aucun ruleset. Dépôt public sous GitHub Free : protections disponibles ; propriétaire administrateur. Vercel était en succès sur cette version.

`npm ci` a réussi depuis le lockfile (742 paquets, 20 s), avec le `postinstall` de compatibilité `jwks-rsa` vérifié. TypeScript et build réussis. La commande existante `test:emulators` démarre Auth, Firestore et Storage, puis lance toute la commande `npm test` : **81/81 tests, 5 suites, aucun ignoré**, sur des émulateurs vierges (environ 21 s pour les tests). Pas de seconde exécution de `npm test` à ajouter à la CI.

Node est imposé à **24.x** par `engines`. Firebase CLI **15.31.0**, épinglée dans le script npm, exige Java 21 minimum ; Temurin **21 LTS** convient. `postinstall` reste indispensable : les tests runtime vérifient réellement le chargement des clés et des signatures avec `require(ESM)` désactivé.

| Couverture initiale | Tests | Exécution réelle |
| --- | ---: | --- |
| `firestore.rules.test.ts` | 18 | Firestore, isolation et refus d'élévation des droits |
| `storage.rules.test.ts` | 3 | Storage et profils Firestore, isolation des fichiers |
| `createMember.test.ts` | 3 | Auth + Firestore, création et reprise de compte |
| `completeWorkout.test.ts`, `bookings.test.ts`, `stripePayments.test.ts` | 6 | Transactions Firestore, concurrence, idempotence, facture fictive |
| `serverRuntime.test.ts` | 3 | HTTP local source/compilé, refus sans authentification, signatures |
| `workoutSession.test.ts` | 19 | Séance, saisie, reprise, séries et timers |
| Autres suites | 29 | Onboarding, planning, suivi, validation, navigation, conversation IA |

Les tests unitaires des règles utilisent des identités simulées ; ceux de création de compte utilisent bien l'émulateur Auth. Les recettes navigateur et `scripts/qa/http-smoke.mjs` ne font pas partie de ces 81 tests. Ni Stripe, ni Gemini, ni SMTP réels ne sont appelés.

Le préflight ajouté répond à une lacune identifiée : une variable `FIREBASE_CONFIG` héritée peut survivre à `emulators:exec`. Les tests doivent refuser ce cas et tout hôte non local avant les imports Firebase.

Validation locale après intégration : deux démarrages indépendants et vierges ont chacun donné **5/5 contrôles du garde-fou + 81/81 tests applicatifs**, aucun ignoré. Le second a rejoué toute la chaîne `npm ci` → lint → build → émulateurs. Les logs contiennent `Firestore coach/member isolation`, `Cloud Storage coach/member isolation` et `creates Auth and a canonical member profile, strips privilege fields, and retries safely`. Les refus Firestore affichés sont attendus par les tests négatifs, pas des tests ignorés.

## Exécution

`.github/workflows/ci.yml` lance le job stable **`quality-gate`** sur toute PR vers `main`, tout push sur `main` et à la demande. Ubuntu 24.04, Node depuis `engines`, Temurin 21, actions épinglées par SHA, permissions `contents: read`, délai maximal 15 minutes. Seules les anciennes exécutions d'une même PR sont annulées ; seul le cache npm est conservé.

Commandes locales identiques (Node 24, Java 21 dans le PATH, ports 9099/8080/9199 libres) :

```sh
npm ci
npm run lint
npm run build
npm run test:emulators
```

L'ordre est bloquant, sans `continue-on-error`. `pretest` vérifie le projet `demo-velatra`, les trois hôtes loopback et l'absence de credentials explicites, puis exécute **5 tests du garde-fou**. Ensuite les **81 tests applicatifs** tournent une seule fois, en série. Un `npm test` sans environnement d'émulateurs valide échoue avant d'importer l'application.

`test:emulators` impose `--project demo-velatra --config firebase.qa.json --only auth,firestore,storage`. `.firebaserc` et `firebase.json` de production ne sont pas utilisés pour lancer les tests. Aucun secret GitHub n'est référencé et aucune connexion Firebase n'est nécessaire. Le build compile le produit sans exécuter ses accès Firebase. Chaque exécution démarre sans import/export de données ; `emulators:exec` arrête les processus, y compris après un échec. Ne pas partager ces émulateurs avec une recette manuelle : les fixtures sont jetables.

## Release

1. Créer une branche depuis `main`, modifier et lancer les commandes ci-dessus.
2. Pousser la branche et ouvrir une PR vers `main` ; le preview Vercel reste géré par l'intégration Git existante.
3. Attendre `quality-gate` vert sur le dernier commit et une branche à jour, puis fusionner la PR.
4. Vérifier la CI sur `main`, le déploiement Vercel et l'application en production.

Protection enregistrée et relue dans GitHub le 28 septembre 2026 : **PR obligatoire**, **`quality-gate` requis depuis GitHub Actions** (App ID 15368), **branche à jour**, suppression et force-push interdits. Aucun avis externe imposé pour ne pas bloquer le propriétaire seul. Le bypass administrateur reste disponible pour une urgence et doit rester exceptionnel : un push direct administrateur peut lancer Vercel avant la fin de la CI. Cette protection n'est pas une garantie contre un administrateur qui la contourne ou modifie le workflow.

Pour revenir sur une modification, créer une PR de revert et repasser le même gate. Ne pas retirer le check requis pendant un rollback produit. Un retrait exceptionnel du workflow exige d'adapter explicitement la protection pour ne pas laisser un check attendu sans producteur.

## Preuves GitHub

Livraison par la [PR #3](https://github.com/victordefreitassss/Velatra-App---Formule-Basic-/pull/3). Le [premier run réel](https://github.com/victordefreitassss/Velatra-App---Formule-Basic-/actions/runs/36353818685) est vert : postinstall vérifié, Node 24.21.0, Java 21.0.12, 5 + 81 tests réussis. Les suites d'isolation Firestore/Storage et la création Auth figurent dans le log du job. Preview Vercel réussi. Aucun credential ni jeton n'a été trouvé par le contrôle ciblé des logs ; les fixtures sont fictives.

Le [test négatif réel](https://github.com/victordefreitassss/Velatra-App---Formule-Basic-/actions/runs/36354034278), commit `e69d9de` exclusivement sur la PR, a ajouté une assertion volontairement fausse : 81 tests applicatifs réussis, **1 échec**, `quality-gate = failure`, `mergeable_state = blocked`, check marqué **Required** dans GitHub. Vercel Preview restait vert : il ne remplace donc pas le gate. Les émulateurs se sont arrêtés après l'échec. Le commit de sonde a ensuite été annulé ; ce fichier ne fait pas partie de la livraison finale. La PR doit repasser au vert avant sa fusion, sans utiliser le bypass.

## Limites

- Le gate couvre les assertions présentes, pas toute l'application, les appareils réels ni les intégrations payantes en production.
- Les dépendances applicatives sont verrouillées ; la CLI reste épinglée via `npx` à 15.31.0, sans lockfile de ses dépendances transitives. Node 24 et Java 21 suivent leurs correctifs LTS.
- Les alertes npm existantes (1 faible, 2 modérées) et les bundles de plus de 500 kB sont signalés, sans changement de dépendances dans cette mission.
- Les réglages GitHub ne résident pas dans le YAML. Contrôler leur état dans Settings → Branches si le dépôt, le plan ou les accès changent. Les protections sont [disponibles sur les dépôts publics GitHub Free](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
