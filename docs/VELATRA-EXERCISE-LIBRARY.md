# Bibliothèque d’exercices Velatra

La bibliothèque est une surface du contexte **Coaching**. Elle n’ajoute pas de destination globale : les coachs y créent et organisent leurs exercices, puis les retrouvent dans le Program Builder.

## Sources et droits

Deux origines coexistent dans `exercises` :

- les exercices Velatra fournis par `INIT_EXERCISES` et les documents `clubId: "global"` : ils sont visibles en lecture seule ;
- les exercices du club courant : ils peuvent être créés, modifiés, archivés, restaurés ou dupliqués par le personnel autorisé du club.

Un exercice Velatra ne peut pas être modifié ou supprimé depuis l’interface. Le bouton de duplication crée un document neuf pour le club courant, avec un nouvel identifiant numérique, `createdByUid`, les horodatages et un `perfId` propre. Une copie peut conserver les URLs de ses médias ; elle ne copie pas physiquement les fichiers Storage.

## Cycle de vie et compatibilité

La suppression physique n’est pas proposée dans la bibliothèque. L’archivage applique `isArchived: true`. L’exercice reste donc résoluble dans les programmes, séances et historiques qui conservent son `exId`, mais il ne figure plus dans les nouveaux sélecteurs du Program Builder. Le sélecteur garde néanmoins visible l’exercice déjà choisi dans une ancienne séance afin de ne pas casser son édition.

Les champs de connaissance sont facultatifs pour que les documents historiques restent valides : description, consignes, muscles principaux et secondaires, niveau, tags, type, archivage et métadonnées de création/mise à jour.

Pour les exercices anciens sans `exerciseType`, le comportement est déterministe sans réécriture de données : `Cardio` devient `cardio`, `Mobilité` et `Stretching` deviennent `mobility`, et toutes les autres catégories deviennent `strength`.

## Validation

`components/exerciseLibraryModel.ts` est la source partagée de validation et de construction. La page Bibliothèque et la création rapide du Program Builder passent toutes deux par ce modèle. Il normalise la recherche (casse et accents), les tags, les muscles et les champs requis ; il attribue un `perfId` stable fondé sur l’ID numérique de l’exercice.

Les photos nouvelles sont importées dans `clubs/{clubId}/...` et les vidéos dans `videos/{clubId}/{uid}/...`, conformément aux règles Storage existantes. Les formulaires ne créent plus d’images base64 dans Firestore. Les anciens contenus en base64 restent affichables pour éviter une régression, mais ne sont pas produits à nouveau.

## Règles Firebase

Cette livraison ne modifie pas `firestore.rules` ni `storage.rules`. Les règles Firestore existantes limitent la lecture des exercices au global ou au club courant et les écritures au personnel du club. Les règles Storage existantes couvrent les chemins d’images et vidéos ci-dessus. Aucun déploiement Firebase n’est requis pour cette évolution.
