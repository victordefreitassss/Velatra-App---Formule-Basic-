# Release coordonnée 15.1 — AccountType et Sales V2

Release effectuée le **2 octobre 2026**, projet **velatra-75daa**. Les règles sont publiées sur les deux bases Firestore ; le code Sales V2 et les outils de migration sont intégrés à `main` et le déploiement automatique Vercel de production est **Ready**.

## Intégration Git et validations

| Étape | Commit / résultat |
| --- | --- |
| Main initial | `ec365cbd6cc42502049badca310e3c1eba9ef890` |
| [PR #36](https://github.com/victordefreitassss/Velatra-App---Formule-Basic-/pull/36), migration accountType | Merge `f44a4df610244be62f3efbaa2763b81bbae9aaf0` |
| Sales synchronisé avec ce main, avant merge | `475a25c18147388934e18b9c4eb950653b980c80`, local = distant |
| [PR #35](https://github.com/victordefreitassss/Velatra-App---Formule-Basic-/pull/35), Sales V2 | Merge `c4cb40e65d6b342853ff34f826a407eaccaf8538` |
| HEAD main de la release code | `c4cb40e65d6b342853ff34f826a407eaccaf8538` |

Les HEAD initiaux des deux PR correspondaient aux commits attendus et leurs CI, navigateur et Vercel étaient verts avant la première fusion. Sales a ensuite intégré main par un commit de fusion, sans réécrire les commits publiés. Le seul conflit réel, dans `.github/workflows/mobile-review.yml`, a été résolu en conservant **les recettes Sales ET AccountType**, ainsi que leurs artefacts.

Sur le nouvel état Sales, avant sa fusion :

- `npm run lint`, `npm run build`, `git diff --check` : succès ; avertissement de taille des chunks existant.
- `npm run test:emulators` : **583/583 tests applicatifs**, **5/5 garde-fous**, aucun skip ; seulement `demo-velatra` et les émulateurs Auth/Firestore/Storage locaux.
- QA locale Sales : **884 contrôles / 0 échec** ; QA locale accountType et navigation moderne : **86 / 0 échec**.
- [CI Sales synchronisé](https://github.com/victordefreitassss/Velatra-App---Formule-Basic-/actions/runs/37004732429) : **success**, 583 tests et 5 garde-fous confirmés dans les logs.
- [Mobile browser regression](https://github.com/victordefreitassss/Velatra-App---Formule-Basic-/actions/runs/37004732510) : **success**. Les recettes rôles/formats (**333**), Pulse (**389**), Retain (**417**), Sales (**884**) et AccountType (**86**) ont toutes 0 échec. Ce sont des tests Chromium avec fixtures synthétiques, pas des essais sur iPhone physique.
- [Vercel preview Sales](https://vercel.com/victordefreitassss-projects/velatra-app/6ZH3TbEX7Fe43PktY6Ca4mcjKqN1) : **success** sur le même HEAD.

La PR de ce rapport est docs-only. Son éventuelle fusion ajoute un commit documentaire à main ; le HEAD de release code ci-dessus identifie précisément l'arbre produit et les règles publiés.

## Migration déjà appliquée et état courant

La migration de #36 n'a **pas été réexécutée** pendant cette release. Résultat historique confirmé : **2 clubs migrés vers solo, 0 vers studio, 0 club NEEDS_REVIEW, 0 legacy restant**, deuxième application antérieure : 0 mutation. Le profil lié à un club inexistant reste signalé et intact. Voir [le rapport de migration et son rollback](VELATRA-ACCOUNT-TYPE-MIGRATION.md).

Une lecture seule après publication confirme que les deux clubs migrés sont toujours `solo`, leurs Owners résolvent **SOLO_OWNER**, et les trois membres existants résolvent **MEMBER**. Les capacités Pulse et Retain sont accessibles aux Owners. Les fixtures vérifient ExperienceHome et les compositions Phone/Desktop distinctes à **390×844 et 1440×900**, ainsi que Studio Owner, Studio Manager et Studio Coach sans finance globale.

**Évolution depuis le constat fourni pour la mission :** un troisième club, créé le **2 octobre à 11:48:53 UTC (13:48:53 Paris)**, possède explicitement `accountType: studio`. Sa date de création Firestore et son absence dans l'inventaire original de migration ont été vérifiées en lecture seule. Il est antérieur à cette release ; aucune opération de cette mission ne l'a créé, modifié ou converti depuis solo. Le constat « aucun Studio en production » décrit donc l'inventaire original, pas l'état observé lors de cette release.

| Production lors de la vérification | Nombre |
| --- | ---: |
| Clubs total | 3 |
| Solo | 2 |
| Studio | 1 |
| Clubs NEEDS_REVIEW | 0 |
| Clubs legacy | 0 |
| Profils liés à un club inexistant, laissés intacts | 1 |

Le Studio Owner additionnel résout **STUDIO_OWNER** et ses capacités Pulse/Retain sont accessibles. Studio Manager et Studio Coach sont implémentés et validés sur fixtures ; aucun compte de ces rôles n'a été créé pour tester la release.

## Firestore Rules publiées

Le SHA-256 exact de `firestore.rules` du HEAD de release code est :

```text
b56526c979d03d72800034313f5015be0acdb90b27ff97c16771e89d4d898ad4
```

Avant publication, les deux bases utilisaient le hash antérieur :

```text
c1f22c0c59bc2bebd3e9c21445c11c39a41837b0a35ffc2cebcc98bd742d3c06
```

Les règles Sales empêchent la création directe de prospects par SDK client, limitent leurs updates aux notes/historiques sûrs, protègent les champs analytiques et laissent les écritures `salesEvents` au serveur par default deny côté client. `accountType` reste protégé contre les écritures client.

Le déploiement nécessaire a utilisé exclusivement :

```sh
npx --yes firebase-tools@15.31.0 deploy \
  --only firestore:rules \
  --project velatra-75daa \
  --non-interactive
```

L'accès au projet avait été confirmé par `projects:list`. Le CLI a compilé les règles et publié les deux releases. **La preuve finale est une relecture indépendante via Firebase Rules API**, terminée à **12:17:35 UTC** : GET release active, GET ruleset/source exacte, puis GET release à nouveau pour confirmer sa stabilité. Six requêtes GET, aucune écriture de cette vérification.

| Base | Release active | Ruleset actif après publication | Hash |
| --- | --- | --- | --- |
| `(default)` | `projects/velatra-75daa/releases/cloud.firestore` | `projects/velatra-75daa/rulesets/de7fdbab-5edd-4dce-b87c-ceece85bb10e` | `b56526c979d03d72800034313f5015be0acdb90b27ff97c16771e89d4d898ad4` |
| `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/releases/cloud.firestore/ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/rulesets/e50337f9-4a1a-4c1a-88bb-75dcc3dccfa6` | `b56526c979d03d72800034313f5015be0acdb90b27ff97c16771e89d4d898ad4` |

**Firestore : 2/2 MATCH** avec le fichier du commit Sales fusionné. Aucune modification ni publication Storage. SHA-256 local Storage inchangé : `06bd96bd9b4d6b638661c8c2ea0596ad28e6914d15b3dbbec0bfed0195c7674b`.

## Vercel production

Le déploiement automatique de `main`, source **`c4cb40e65d6b342853ff34f826a407eaccaf8538`**, a été confirmé par le statut GitHub **success** et la page Vercel affichant **Ready / Production / main** avec ce commit exact.

- [Déploiement et preuve Vercel](https://vercel.com/victordefreitassss-projects/velatra-app/HSdqGy8NGRbbaodixD2aQmndHeYA)
- [URL immuable du déploiement](https://velatra-1um30a7ca-victordefreitassss-projects.vercel.app/)
- [Domaine production](https://velatra.app/)

Aucun déploiement Vercel manuel n'a été déclenché. Sales V2 est présent sur main : présence réelle, SHOWED_UP/NO_SHOW, présence non renseignée, corrections tracées, événements structurés, funnel, sources, performance Coach factuelle, Pulse Sales et analytics côté serveur.

## Rollback des règles — procédure non exécutée

Les rulesets précédents ont été enregistrés **avant** le déploiement :

| Base | Ruleset à réactiver en cas de rollback autorisé |
| --- | --- |
| `(default)` | `projects/velatra-75daa/rulesets/bb532e3c-383f-4277-9046-abd934a0fbdc` |
| `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/rulesets/755d7794-54bb-4692-990b-185ccb33a184` |

1. Depuis une session serveur autorisée pour **velatra-75daa**, relire les deux releases actives. Arrêter si elles ne pointent plus vers les rulesets Sales répertoriés ci-dessus : un changement ultérieur doit être vérifié avant tout retour.
2. GET chaque ruleset précédent, vérifier la source exacte `firestore.rules` et son hash **`c1f22c0c59bc2bebd3e9c21445c11c39a41837b0a35ffc2cebcc98bd742d3c06`**. Ne jamais choisir un ancien ruleset par date seule.
3. Après autorisation explicite du rollback, PATCH chaque release Firestore via l'API v1 avec un jeton Google autorisé conservé hors Git. Le corps correspond au format utilisé par Firebase CLI 15.31.0 :

```text
PATCH https://firebaserules.googleapis.com/v1/projects/velatra-75daa/releases/cloud.firestore
```

```json
{"release":{"name":"projects/velatra-75daa/releases/cloud.firestore","rulesetName":"projects/velatra-75daa/rulesets/bb532e3c-383f-4277-9046-abd934a0fbdc"}}
```

```text
PATCH https://firebaserules.googleapis.com/v1/projects/velatra-75daa/releases/cloud.firestore/ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878
```

```json
{"release":{"name":"projects/velatra-75daa/releases/cloud.firestore/ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878","rulesetName":"projects/velatra-75daa/rulesets/755d7794-54bb-4692-990b-185ccb33a184"}}
```

4. Relire indépendamment les releases et leurs rulesets ; exiger **2/2 MATCH** avec l'ancien hash. Le retour n'est pas atomique entre les bases : signaler et corriger une éventuelle exécution partielle.
5. Ce retour restitue les autorisations pré-Sales. Coordonner le retour du code serveur/client Vercel si nécessaire ; ne pas rejouer de conversion, événement Sales, présence ou autre donnée métier. Ne pas toucher Storage, Auth ou Stripe. Le rollback accountType est une procédure distincte, non nécessaire à ce rollback des règles.

**Aucun rollback n'a été exécuté pendant cette release.**

## Périmètre production

Aucun prospect, booking, essai, présence, no-show, membre ou salesEvent de test n'a été créé en production. Les tests fonctionnels ont utilisé des émulateurs ou des fixtures navigateur synthétiques. Les seules publications ont été les fusions Git, les règles Firestore et les déploiements automatiques Vercel. Aucune opération Stripe, aucune mutation Auth, aucun déploiement Firebase Storage, Hosting ou Functions, aucune nouvelle fonctionnalité.
