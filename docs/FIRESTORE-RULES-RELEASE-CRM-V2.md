# Vérification des règles Firestore — CRM Prospects V2

## Résultat

- Date de vérification : 30 septembre 2026.
- HEAD vérifié : `e2023e50a38cc4f3875d84c31c79e691d59e3ea0`.
- Projet Firebase : `velatra-75daa` (confirmé dans `.firebaserc` et par Firebase CLI).
- Firebase CLI utilisée pour confirmer le compte : `15.31.0`.
- Décision : les règles CRM V2 avaient déjà été déployées lors de la tâche précédente. Les deux bases correspondent au fichier de ce HEAD. Aucun redéploiement n'a été effectué pendant cette vérification.

## Fichier local et bases

`firebase.json` associe `firestore.rules` à ces deux bases :

| Base | Release active | Ruleset actif | SHA-256 de la source lue dans Firebase Rules API | Correspond au HEAD |
| --- | --- | --- | --- | --- |
| `(default)` | `projects/velatra-75daa/releases/cloud.firestore` | `projects/velatra-75daa/rulesets/ccb1aedb-95c7-460d-9f5b-00959de60342` | `157880bd889b14660f770c9425617ff50986bf325ffd37b4c739f4afd502ace6` | Oui |
| `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/releases/cloud.firestore/ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/rulesets/3d6dfbcc-d972-4bd8-9d7c-d6e599628b91` | `157880bd889b14660f770c9425617ff50986bf325ffd37b4c739f4afd502ace6` | Oui |

SHA-256 local de `firestore.rules` au HEAD `e2023e50` :

`157880bd889b14660f770c9425617ff50986bf325ffd37b4c739f4afd502ace6`

SHA-256 de `firestore.rules` au commit précédent `9d164594ce042456ee7aaf4dc3e6b163656ea255` :

`9418e084f45e80366f72ec7cb6cd0068e841141d04cc7d4a90215d91bfd9c29c`

## Comparaison des releases

Les releases Firestore conservent les noms fixes ci-dessus et pointaient avant la livraison CRM V2 vers les rulesets suivants :

| Base | Ruleset précédent | SHA-256 de la version précédente |
| --- | --- | --- |
| `(default)` | `projects/velatra-75daa/rulesets/ff8bfe22-2421-45bb-8eb0-eb3deb352b13` | `9418e084f45e80366f72ec7cb6cd0068e841141d04cc7d4a90215d91bfd9c29c` |
| `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/rulesets/84e8b88a-df4b-4ce4-b8a7-7fdf439ace60` | `9418e084f45e80366f72ec7cb6cd0068e841141d04cc7d4a90215d91bfd9c29c` |

Les rulesets actifs CRM V2 sont ceux du tableau précédent. Leurs contenus ont été relus via Firebase Rules API et hachés localement. Aucun document métier n'a été lu ou écrit.

## Contrôles et tests

- HEAD local après `git switch main` et `git pull --ff-only origin main` : exactement `e2023e50a38cc4f3875d84c31c79e691d59e3ea0`.
- Dépôt propre avant le changement de branche documentation.
- `git diff --check` : réussi avant la création de ce document.
- GitHub Actions sur le HEAD de la PR #24 (`a2e30c68c774bf962689afbed500a9113f627ef0`, même contenu applicatif fusionné) : CI #52 réussie et Mobile browser regression #35 réussie.
- La CI inclut 265 tests applicatifs et 5 tests d'isolation, dont les scénarios Firestore CRM et conversion.
- État de production : les deux hashes sont déjà égaux au hash du HEAD ; les tests locaux complets n'ont donc pas été relancés et aucun redéploiement n'était requis.

## Déploiement

Statut : **déjà déployé auparavant ; aucun déploiement pendant la vérification du 30 septembre 2026.**

La commande de publication CRM V2 exécutée lors de la tâche précédente était strictement limitée aux règles Firestore :

```sh
firebase deploy --only firestore:rules --project velatra-75daa --non-interactive
```

La CLI avait confirmé la compilation et la publication sur les deux bases. La vérification présente a ensuite relu les deux sources via l'API Rules et confirmé leur SHA-256.

## Protection concernée

Les règles CRM V2 interdisent notamment au SDK client de forger l'état `won` et les champs de conversion serveur (`convertedMemberUid`, `convertedMemberId`, `convertedAt`), de modifier l'identifiant numérique du prospect, de contourner les transitions permises ou de supprimer un prospect qui porte un historique ou une conversion. Les conversions légitimes restent opérées par le serveur Admin SDK. Ces comportements sont couverts par la suite Firestore Rules de la CI.

## Retour arrière

Le rollback republierait les règles du commit précédent `9d164594ce042456ee7aaf4dc3e6b163656ea255` sur les deux bases, sans toucher aux autres services :

```sh
git worktree add /tmp/velatra-rules-crm-rollback 9d164594ce042456ee7aaf4dc3e6b163656ea255
cd /tmp/velatra-rules-crm-rollback
npx --yes firebase-tools@15.31.0 deploy \
  --only firestore:rules \
  --project velatra-75daa \
  --non-interactive
```

Après ce rollback, relire les releases et les deux sources avec Firebase Rules API et comparer chacune au hash précédent `9418e084f45e80366f72ec7cb6cd0068e841141d04cc7d4a90215d91bfd9c29c`. Aucun rollback n'a été exécuté.

## Limites et données

- La lecture indépendante des deux releases et contenus a réussi ; les IDs et les hashes sont confirmés par Firebase Rules API.
- Aucun test d'écriture n'a été dirigé vers la production ; les scénarios d'accès sont testés sur émulateurs dans la CI.
- Aucune donnée prospect n'a été modifiée, aucun membre n'a été créé, aucun compte Firebase Auth n'a été modifié, et aucun service autre que Firestore Rules n'a été déployé.
