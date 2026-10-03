# Purge Super Admin fiable — P0 #3

## Cause et périmètre

Avant ce correctif, `AdminDashboard.confirmDelete` supprimait depuis le navigateur les documents racines avec `clubId` dans 26 collections : users, programs, presets, archivedPrograms, performances, supplementProducts, supplementOrders, logs, messages, feed, bodyData, prospects, newsletters, tasks, plans, nutritionPlans, nutritionLogs, subscriptions, payments, exercises, crmClients, crmFormulas, manualStats, pendingProspects, expenses et invoices. Les erreurs de chaque collection étaient seulement affichées dans la console. Le code poursuivait jusqu'à supprimer `clubs/{id}`, retirer sa carte et annoncer une réussite. Il ne supprimait ni Auth, ni Storage, ni les sous-collections ; il ignorait les collections serveur plus récentes.

Le correctif concerne uniquement cette purge et les protections nécessaires contre sa poursuite concurrente, sa réactivation et sa falsification. Aucune purge production, modification IAM, déploiement ni merge n'est réalisé par cette PR.

## Autorité et confirmation

La commande passe par POST `/api/admin/clubs/:clubId/purge`, derrière la vérification Firebase du token, le profil serveur, l'email plateforme existant vérifié et le rôle Super Admin vivant. GET sur le même chemin consulte l'état. La requête accepte uniquement `{ "confirmClubId": "ID exact" }` ; le navigateur exige aussi la saisie de cet ID et affiche le nom et l'ID.

Le client ne peut plus supprimer directement le document club. Les Rules rendent les journaux immuables côté client et réservent les événements `CLUB_PURGE_*` au serveur. Les Rules et les contrôles API bloquent l'accès métier d'un tenant dont `purgeJobId` est présent. La réactivation SaaS est refusée pendant la purge. L'allocation d'un club ne réutilise pas un ID journalisé. Les webhooks de facturation refusent de réécrire des données pour cet ID ; cela ne résilie aucun abonnement Stripe et n'appelle aucune API Stripe.

## Ordre effectif

1. Créer le journal durable et suspendre le club principal atomiquement.
2. Vérifier l'identité des clubs et les suspendre dans les deux bases configurées.
3. Inventorier et enregistrer les ressources exactes et leur version.
4. Supprimer les documents métier, avec leurs descendants avant leurs parents.
5. Supprimer les générations Storage du tenant et les objets personnels exclusivement attribués.
6. Supprimer les profils exclusifs ; conserver les profils partagés et retirer seulement les liens exacts au tenant.
7. Supprimer les comptes Auth exclusifs ; conserver les comptes partagés/protégés et retirer seulement les affiliations ciblées de leurs claims.
8. Refaire un inventaire indépendant. Ajouter les ressources tardives au journal et revenir à leur suppression.
9. Vérifier encore après le checkpoint final. Supprimer les clubs secondaires, puis supprimer le club principal dans la transaction qui marque `completed` et crée l'audit serveur de réussite.

## Inventaire et isolation

Les deux bases `(default)` et `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` sont inspectées. Les lectures d'affiliation sont projetées : elles n'inventorient pas les contenus de messages, les mesures santé ou les détails Stripe. Le parcours des sous-collections inclut les parents absents. Les journaux plateforme, audits administratifs et annonces système sont conservés.

Une suppression vise toujours un chemin exact dont l'appartenance a été prouvée, jamais le résultat d'une suppression globale non filtrée. Les preuves incluent `clubId`/`organizationId`/`tenantId`, leurs listes et memberships, les descendants d'un parent prouvé, les espaces connus et les références UID/numériques exclusivement attribuables. Un identifiant numérique historique de tenant est normalisé exactement en chaîne. Une affiliation malformée, une collision numérique ou une référence contradictoire provoque une revue manuelle, sans deviner.

Les clés particulières traitées sont `stripeSecrets/{clubId}`, les espaces notifications/devices/preferences hashés avec le club et l'UID, leurs `pushTokenOwners`, les verrous de planning avec club/rôle/UID/date, et les descendants personnels des UID exclusifs. Les références des comptes voisins dans les deux bases et dans les claims Auth protègent les comptes partagés. Un profil partagé est conservé sans inventer de nouveau rôle ou tenant principal. Les comptes plateforme/administratifs sont protégés.

Storage : préfixes exacts `clubs/{clubId}/`, `drive/{clubId}/`, `driveUploads/{clubId}/`, `videos/{clubId}/`, puis `avatars/{uid}/`, `users/{uid}/`, `contracts/{uid}/`, `progressPhotos/{uid}/` seulement pour un UID exclusif. Toutes les générations retournées sont prises en compte. Une métadonnée de tenant incompatible, un propriétaire indéterminé ou un préfixe inconnu portant le tenant stoppe la purge. Chaque suppression Storage impose génération et métagénération. Aucun objet voisin n'est sélectionné par simple recherche textuelle.

## Journal, états et reprise

`organizationPurgeJobs/{clubId}` conserve l'initiateur, le dernier acteur, les dates, `pending/running/failed/completed`, la phase, le curseur, les tentatives, le lease, les identités de création des clubs et des comptes Auth, les identifiants nécessaires à la reprise et l'erreur. `items` contient les chemins, versions et résultats ; `events` conserve demandes, reprises, inventaires, erreurs et réussite.

Chaque appel exécute une phase ou une tranche de suppression, sans tâche détachée en arrière-plan. Le lease dure 120 secondes ; les suppressions sont bornées à 10 ressources/8 secondes par appel. Les comptes absents et ressources déjà supprimées sont acceptés lors d'une reprise. Une écriture de reçu perdue ne devient pas une réussite fictive : la reprise relit la ressource.

Une erreur Firestore, Storage, Auth ou de vérification conserve le club principal suspendu, inscrit l'erreur/phase/chemin, renvoie `failed` et HTTP 409. Si le journal lui-même est indisponible, l'API renvoie une erreur HTTP, jamais un succès inventé. La reprise utilise la même commande et le même ID après résolution de la cause. Un lease abandonné doit expirer avant reprise. Une ressource modifiée ou une identité recréée impose une revue opérateur ; une reprise ne redéfinit pas silencieusement l'autorité de suppression.

L'UI garde la confirmation ouverte après échec, présente la phase, les compteurs et l'erreur, puis propose de reprendre. Elle retire la carte et affiche la réussite uniquement après un état backend `completed` cohérent : phase completed, zéro restant et compteur traité égal au total. Une erreur réseau ou une réponse incohérente ne déclenche pas de réussite.

## Validation et limites

Les tests couvrent les erreurs intermédiaires Firestore/Storage/Auth, les pertes de reçus, l'échec de suppression du club final, la reprise, les ressources déjà absentes/tardives, les descendants sans parent, les comptes partagés, l'isolation du voisin, les collisions historiques, les identités recréées, les conflits de base secondaire, les droits HTTP/Rules et les quatre résultats UI (succès, échec, réseau, faux succès). Ils utilisent exclusivement les émulateurs et fixtures navigateur synthétiques.

L'inventaire est borné à 10 000 documents, 1 000 collections, profondeur 16, 10 000 comptes Auth et 10 000 objets Storage, 1 000 UID candidats et 5 000 ressources manifestées. Le parcours Firestore s'arrête entre requêtes après 25 secondes ; une requête fournisseur peut dépasser cette durée. Un environnement plus volumineux, un timeout serveur, une politique de rétention Storage ou une ambiguïté conserve la purge inachevée : revue/traitement opérateur nécessaire, aucune promesse de réussite silencieuse.

Firestore multi-base, Auth et Storage n'offrent pas de transaction globale. La reprise termine les étapes déjà engagées ; elle ne restaure pas les données détruites. Les writers applicatifs sont bloqués par les protections de purge, mais les scripts/outils Admin SDK contournent les Rules et doivent être arrêtés ou coordonnés pendant une purge. Une écriture Admin SDK concurrente après la dernière lecture ne peut pas être exclue atomiquement. Les données externes (Stripe, emails, sauvegardes et éventuelle rétention/soft-delete provider) ne sont pas supprimées ; cette opération vise les ressources actives Firebase Velatra et conserve volontairement la trace administrative.

## Mise en service ultérieure

Déployer le backend et le frontend, puis les Firestore Rules sur les deux bases et Storage Rules avant d'autoriser une purge. Fermer/recharger toutes les anciennes sessions de console Super Admin avant cette activation : une ancienne version chargée contient encore la boucle de suppression directe des enfants. Pendant la transition, ne lancer aucune purge. Vérifier en environnement isolé les droits de lecture/énumération/suppression des deux bases, d'Auth et du bucket pour l'identité serveur déployée. Une permission manquante produira un échec conservateur. Ce document ne commande aucun déploiement ni changement IAM.
