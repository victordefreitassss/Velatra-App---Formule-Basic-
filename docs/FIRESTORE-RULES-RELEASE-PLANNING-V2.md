# Publication des règles Firestore — Planning V2

## Résultat

- Date : 30 septembre 2026 (publication à 14:43 UTC)
- HEAD déployé : `1eb8241ba50a75fc6710884622a467b650b75d59` (merge de la PR #21)
- Projet explicitement ciblé : `velatra-75daa` (`.firebaserc` le définit aussi comme projet par défaut)
- Firebase CLI : `15.31.0`
- Fichier : `firestore.rules`
- SHA-256 local : `9418e084f45e80366f72ec7cb6cd0068e841141d04cc7d4a90215d91bfd9c29c`

## Bases et état des releases

`firebase.json` configure les deux bases suivantes et leur associe le même fichier `firestore.rules` :

| Base | Release avant | Ruleset avant | Release après | Ruleset après | Source publiée |
| --- | --- | --- | --- | --- | --- |
| `(default)` | `projects/velatra-75daa/releases/cloud.firestore` | `4e161184-5819-481c-92ae-5a8b35981731` | `projects/velatra-75daa/releases/cloud.firestore` | `ff8bfe22-2421-45bb-8eb0-eb3deb352b13` | `9418e084f45e80366f72ec7cb6cd0068e841141d04cc7d4a90215d91bfd9c29c` |
| `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/releases/cloud.firestore/ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `514fbe75-f1c8-4f69-b420-e3131687ae13` | `projects/velatra-75daa/releases/cloud.firestore/ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `84e8b88a-df4b-4ce4-b8a7-7fdf439ace60` | `9418e084f45e80366f72ec7cb6cd0068e841141d04cc7d4a90215d91bfd9c29c` |

Avant publication, les deux releases pointaient vers leurs rulesets précédents. La source de chacun avait le SHA-256 `661ab5aa2dd4ee4b0d4e77afbf932f86b75809d4baa68643a9f14a968af9c3f2`.

La liste des bases a été relue via l’API Cloud Firestore : les deux ressources appartiennent à `projects/velatra-75daa`, sont de type `FIRESTORE_NATIVE` et se trouvent respectivement dans `eur3` et `europe-west1`. L’API Firebase Rules a permis de lire les releases et le contenu des rulesets avant et après publication ; aucune erreur HTTP 500 n’a été rencontrée.

## Contrôles et publication

Validations sur le HEAD déployé :

- `npm run lint` : réussite.
- `npm run build` : réussite (avertissement préexistant de taille d’un bundle).
- `npm run test:emulators` : 253 réussis, 0 échec.
- `git diff --check` : réussite.

Les tests d’émulateur incluent la lecture limitée des bookings et le refus des écritures directes `CREATE`, `UPDATE` et `DELETE`, ainsi que les réservations serveur, annulations, déplacements, crédits, remboursement unique et concurrence. Les erreurs `PERMISSION_DENIED` imprimées pendant les tests correspondent aux tentatives d’écriture interdites que les tests vérifient.

Commande exécutée depuis le dépôt au HEAD ci-dessus :

```sh
npx --yes firebase-tools@15.31.0 deploy --only firestore:rules --project velatra-75daa --non-interactive
```

La CLI a confirmé deux compilations réussies de `firestore.rules`, deux téléversements et deux messages `released rules` avant `Deploy complete`. L’API Firebase Rules a ensuite relu les deux rulesets : le SHA-256 du contenu source publié est identique au SHA-256 local pour chaque base.

## Smoke de sécurité et limites

Aucune requête de mutation n’a été adressée à une base de production. Aucun booking, document, compte Auth, objet Storage ou service Hosting/Functions n’a été modifié. La vérification du refus des écritures SDK directes a été faite avec les émulateurs, sans créer de réservation réelle. Les lectures autorisées et les refus cross-member/cross-club ont été vérifiés dans la suite d’émulateurs. Les règles de production ont été vérifiées indépendamment en lisant les releases et leur source via l’API Firebase Rules ; aucun test de règles contre des données de production n’a été exécuté.

La fusion Vercel ne publie pas les règles Firestore. Toute nouvelle modification de `firestore.rules` doit être publiée séparément et vérifiée pour les deux releases.

## Retour arrière

Le hash de `firestore.rules` au commit précédent `60bbc8acc432ed455df2aa4f56e16f88209446b9` est :

`661ab5aa2dd4ee4b0d4e77afbf932f86b75809d4baa68643a9f14a968af9c3f2`

Pour republier cette version sur les deux bases sans toucher aux autres services, utiliser un checkout isolé du commit précédent :

```sh
git worktree add /tmp/velatra-rules-rollback 60bbc8acc432ed455df2aa4f56e16f88209446b9
cd /tmp/velatra-rules-rollback
npx --yes firebase-tools@15.31.0 deploy --only firestore:rules --project velatra-75daa --non-interactive
```

La commande est strictement limitée aux règles Firestore. Après son exécution, relire les deux releases et comparer chaque source au SHA-256 ci-dessus. La publication actuelle n’a pas nécessité de rollback.
