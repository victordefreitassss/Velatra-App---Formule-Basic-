# Audit des affectations adhérent / coach — lecture seule

## Périmètre et point de départ

Base : `69bfe695eeba6d5285cda420a8f3cd28d7d1cebb`, HEAD égal à origin/main après fetch, arbre propre. Quality-gate du run `36355765054` réussi et Vercel Production Ready avant intervention. Branche dédiée `audit/legacy-member-assignment`, publication par PR et check requis ; aucun push direct sur main.

Cette passe observe les profils, sans migration, correction d'attribution, changement de règles ou de frontend. Les compteurs portent sur les documents `users` de rôle exactement `member`, pas sur une liste de comptes Firebase Authentication. Les fiches sans rôle membre ne sont pas assimilées arbitrairement à des adhérents.

## Modèle actuel

- L'identité canonique est le chemin `users/{AuthUID}` ; `firebaseUid` doit correspondre à ce chemin. `id` est l'identifiant métier numérique utilisé par les documents liés.
- `assignedCoachUid` doit référencer un document utilisateur existant, de rôle **coach**, dans le même club. Un owner ou un superadmin n'est pas une cible autorisée par l'API d'affectation (`server.ts`, route `/api/assign-member-coach`).
- Un indépendant inscrit comme « coach » reçoit en réalité le rôle `owner`. Les inscriptions publiques et les membres créés par un owner ne reçoivent pas automatiquement d'attribution. **MISSING n'établit donc ni une fuite ni la nécessité d'une migration.** Un owner dispose déjà de l'accès au club.
- Création par un coach : l'API fixe son UID comme attribution et actualise son `assignedMemberIds`. Cet index numérique est dérivé, pas une preuve permettant de choisir un coach.
- `createdByUid` établit l'auteur initial, pas une attribution courante. Le propriétaire du club, un booking, un programme ou des conversations ne justifient jamais à eux seuls une réaffectation.

## Collections et autorisations

| Collection / ressource | Rôle de l'affectation |
| --- | --- |
| `users` et ses métadonnées `documents` | Coach : membre du même club dont le profil porte son UID. Owner : club entier. L'index numérique intervient aussi dans les modifications coach. |
| `programs`, `archivedPrograms`, `performances`, `logs`, `bodyData`, `nutritionPlans`, `nutritionLogs`, `subscriptions`, `payments`, `supplementOrders`, `progressPhotos`, `notifications` | Lecture coach sur la copie `assignedCoachUid` du document et le même club. Modification coach aussi conditionnée par l'index membre ; droits propres des membres selon la collection. |
| `messages` | Même contrôle de lecture ; écriture coach limitée à sa conversation avec un membre de son index. |
| `bookings` | Lecture sur l'attribution du booking ; API de réservation vérifie le profil courant. L'annulation serveur se fie à l'attribution du booking. |
| `dailyCheckIns` | Pas d'accès direct Firestore ; API de l'adhérent authentifié. |
| `aiConversations` | Pas d'accès direct ; API avec identité de conversation et attribution courante du profil pour le coach. Aucun message lu dans cet audit. |
| Storage : avatars, `users/{uid}/documents`, `contracts/{uid}` | Les règles **du dépôt** consultent l'affectation courante dans `(default)/users`. État déployé à distinguer ci-dessous. |
| `driveFiles` et fichiers Drive du club | Partage staff / membres autorisés ; ce n'est pas une isolation par `assignedCoachUid`. |

`logs` est la collection des SessionLog. Il n'existe pas de collection autonome `sessionLogs` ou `documents` autorisée dans les règles actuelles. La liste des 14 collections à attribution dénormalisée est définie dans `server.ts` et `firebase.ts`.

## Utilisation du script

Le script n'importe ni le serveur ni un SDK Firebase. Il effectue exclusivement des requêtes REST **GET** vers les métadonnées de la base et `/documents/users`, avec la projection exacte : `id`, `role`, `clubId`, `firebaseUid`, `assignedCoachUid`, `assignedMemberIds`, `createdByUid`. Il ne lit ni e-mail, téléphone, nom, santé, paiement, messages ou objectifs.

La session OAuth existante doit fournir un jeton uniquement par stdin, jamais par argument, dépôt ou conversation. Exemple si Google Cloud CLI est déjà connecté avec un compte autorisé :

```sh
gcloud auth print-access-token | node scripts/audit/member-assignment-audit.mjs \
  --environment production --dry-run --project velatra-75daa \
  --database '(default)' --confirm-production-read 'velatra-75daa/(default)' \
  --token-stdin
```

La confirmation est répétée explicitement pour chaque base. Le CLI refuse un environnement manquant, un mode non dry-run, un mélange production/émulateur, les arguments inconnus ou dupliqués et toute exécution sous `CI`. Le code ne propose aucun mode d'écriture. Un transport avec méthode autre que GET, corps, redirection, autre origine/collection ou projection élargie échoue **avant** l'appel réseau. Le jeton ne figure jamais dans le rapport, les erreurs ou les arguments.

La lecture production est paginée à un instant `readTime` fixe obtenu depuis la date HTTP de Google ; une erreur, une page répétée ou une réponse invalide rend l'audit incomplet et provoque un code de sortie non nul. Aucun résultat partiel n'est présenté comme un inventaire complet. Les profils ne sont conservés qu'en mémoire ; stdout contient uniquement le rapport pseudonymisé. Les sauvegardes de rapport doivent rester hors du dépôt public.

Exemple de lecture de la recette locale existante, sans seed ni remise à zéro :

```sh
node scripts/audit/member-assignment-audit.mjs --environment emulator --dry-run \
  --project demo-velatra --database '(default)' --emulator-host 127.0.0.1:8080
```

L'émulateur ne reçoit aucun credential réel : le lecteur emploie uniquement son identité synthétique locale `Bearer owner`, confinée au projet demo et à loopback. Sa pagination n'est pas présentée comme un snapshot transactionnel ; effectuer la lecture pendant une recette inactive. Ses compteurs restent séparés de ceux des bases hébergées.

## Classification et interprétation

Catégories principales exclusives : OK, MISSING, ORPHAN, CROSS_CLUB, INVALID_ROLE, AMBIGUOUS, TEST_ACCOUNT. Les causes détaillées et les écarts d'index restent visibles séparément. Un index incohérent interdit de conclure à une cohérence complète même si la référence du profil est OK.

Plusieurs coachs possibles sans attribution fiable restent AMBIGUOUS. Un seul candidat ne provoque aucune attribution automatique. Les identités manquantes, malformées, dupliquées ou non canoniques restent à examiner ; les identifiants ne sont jamais convertis silencieusement pour choisir un coach.

Seule l'origine explicite `demo-*` sur émulateur loopback établit TEST_ACCOUNT dans cette version. En production, un nom « test », une adresse ressemblant à une fixture ou le nom de la base AI Studio ne prouvent rien : ces profils restent dans le groupe production / non prouvés fictifs. Aucune heuristique d'e-mail n'est utilisée.

Le rapport utilise des références SHA-256 tronquées à 16 caractères avec un espace de noms propre à la base. Il s'agit de pseudonymisation, pas d'une garantie d'anonymat absolu. Aucun identifiant brut ou contenu personnel n'est nécessaire au rapport public.

## Limites à respecter pour une éventuelle suite

1. Ne pas appeler `GET /api/coach/assigned-members` pendant un dry-run : il écrit l'index coach et les copies d'attribution. Ne pas ouvrir l'application authentifiée : ce GET part automatiquement pour un coach ; un owner déclenche aussi un ancien mécanisme de migration Stripe.
2. L'API d'affectation normalise une absence en `null`, puis compare cette valeur à la propriété brute potentiellement `undefined`. Une première attribution peut ainsi échouer. Constat statique, sans appel production ni correction dans cette passe.
3. La propagation du profil vers les 14 collections intervient après sa transaction. Des étiquettes obsolètes peuvent conserver un accès à l'ancien coach si la propagation échoue. Ce script de profils ne certifie pas toutes ces copies ; une lecture ciblée de leurs seules métadonnées serait une autre étape si les résultats le justifient.
4. Aucun test de règles supplémentaire ne déploie des règles. Les tests de classification et de transport utilisent exclusivement des fixtures et réponses HTTP fictives. La CI ne reçoit aucun accès ni jeton production.

## Résultats et validation

Dry-run du 28 septembre 2026 (heure de Paris), lecture complète de chaque collection `users` en une page :

| Environnement | Profils lus | Répartition | Membres | Comptes test membres |
| --- | ---: | --- | ---: | ---: |
| `velatra-75daa / (default)` — Standard | 2 | 1 owner, 1 superadmin | 0 | 0 |
| Base hébergée AI Studio — Enterprise Native | 1 | 1 superadmin | 0 | 0 |
| `demo-velatra / (default)` — émulateur | 18 | 10 members, 3 coachs, 4 owners, 1 superadmin | 10 | 10 |

Instants des snapshots hébergés : `2026-09-27T22:54:56.000Z` et `2026-09-27T22:54:57.000Z`. Aucun rôle inconnu rencontré. L'inventaire des bases a confirmé uniquement ces deux bases hébergées ; le nom AI Studio ne sert pas de preuve de caractère fictif.

**Aucun adhérent hébergé : toutes les catégories d'anomalies de production sont à zéro.** Il n'existe donc aucun compte membre legacy réel à réaffecter dans ces snapshots. Aucune migration de comptes n'est nécessaire ou créée.

Les 10 membres de l'émulateur sont classés TEST_ACCOUNT, séparément : **7 MISSING**, **3 références OK**, dont **1 index coach manquant**. Aucun ORPHAN, CROSS_CLUB, INVALID_ROLE ou AMBIGUOUS. Les fixtures restent inchangées ; une éventuelle harmonisation du seed serait une tâche distincte et devrait préserver les cas volontairement non affectés créés par des owners.

**Conclusion de l'inventaire des profils : B — uniquement comptes de test.** LEGACY ASSIGNMENT RISK CLOSED pour l'existence de comptes membres legacy réels dans les deux snapshots hébergés ; cela ne certifie ni tout le produit ni les fichiers stockés ni les anciens documents sans profil.

Les deux règles Firestore déployées ont été lues et comparées au dépôt : correspondance exacte après normalisation des fins de lignes. Une divergence importante a été constatée pour Storage ; son détail et la conduite à tenir sont transmis dans le rapport local, hors du dépôt public. Aucune règle n'a été modifiée. Ce constat indépendant interdit de considérer cet audit ciblé comme une validation globale de sécurité.

La lecture initiale de l'émulateur sans identité a été refusée par ses règles (403), sans rapport de succès. Le lecteur emploie désormais l'identité synthétique réservée à l'émulateur ; toutes les lectures cloud utilisent le jeton OAuth existant, en mémoire. Les refus et erreurs ne sont jamais transformés en compteurs zéro.

Les rapports JSON pseudonymisés restent hors du dépôt. Aucun credential ni identifiant individuel de production n'est publié. L'audit n'a écrit aucune donnée ni déployé de règle.

Validation locale : `npm run lint`, `npm run build`, `npm run test:emulators` et `git diff --check` réussis. **115 tests applicatifs (dont 34 nouveaux tests d'audit) + 5 contrôles d'isolation**, aucun ignoré. Le build conserve exactement les mêmes 113 fichiers et empreintes SHA-256. Les données de recette ont été exportées avant l'exécution des tests jetables puis sont restaurées séparément ; aucun test ne cible une base hébergée.

### Référence du transport

Le [REST documents.list officiel](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/list) fournit GET, projection `mask`, pagination et `readTime`. Ce transport commun aux deux bases Native est choisi pour son périmètre de lecture facilement vérifiable, sans SDK ni pipeline de mutation. L'identité synthétique d'émulateur est également utilisée par le package officiel `@firebase/rules-unit-testing` installé dans le projet.
