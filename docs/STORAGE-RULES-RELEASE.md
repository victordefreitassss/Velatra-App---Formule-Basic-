# Publication et contrôle des règles Storage

## Source de vérité et périmètre

`storage.rules`, validé sur émulateurs et par le `quality-gate`, est la source de vérité. Une publication Storage ne publie ni Firestore, ni Functions, ni Hosting, ni Auth, ni indexes, ni l’application. Toute modification du dépôt suit **branche → PR → quality-gate réussi → merge**. Aucun test de permission n’est exécuté sur des fichiers utilisateurs en production.

Le contrôle manuel de dérive lit uniquement la release exacte et son ruleset. Il n’est pas intégré à la CI des PR : celle-ci teste son fonctionnement avec des réponses fictives, sans identifiants production.

## État initial observé le 28 septembre 2026

| Élément | Valeur |
|---|---|
| HEAD initial | `2cde53fd8e82db717b091b0075ff38d577429047` |
| Projet | `velatra-75daa` |
| Bucket | `velatra-75daa.firebasestorage.app` |
| Release | `projects/velatra-75daa/releases/firebase.storage/velatra-75daa.firebasestorage.app` |
| Ruleset précédent | `projects/velatra-75daa/rulesets/2c4279d6-30d4-4548-a789-9edd679f1779` |
| Date de la release observée | `2026-04-27T08:34:58.856150Z` |
| SHA-256 du contenu précédent | `949798cdff87ce80d176e1213c4f4bdb5ec0223e2dbd7860c2932c0fb5d12f42` |
| Règle globale permissive | Présente : accès lecture/écriture pour tout compte authentifié |
| Inventaire des noms d’objets | **0 objet** ; aucun contenu téléchargé |

Le bucket vide ne prouve pas l’absence d’un accès abusif passé. Il signifie qu’aucun fichier historique ni lien de téléchargement d’objet existant ne nécessite une migration dans ce bucket au moment de cet inventaire. Refaire l’inventaire si la publication est différée ou si de nouveaux fichiers sont ajoutés.

## Chemins, permissions et compatibilité

Les identifiants ci-dessous sont des paramètres de chemin. Le superadmin exige le profil Firestore adéquat, l’adresse fixe déjà définie dans les règles et `email_verified == true` ; cette procédure ne modifie pas son identité ni n’élargit ses droits.

| Famille actuelle | Sources de l’application | Lecture | Création/remplacement ; suppression | Types et maximum |
|---|---|---|---|---|
| `avatars/{uid}/{file}` | `pages/ProfilePage.tsx`, `pages/MembersPage.tsx` | Soi ; coach affecté pour un membre ; owner du club ; superadmin. Le membre voit aussi l’owner et son coach affecté ; les coachs voient les avatars du staff du club. | Soi ; coach affecté au membre ; owner du club ; superadmin selon les droits existants sur la cible | JPEG, PNG, WebP, GIF ; 5 MiB |
| `users/{uid}/documents/{file}` | `pages/MembersPage.tsx` | Soi ; coach affecté ; owner du club ; superadmin pour un membre | Mêmes droits ; suppression indépendante du type/taille du nouvel upload | PDF, JPEG, PNG, WebP, texte, DOC, DOCX ; 25 MiB |
| `contracts/{uid}/{file}` | `pages/MembersPage.tsx` ; lecture aussi dans `pages/ProfilePage.tsx` | Même contrôle de profil que les documents | Même contrôle que les documents | Même liste que les documents ; 25 MiB |
| `clubs/{clubId}/{file}` | `pages/SettingsPage.tsx`, `pages/AdminDashboard.tsx` | Profils du même club ; superadmin vérifié | Staff du club ou superadmin ; suppression selon le même contrôle | JPEG, PNG, WebP, GIF ; 5 MiB |
| `videos/{clubId}/{uploaderUid}/{file}` | `pages/ExercisesPage.tsx` ; lecture dans `components/WorkoutView.tsx` | Profils du club du chemin ; aucun catalogue `global` ouvert | Upload/remplacement par le staff identifié dans le chemin ; suppression par cet uploader ou l’owner du club | `video/*` avec sous-type non vide ; 50 MiB |
| `drive/{clubId}/{uploaderUid}/{fileId}/{file}` | `pages/DrivePage.tsx`, `pages/MembersPage.tsx` | Bibliothèque commune au staff du club et au superadmin ; membre du club explicitement partagé, avec métadonnées correspondant au chemin | Upload/remplacement par le staff identifié dans le chemin ; suppression par cet uploader, l’owner du club ou le superadmin | Documents ci-dessus, images usuelles et vidéos ; 25 MiB |

Tout chemin non déclaré est refusé. Les accès anonymes privés et les accès interclubs non autorisés sont refusés. Les tests d’isolation intercoachs portent sur les fichiers personnels des membres ; le Drive a aujourd’hui une sémantique distincte de bibliothèque commune au staff.

Les 10 points d’upload produisent une URL avec `getDownloadURL`. Les seules suppressions d’objets actuellement câblées dans l’interface concernent le Drive. Retirer un document administratif de la fiche membre retire sa référence Firestore, pas son objet Storage : c’est une limite préexistante, pas une suppression effectuée par cette publication.

### Drive : ordre et liaison des métadonnées

L’application alloue `fileId`, envoie le fichier, appelle `getDownloadURL`, puis crée `driveFiles/{fileId}`. La lecture de l’uploader staff doit fonctionner **avant** la création des métadonnées. La suppression suit l’ordre inverse : objet Storage, puis document Firestore.

Pour un membre, le document doit correspondre à `id`, `clubId`, `name` et au `path` complet, et `sharedWith` doit contenir son identifiant métier numérique. `uploadedBy` est également un identifiant métier numérique, tandis que le segment `uploaderUid` est l’UID Firebase Auth. Les droits de suppression Storage reposent sur l’UID du chemin et le rôle autorisé, pas sur une simple déclaration `uploadedBy` modifiable. Aucun renommage de fichier n’est implémenté dans l’interface actuelle.

### Anciennes conventions

L’historique Git contient `avatars/{numericId}_{timestamp}`, `contracts/{numericId}_{timestamp}_{filename}`, `videos/{timestamp}_{filename}` et `drive/{clubId}/{fileId}_{filename}`. Ces chemins ne sont plus générés par le code actuel, ne correspondent à aucun objet de l’inventaire initial et restent refusés. Classement : **C — anciennes conventions inutilisées dans le bucket inventorié**, sans règle permissive de compatibilité.

## Préflight avant publication

1. Actualiser `origin/main`, noter le SHA, vérifier l’arbre propre et la réussite du `quality-gate` de la PR à publier.
2. Relire la release/ruleset exacts et archiver leurs identifiants, dates et hash dans le rapport opérationnel privé. Ne pas télécharger de contenu utilisateur.
3. Confirmer la couverture des chemins actuels et l’absence de chemin production important non identifié.
4. Exécuter `npm run lint`, `npm run build`, `npm run test:emulators` et `git diff --check`. Examiner les résultats Storage, Firestore et Auth ; aucun test ignoré ne doit être présenté comme réussi.
5. Vérifier les profils nécessaires dans **`(default)/users`**. Les règles Storage ne consultent pas la base isolée de développement.
6. Vérifier explicitement le prérequis IAM ci-dessous avant toute publication.

Les preuves de tests, la PR, le SHA final, le nouveau ruleset et le hash publié sont à archiver dans la PR et le rapport opérationnel après exécution. Ce document ne préjuge pas de leur réussite.

### Autorisation de lecture Firestore par Storage

Le préflight initial a constaté l’absence du binding requis. Après validation technique, une étape IAM explicite doit accorder **uniquement** `roles/firebaserules.firestoreServiceAgent` au service agent Firebase Storage :

```text
service-PROJECT_NUMBER@gcp-sa-firebasestorage.iam.gserviceaccount.com
```

Ce rôle fournit `datastore.entities.get`. Ne pas l’accorder à un compte humain ou à un autre compte de service. Préserver les autres bindings et l’`etag`, puis relire la policy pour vérifier exactement ce changement. Il s’agit d’un prérequis de configuration identifié, distinct de la publication des règles, et non d’une modification des données Firestore.

La vérification utilise la lecture IAM `projects:getIamPolicy` avec `requestedPolicyVersion: 3` ; malgré la méthode HTTP POST, elle ne modifie aucune policy. Vérifier le numéro de projet, le principal exact et toute condition du binding. Un `404` sur `projects/velatra-75daa/serviceAccounts/...` ne prouve pas l’absence de cet agent géré par Google : ces agents n’appartiennent pas à la liste des comptes de service du projet et ne sont pas directement accessibles. Le CLI saute explicitement cette recherche de compte pour ce binding. Ne pas provisionner une nouvelle identité sur ce seul `404`. Le compte qui publie doit aussi disposer des droits Rules nécessaires, contrôlables sans mutation par `projects:testIamPermissions`. Voir les [types de comptes de service officiels](https://docs.cloud.google.com/iam/docs/service-account-types).

**Attention à Firebase CLI 15.31.0 :** le mode interactif peut proposer puis effectuer un ajout IAM ; `--non-interactive` saute ce contrôle. Ne pas utiliser `--force` ni considérer un déploiement réussi comme une preuve du bon fonctionnement de `firestore.get`. Une configuration `storage` sous forme d’objet simple peut aussi activer une API pendant la recherche du bucket, y compris en dry run : utiliser le tableau à bucket explicite ci-dessous.

## Publication ciblée

Préparer un dossier temporaire contenant une copie byte-for-byte du `storage.rules` validé et ce `firebase.json`, sans hooks `predeploy`/`postdeploy` :

```json
{
  "storage": [
    {
      "bucket": "velatra-75daa.firebasestorage.app",
      "rules": "storage.rules"
    }
  ]
}
```

Comparer les deux SHA-256 avant publication. Conserver le nom source exact `storage.rules` ; ne pas configurer son chemin absolu comme nom de source. Puis, en remplaçant le chemin temporaire de l’exemple :

```sh
npx --yes firebase-tools@15.31.0 deploy \
  --only storage \
  --project velatra-75daa \
  --config /chemin/temporaire/firebase.json \
  --non-interactive
```

`--only storage` déploie les règles Storage. `storage:rules` désignerait un target nommé `rules`, pas un sous-produit. Ne jamais lancer `firebase deploy` sans scope. En cas de quota ou d’erreur, arrêter ; ne pas supprimer automatiquement d’anciens rulesets.

## Vérification et détection de dérive

Depuis la racine du dépôt, avec un fournisseur OAuth déjà configuré, transmettre le jeton **directement par pipe**. Exemple si `gcloud` est disponible et connecté :

```sh
gcloud auth print-access-token | node scripts/audit/storage-rules-drift.mjs \
  --project velatra-75daa \
  --bucket velatra-75daa.firebasestorage.app \
  --rules storage.rules \
  --confirm-production-read velatra-75daa/velatra-75daa.firebasestorage.app \
  --token-stdin
```

Le fournisseur peut être remplacé par le flux OAuth local existant, sans afficher le jeton. Aucun jeton en argument, fichier, conversation, log ou variable versionnée. Ne pas activer le traçage shell. Ne pas exécuter ce contrôle avec les variables d’émulateur ou dans la CI normale.

Le lecteur effectue **GET release → GET ruleset référencé → GET release** et refuse une release ayant changé durant la comparaison. Il n’imprime ni source, ni corps d’erreur distant, ni credential. Le hash SHA-256 porte sur les octets UTF-8 exacts : espaces, BOM et fins de ligne compris.

Codes de sortie : **0 = correspondance**, **2 = dérive constatée**, **1 = contrôle incomplet/erreur**. Un contrôle incomplet n’est jamais une preuve de conformité. Archiver bucket, release, ruleset, date, hash du dépôt, hash déployé et `match: true` immédiatement après publication, puis à chaque release Firebase.

Rejouer les accès autorisés/refusés et les parcours avatar, document, contrat, Drive, vidéo et logo avec les fixtures locales. Tous les tests de permission utilisent les émulateurs ; aucun upload, remplacement, téléchargement ou effacement d’objet utilisateur production pour « vérifier » une règle. Les smoke tests locaux ne prouvent pas à eux seuls le fonctionnement IAM en production : conserver cette distinction dans le compte-rendu.

## Rollback préparé avant publication

La release pointe vers un ruleset immuable. Conserver son identifiant avant et après l’opération. La méthode de restauration technique est le PATCH officiel sur **la même release Storage**, jamais la suppression du bucket ou d’objets :

```http
PATCH https://firebaserules.googleapis.com/v1/projects/velatra-75daa/releases/firebase.storage/velatra-75daa.firebasestorage.app
Content-Type: application/json

{
  "release": {
    "name": "projects/velatra-75daa/releases/firebase.storage/velatra-75daa.firebasestorage.app",
    "rulesetName": "projects/velatra-75daa/rulesets/IDENTIFIANT_VERIFIE"
  }
}
```

Avant le PATCH : GET de la release et du ruleset cible, comparaison des identifiants et hash attendus, arrêt en cas de changement concurrent. Après : GET de la release, GET du ruleset effectivement référencé et comparaison du hash. Injecter l’authentification en mémoire, sans token en ligne de commande. Aucun `updateMask` n’est nécessaire pour ce payload, identique au CLI ; l’API ne modifie que `rulesetName`.

**Ne jamais restaurer automatiquement le ruleset initial permissif.** Son identifiant ci-dessus est une preuve d’audit, pas une recommandation de rollback. Préférer un correctif restrictif testé. En urgence, une fermeture temporaire peut être préparée et validée explicitement ; elle interrompt tous les accès clients et n’est pas déployée par cette procédure :

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Limites à conserver dans le rapport

- Les URL de `getDownloadURL` sont des liens porteurs de jeton. Modifier les règles ne révoque pas ces liens. Le bucket initialement vide n’en contient aucun objet existant, mais les futurs uploads en créent ; une révocation complète du partage demanderait une évolution distincte du téléchargement.
- Le Drive actuel est commun au staff du club : ses métadonnées Firestore, y compris les URL, restent lisibles par les coachs du club. Ne pas annoncer une isolation intercoachs générale du Drive ou une révocation absolue par simple modification de `sharedWith`.
- Un profil présent seulement dans la base isolée ne satisfait pas la dépendance à `(default)`. Le superadmin conserve les contraintes existantes, notamment l’absence de lecture vidéo interclub générale.
- Les sélecteurs `image/*` sont plus larges que les formats autorisés ; les limites 5/25/50 MiB sont imposées par les règles, mais seule celle des vidéos est déjà affichée et vérifiée dans l’interface. Un MIME absent, vide, inconnu ou interdit doit être refusé, sans repli permissif.
- Le MIME déclaré et la taille ne constituent ni une analyse antivirus ni une validation du contenu réel. Aucun document utilisateur n’est inspecté pendant cette opération.

Références officielles : [permissions cross-service](https://firebase.google.com/docs/rules/manage-deploy#manage_permissions_for_cross-service), [rôle du service agent](https://docs.cloud.google.com/iam/docs/roles-permissions/firebaserules), [mise à jour d’une release](https://firebase.google.com/docs/reference/rules/rest/v1/projects.releases/patch).
