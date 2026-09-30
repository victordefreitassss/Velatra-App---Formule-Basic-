# Vérification de release Firestore — Coaching Follow-up

## Portée

- Date : 2026-09-30
- HEAD vérifié : `ac4e7f4ec8e57fcc7ca65d2a8deeaa70f5e02c28`
- Projet Firebase actif : `velatra-75daa` (`.firebaserc`, alias `default`)
- Bases déclarées dans `firebase.json` : `(default)` et `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878`
- SHA-256 exact de `firestore.rules` : `661ab5aa2dd4ee4b0d4e77afbf932f86b75809d4baa68643a9f14a968af9c3f2`
- Changements apportés par cette vérification : documentation uniquement.

Cette opération ne lit ni n'écrit aucun document métier, ne lance pas de migration et ne modifie ni Firebase Auth ni Storage.

## État de la release

Avant cette vérification, la commande ciblée Firebase CLI 15.31.0 avait terminé avec succès pour le projet `velatra-75daa`. La sortie indiquait la publication du fichier `firestore.rules` sur les deux bases configurées. Cette publication correspondait au même SHA-256 que celui calculé sur le HEAD ci-dessus : l'arbre du commit de merge `ac4e7f4` et celui de la branche contrôlée étaient identiques.

La vérification actuelle des ressources de production via l'API Firebase Rules a renvoyé une erreur serveur HTTP 500. Les IDs et dates des rulesets/releases en vigueur n'ont donc pas pu être lus ni recoupés indépendamment. Les anciennes et nouvelles releases n'étaient pas identifiables dans la sortie de déploiement CLI. Aucun nouveau déploiement n'a été lancé pendant cette vérification : le hash local correspond déjà à la release publiée avec succès dans l'opération précédente.

| Base | Déploiement confirmé par la sortie CLI précédente | Release/ruleset ID relu dans l'API |
| --- | --- | --- |
| `(default)` | Oui — `firestore.rules`, déploiement réussi | Indisponible (API HTTP 500) |
| `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | Oui — `firestore.rules`, déploiement réussi | Indisponible (API HTTP 500) |

## Vérifications

- `npm run lint` : réussi sur le HEAD exact.
- `npm run build` : réussi sur le HEAD exact.
- `npm run test:emulators` : le lancement local n'a pas pu télécharger Firebase CLI 15.31.0, car `registry.npmjs.org` était inaccessible (`ENOTFOUND`). Aucun test n'a échoué localement ; l'exécution n'a pas démarré.
- Suite GitHub Actions sur l'arbre de code fusionné : réussie, 230 tests passés, dont les tests Firestore rules et les scénarios d'accès Follow-up. La CI avait réussi avant la release précédente.
- `git diff --check` : réussi.
- Aucun test d'écriture de données métier n'a été exécuté.

## Déploiement ciblé

Commande utilisée lors de la publication précédente :

```sh
firebase deploy --only firestore:rules --project velatra-75daa --non-interactive
```

La commande n'incluait aucune cible Hosting, Functions, Storage ou autre service. Firebase CLI a confirmé la compilation puis la publication des règles aux deux bases Firestore configurées.

## Rollback

La version de règles avant le suivi longitudinal se trouve à `firestore.rules` au commit `e1f09550ecccd44326eeb4ac1caef4948c0d2256` (SHA-256 : `2601d2ef863f5ed0deb008fbbeccb53d73df47cc608b3703d7ddcadb422336ed`). Les IDs des releases de production précédentes n'étant pas lisibles, un rollback consiste à republier ce fichier historique sur les deux bases, en n'utilisant que la cible Firestore :

1. Extraire `firestore.rules` et `firebase.json` depuis le commit `e1f09550ecccd44326eeb4ac1caef4948c0d2256` dans un répertoire temporaire.
2. Depuis ce répertoire, exécuter `firebase deploy --only firestore:rules --config firebase.json --project velatra-75daa --non-interactive`.
3. Vérifier dans la sortie CLI que les règles ont été publiées sur les deux bases, puis comparer le hash de la source au SHA-256 ci-dessus.

Aucun rollback n'a été lancé.

## Limites

- Les IDs et dates des releases/rulesets ne sont pas confirmés indépendamment, l'API Firebase Rules ayant renvoyé HTTP 500.
- L'environnement local ne pouvait pas atteindre npm pour relancer les émulateurs ; la preuve de tests disponible provient de GitHub Actions sur le même arbre de code fusionné.
- La vérification de déploiement confirme la sortie de Firebase CLI, mais pas une lecture indépendante du contenu publié via l'API Rules.
