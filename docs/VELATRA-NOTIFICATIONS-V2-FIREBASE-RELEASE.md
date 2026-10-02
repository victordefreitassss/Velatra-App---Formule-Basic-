# Notifications & Communications V2 — release Firebase

## Source et périmètre

- Date : 2 octobre 2026 (UTC ; heure locale Europe/Paris).
- Projet vérifié par `firebase-tools@15.31.0 projects:list` : **`velatra-75daa`**.
- HEAD main publié : **`efb116d76d5e73bbca221041065e72993d674312`**, merge de [PR #40](https://github.com/victordefreitassss/Velatra-App---Formule-Basic-/pull/40).
- Ancêtre Notifications V2 confirmé par `git merge-base --is-ancestor` : `d5d925c736a1fd5e8939d6c8cba8275891b51269`.
- SHA-256 des octets exacts de `firestore.rules` à ce HEAD : **`a2f16377f9878c60c4d8cfbd42882d50224f07a6ee75dbfc1a24623f7d6b3172`**.
- Aucun changement de code, de règles, d'index JSON ou de fonctionnalité pendant cette release. La PR de release ajoute uniquement ce document.

Le 2 octobre à 20:09 UTC, la commande suivante a terminé avec le code 0 :

```sh
npx --yes firebase-tools@15.31.0 deploy \
  --only firestore:rules,firestore:indexes \
  --project velatra-75daa \
  --non-interactive
```

`firebase.json` publie les mêmes règles sur les deux bases. Seule `(default)` référence `firestore.indexes.json` ; aucun index Enterprise n'a été configuré ou déployé.

## Règles avant et après

La lecture avant publication a eu lieu à **20:04:02 UTC**. Les deux anciennes sources ont le hash `b56526c979d03d72800034313f5015be0acdb90b27ff97c16771e89d4d898ad4`.

Tous les identifiants courts du tableau ont le préfixe `projects/velatra-75daa/rulesets/`.

| Base | Ruleset avant | Ruleset après | Hash après |
| --- | --- | --- | --- |
| `(default)` | `de7fdbab-5edd-4dce-b87c-ceece85bb10e` | `ef440492-5103-4a44-a5d2-8b687058578c` | `a2f16377f9878c60c4d8cfbd42882d50224f07a6ee75dbfc1a24623f7d6b3172` |
| `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `e50337f9-4a1a-4c1a-88bb-75dcc3dccfa6` | `308b3b8e-532a-4c05-a867-24d0727db92a` | `a2f16377f9878c60c4d8cfbd42882d50224f07a6ee75dbfc1a24623f7d6b3172` |

Vérification indépendante après déploiement, à **20:09:50 UTC**, par six GET Firebase Rules API : lecture de chaque release active, lecture du ruleset référencé et de sa source exacte UTF-8 `firestore.rules`, puis relecture de la release pour vérifier la stabilité de `rulesetName` et `updateTime`. Le SHA-256 de chaque source correspond au fichier du HEAD main : **2/2 MATCH**.

Releases contrôlées :

- `projects/velatra-75daa/releases/cloud.firestore` ; mise à jour `2026-10-02T20:09:35.774360Z`.
- `projects/velatra-75daa/releases/cloud.firestore/ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` ; mise à jour `2026-10-02T20:09:35.215163Z`.

## Index Notifications

L'inventaire paginé via Firestore Admin API avant publication, relu à **20:09:11 UTC**, contient **0 index composite et 0 surcharge de champ / TTL** dans `(default)`. Il n'y avait donc aucun index précédent omis à réconcilier. Les index automatiques par champ de l'édition Standard restent gérés par Firestore.

- `(default)` : édition **STANDARD**, `FIRESTORE_NATIVE`, région `eur3`.
- Deuxième base : édition **ENTERPRISE**, `FIRESTORE_NATIVE`, région `europe-west1` ; règles seulement pour cette release.
- Nouvel index : **`projects/velatra-75daa/databases/(default)/collectionGroups/items/indexes/CICAgOjXh4EK`**.
- Collection group : **`items`** ; scope **`COLLECTION`**.
- Champs, dans cet ordre : **`readAt ASCENDING`, `createdAt DESCENDING`, `__name__ DESCENDING`**.
- Densité retournée par l'API : `SPARSE_ALL`.
- État observé à **20:09:48 UTC** : **CREATING**. La présence de l'index est confirmée ; cet état n'est pas une preuve de disponibilité.
- Après publication : **1 index composite**, correspondant à la configuration locale ; **0 surcharge de champ / TTL**.
- Index existants préservés : **OUI**. Index supprimé : **NON**. Aucun `--force`, aucune demande de suppression, aucun DELETE exécuté.

## Validations et Vercel

Validations avant déploiement sur le HEAD main ci-dessus, sans modification de source :

| Commande | Résultat |
| --- | --- |
| `npm run lint` | PASS, code 0 |
| `npm run build` | PASS, code 0 |
| `npm run test:emulators` | PASS : 673 tests applicatifs et 5 garde-fous CI ; 0 échec, 0 test ignoré |
| `git diff --check` | PASS |

Les tests utilisent les émulateurs Auth / Firestore / Storage et le projet **`demo-velatra`**, distinct de la production. La browser QA complète n'a pas été relancée localement pour cette release documentaire.

[Vercel — deployment `DqxQa32USGAJGaXmv8cAfivj4rWg`](https://vercel.com/victordefreitassss-projects/velatra-app/DqxQa32USGAJGaXmv8cAfivj4rWg) : statut GitHub **SUCCESS** et tableau de bord **Ready**, environnement **Production**, branche **main**, source exacte **`efb116d76d5e73bbca221041065e72993d674312`**, domaine **`velatra.app`**. Aucun redéploiement manuel Vercel.

Limites observées : le build conserve un avertissement de taille de chunk (> 500 kB). Le compilateur Rules annonce une fonction inutilisée `memberOwnsConversation` et des avertissements `Invalid function name: exists/get`, puis confirme la compilation réussie des deux cibles. Les règles fusionnées ont été publiées à l'identique ; ces avertissements n'ont pas été corrigés dans cette mission de release.

## Périmètre production respecté

**Aucune notification de test, aucun pushDevice, aucun message de test et aucun push FCM réel.** Aucune lecture ni écriture de documents métier en production ; les lectures cloud concernent uniquement les métadonnées de projets, bases, règles et index. Aucun changement de rôle, d'Auth ou de Stripe. Storage, Hosting, Functions et Realtime Database n'ont pas été déployés. Aucun rollback exécuté.

## Rollback des règles — procédure non exécutée

1. Coordonner le retour de la fonctionnalité avec le code serveur/client avant de restaurer les autorisations précédentes. Depuis une session serveur autorisée pour `velatra-75daa`, GET les deux releases actives. Arrêter si elles ne pointent plus vers les rulesets « après » du tableau : une release ultérieure nécessite une nouvelle évaluation.
2. GET les deux rulesets « avant », vérifier la source exacte et le hash **`b56526c979d03d72800034313f5015be0acdb90b27ff97c16771e89d4d898ad4`**. Choisir les identifiants explicitement, pas uniquement une date.
3. Après autorisation spécifique du rollback, envoyer les deux PATCH ci-dessous avec un jeton OAuth Google conservé en mémoire, hors Git et hors arguments de commande. Le payload reprend le format de Firebase CLI 15.31.0 ; seule la référence `rulesetName` change. [Référence officielle `projects.releases.patch`](https://firebase.google.com/docs/reference/rules/rest/v1/projects.releases/patch).

```text
PATCH https://firebaserules.googleapis.com/v1/projects/velatra-75daa/releases/cloud.firestore
```

```json
{"release":{"name":"projects/velatra-75daa/releases/cloud.firestore","rulesetName":"projects/velatra-75daa/rulesets/de7fdbab-5edd-4dce-b87c-ceece85bb10e"}}
```

```text
PATCH https://firebaserules.googleapis.com/v1/projects/velatra-75daa/releases/cloud.firestore/ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878
```

```json
{"release":{"name":"projects/velatra-75daa/releases/cloud.firestore/ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878","rulesetName":"projects/velatra-75daa/rulesets/e50337f9-4a1a-4c1a-88bb-75dcc3dccfa6"}}
```

4. Relire indépendamment chaque release, son ruleset et sa source. Exiger **2/2 MATCH** avec l'ancien hash. Ces deux PATCH ne sont pas atomiques : signaler et traiter toute restauration partielle.
5. Ne modifier aucune donnée métier et ne déclencher aucun FCM pendant cette opération. **Aucun de ces PATCH n'a été exécuté pendant la release.**

## Rollback de l'index — procédure séparée, non exécutée

L'index ajouté peut être conservé lors d'un rollback des règles. S'il devient inutile après rollback du code et vérification des autres requêtes sur `items`, sa suppression future doit faire l'objet d'une autorisation explicite et d'une mise à jour de `firestore.indexes.json` dans une PR dédiée.

Dans cette future opération seulement, identifier dans la console Firestore de la base `(default)` l'index **`CICAgOjXh4EK`**, vérifier ses trois champs et son scope, puis supprimer uniquement cet index. Arrêter si son identité ou sa configuration diffère. Relire ensuite l'inventaire complet et vérifier que tous les autres index restent présents. Ne pas employer `--force` sur un fichier incomplet pour ce rollback. **Aucun index n'a été supprimé pendant cette mission.**
