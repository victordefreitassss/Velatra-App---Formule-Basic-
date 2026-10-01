# Velatra — fondation 12A et autorisation granulaire 12A.1

## État actuel — 12A.1

La préparation des autorisations backend Manager est implémentée sur `feat/saas-role-experience-foundation`, à partir du HEAD `417584d32142b5d36b37ebd6765b8ff88d97f327`. Commit d’implémentation 12A.1 : `9bab6d1`. Les nouvelles permissions sont contrôlées par opération dans les API, Firestore et Storage ; les privilèges sensibles restent séparés. PR unique : https://github.com/victordefreitassss/Velatra-App---Formule-Basic-/pull/28.

Manager reste dormant dans l'interface : `Role`/`User.role` conservent les quatre rôles historiques, aucun provisioning Manager n'est ajouté, `runtimeUsable` reste false et un profil non supporté est déconnecté avant les listeners live. Aucun plan SaaS n'est attribué. Les règles modifiées nécessitent un déploiement séparé après review. Aucun merge ni déploiement n'a été effectué.

Les sections d'audit ci-dessous sont conservées comme historique de 12A ; aucun nouvel audit général n'a été entrepris. La section 12A.1 en fin de document décrit les changements actuels.

## Livraison initiale 12A — historique

HEAD initial : `97ed9be35fc8a3174883944ff6b6d49816714119`, `main`, working tree propre, fetch puis pull fast-forward sans changement.
Branche : `feat/saas-role-experience-foundation`.
Commit de code : `0ab9f62fb64b5f798da5e560505c0f2e33ac5461`. Le commit historique `3e2422a` de la PR #28 est préservé ; deux commits de reprise ajoutent la fondation puis mettent à jour ce rapport. PR unique : https://github.com/victordefreitassss/Velatra-App---Formule-Basic-/pull/28.

**Livraison partielle, arrêt avant activation des nouvelles permissions.** Le domaine cible, les résolveurs purs, le catalogue de préparation et la navigation cible sont disponibles pour review. Ils ne constituent pas un système d'autorisation déployé. Le rôle Manager n'est ni provisionné ni ajouté à `User.role`. Les offres explicites ne sont attribuées à aucun club. La navigation actuelle conserve son comportement.

La condition STOP de sécurité s'applique à l'activation du Manager et aux restrictions réelles du Studio Coach. Une simple modification des boutons, du type `Role` ou de `isClubManager` exposerait des autorisations incohérentes entre API, Firestore, Storage et listeners. La PR reste en brouillon jusqu'à review ; elle ne prétend pas achever les phases d'activation 3/4 du prompt.

## Audit initial

| Fichier / surface | Constat et dépendances |
| --- | --- |
| `types.ts` | `Role` authentifié : superadmin, owner, coach, member. `accountType` solo/studio existe déjà. `Plan` représente la formule vendue à un adhérent. `Club.plan` reste basic/classic/premium. |
| `productCapabilities.ts` | Source centrale de readiness et compatibilité. Staff regroupe owner/coach/superadmin ; gestion du club réservée owner/superadmin vérifié. `canAddStaff` est un drapeau bêta. Finances et CRM étaient accessibles au coach dans le modèle historique. |
| `components/appShellHelpers.ts` | Owner et Coach partagent `coachHubs` et `coachItems` ; mêmes cinq racines dont Business, mêmes actions de création. La classification passe maintenant par l'Experience Resolver, avec fallback de compatibilité au chargement. |
| `components/Layout.tsx` | `effectiveRole`, perspective admin, libellé Espace coach, annonces et bouton invitation utilisent encore owner/coach directement. Navigation, recherche, menu mobile et création consomment les helpers. Aucun JSX/CSS modifié. |
| `components/CoachDashboard.tsx` | Dashboard commun aux propriétaires/coachs ; portefeuille, rétention, abonnements, tâches automatiques et actions. Les données proviennent des listeners de l'app. Pas de reconstruction du dashboard. |
| `pages/AdminDashboard.tsx` | Distribution Basic 0 €, Classic 49 €, Premium 99 €, calcul MRR, simulation, filtres et boutons d'édition de plan hardcodés. Action manuelle `initializeOldClubs` remplit basic/isActive ; non exécutée. Éditeur de rôles limité aux quatre rôles historiques. |
| `pages/SettingsPage.tsx` | Utilise `canManageClub`, `canShowStaffCreation`, capacités équipe ; contient paramètres organisation, création coach, réservations et connexion Stripe. Ce n'est pas une destination sûre pour un Manager sans découpage des actions. |
| `App.tsx` | Routing owner/coach partagé. Comparaisons Basic/Classic/Premium encore présentes dans `renderPage` (variables isClassic/isPremium sans autres usages). Listeners séparant member/coach/owner, requêtes assignées et perspectives admin ; ajouter Manager à une union ne suffit pas. |
| `firestore.rules` | `isStaff` n'inclut pas Manager ; `isClubManager` mélange ownership et opérations sensibles. Profil self ne peut pas changer son rôle. Collections financières globales utilisent encore staffInClub. Données membres protégées par tenant/assignation. |
| `server.ts` | Création staff écrit uniquement coach ; changement d'assignation, Stripe et opérations propriétaires utilisent canManageClub/isClubManager. AI et messages comparent les rôles directement. |
| `server/billing.ts` | Politique owner/coach avec managersOnly actuellement owner-only. Ne pas réutiliser ce nom comme autorisation du futur rôle Manager. |
| `server/bookings.ts`, `server/createMember.ts`, `server/convertProspect.ts`, suivi coaching | Vérifications explicites owner/coach, identité tenant et assignations, transactions. Manager nécessite une politique par opération et les tests d'intégration correspondants. |
| `storage.rules` | Staff owner/coach et accès documents/avatar basés sur propriétaire ou assignation ; Manager absent. Indispensable à son activation réelle. |

Recherche effectuée dans le dépôt sur comparaisons de rôles, owner/coach/member/superadmin, basic/classic/premium, club.plan, accountType, canAddStaff, getProductCapabilities et canManageClub. Dettes supplémentaires : HistoryPage, MessagesPage, MembersPage, CoachingPage, AICoachPage et presets contiennent encore des branches de rôles directes. Elles n'ont pas été remplacées sans revue de leurs droits par document.

## Domaine : Plan métier, SaaS et organisation

`Plan` n'est pas renommé : prix, séances, abonnement de l'adhérent au Studio.
`SaasPlanId = string` et `Club.saasPlanId?` représentent une offre Velatra distincte. `SaasPlan` est un modèle léger de catalogue sans prix, quota, trial ni moteur de billing SaaS.

`resolveSaasPlan` distingue :

- champ absent : legacy, inclusion commerciale inconnue ;
- identifiant connu : catalogue de préparation Coach/Studio ;
- identifiant inconnu ou malformé : aucune inclusion accordée, pas de fallback silencieux.

Les identifiants `coach` et `studio` sont des clés du catalogue de préparation, pas des offres payantes publiées. Ce catalogue devra être validé avant attribution serveur. Il est indépendant du type d'organisation. Aucun déducteur accountType basé sur plan, canAddStaff, effectifs ou texte descriptif.

`resolveAccountType` reste solo/studio/legacy. `readClubDocument` garde les données historiques sans migration. Les données continuent d'appartenir au tenant `clubId` ; aucun déplacement de programme, paiement, CRM ou historique lors d'une réassignation.

## Rôles et permissions

`Role` et `User.role` authentifiés restent superadmin/owner/coach/member. Le nouveau `ProductRole = Role | 'manager'` supporte le rôle cible dans les résolveurs et les tests sans le rendre utilisable. `resolveProductRole` rejette les rôles inconnus.

`resolveRolePermission` expose un **scope cible**, pas un contrôle d'action : none, self, assigned, tenant, platform. Il faut encore contrôler lecture/écriture/suppression et identité de chaque document côté serveur/règles. Un scope tenant n'autorise pas automatiquement une suppression.

| Expérience | Permissions cibles |
| --- | --- |
| Solo owner | Clients, coaching, programmes, planning, CRM, billing, finances, rétention, analytics, messages et paramètres ; pas d'équipe Studio. |
| Studio owner | Pilotage et données du tenant, coaching global, équipe et configuration owner. |
| Studio manager | Opérations, clients, CRM, équipe, planning, rétention, analytics. Aucun Stripe, finances globales ni paramètres owner. Les affectations sont autorisées par la politique 12A.1. Pas de droit de suppression destructive d'organisation ; interface encore inactive. |
| Studio coach | Scope assigned : clients affectés, coaching, programmes, progression, nutrition, planning opérationnel, messages, documents, tâches. Pas de finances globales, CRM global, analytics financiers, équipe ni paramètres organisation. |
| Member | Scope self et expérience existante. |
| Superadmin | Espace séparé ; résolveur exige trustedSuperAdmin. Le booléen doit provenir de l'identité vérifiée, jamais d'un payload client. |
| Legacy owner / coach | Compatibilité actuelle sans migration ni nouvelles restrictions actives. |

Les définitions de features restent centralisées dans `CAPABILITY_DEFINITIONS`. Ajouts de préparation : retention (surfaces existantes), tasks, studioManagement. Aucune implémentation de Retain, Pulse, Sales V2 ou Team Management V2.

`resolveEntitlement` sépare inclusion commerciale et permission du rôle. Studio-only exige accountType studio ; une offre Studio ne transforme pas automatiquement un Solo en Studio. Une feature non implémentée reste indisponible.

`resolveExperienceCapabilities` expose :

- entitlement : true/false/null (legacy inconnu) ;
- scope : permission cible ;
- targetUsable : disponibilité du modèle de préparation ;
- runtimeUsable : uniquement compatibilité legacy supportée par cette fondation, toujours false pour Manager et offres explicites en préparation.

**Ne pas remplacer les guards serveur ou les règles par targetUsable.** Les consommateurs historiques de `getProductCapabilities` continuent leur politique existante, y compris si une donnée externe porte saasPlanId. Ce champ n'a encore aucune autorité commerciale en production. 12A.1 protège désormais accountType et saasPlanId contre les mutations client ordinaires, y compris Owner. Un provisioning serveur vérifié et un catalogue commercial validé restent nécessaires avant attribution. Aucun droit commercial réel ne dépend de saasPlanId dans cette PR.

## Experience Resolver et navigation

`resolveProductExperience` distingue SUPERADMIN, SOLO_OWNER, STUDIO_OWNER, STUDIO_MANAGER, STUDIO_COACH, MEMBER, LEGACY_OWNER, LEGACY_COACH et UNSUPPORTED. Il exige un tenant correspondant pour les rôles ordinaires. Manager hors Studio et Coach salarié en Solo sont des combinaisons cibles non supportées, sans réinterprétation automatique.

La navigation actuelle utilise le résolveur pour classifier les espaces staff, puis les helpers/capacités historiques. Ses racines, labels et routes existantes sont conservés.

`resolveExperienceNavigation` fournit une navigation **cible de préparation** à partir des mêmes destinations :

- Solo : Accueil, Clients, Coaching, Planning, Business ; CRM, messages et finances accessibles via destinations existantes ; billing reste dans les surfaces clients/paramètres existantes.
- Studio owner/manager : Business prioritaire après Accueil, puis Clients, Planning et Coaching. Pas de nouvelle page Team/Management fictive ; les futures surfaces équipe doivent être sécurisées avant branchement.
- Studio coach : espaces opérationnels, messages via Clients, tâches via Planning ; sans CRM/finances globaux ni Settings.
- Member : les cinq racines Accueil, Séances, Progression, Nutrition, Plus restent identiques.
- Superadmin : console Admin séparée.

Le résolveur cible n'est pas branché au routing live : l'activer sans modifier les API/règles ne satisferait pas la sécurité du prompt.

## Format et présentation

`resolveProductFormat` : phone < 768, tablet < 1024, desktop < 1600, largeDesktop au-delà ; valeur invalide → desktop. Ces bornes préparent une stratégie, sans modifier les breakpoints CSS existants.

`resolvePresentationStrategy` privilégie sur téléphone prochaine action/client/séance, messages, notes, check-ins, planning et tâches urgentes. Desktop : portefeuille, Program Builder, analyse progression, semaine, CRM et rétention ; Business pour Solo/owner/manager. Ce sont des priorités de présentation, pas des droits. Les permissions et entitlements ne prennent aucun format en paramètre.

Pas de nouveau dashboard ni design system. Feature parity n'implique pas UI parity. Pas de QA décorative sur quinze tailles puisque le layout rendu n'a pas changé.

## Point d'arrêt et suite nécessaire

STOP rencontré : activation de Manager et de la politique restrictive Studio Coach avant une refonte cohérente, testable, des permissions d'action dans les API, règles Firestore/Storage, listeners et destinations sensibles. Ne pas ouvrir Manager dans un sélecteur de rôle ou changer isClubManager en owner-or-manager.

Plan identifié lors de 12A (les permissions backend/règles et la protection de saasPlanId sont maintenant traitées par 12A.1) :

1. Valider une matrice d'actions Manager (lecture, création, édition, suppression, équipe et réassignations) et séparer opérations owner-only.
2. Sécuriser le provisioning des rôles et saasPlanId côté serveur ; protéger le champ commercial dans les règles.
3. Appliquer la même matrice aux API, règles Firestore/Storage et requêtes live, avec tests négatifs inter-tenant, affectations et secrets Stripe.
4. Brancher la navigation cible seulement après réussite des tests de sécurité. Conserver un mode de compatibilité explicite pour les clubs legacy.
5. Valider le catalogue commercial sans déduire l'organisation du plan et sans migration automatique.

Prompt 12B pourra consommer les résolveurs pour les vrais dashboards téléphone/desktop, après résolution du point de sécurité. Ne pas transformer les priorités CRM/Business en routes autorisées pour un salarié. La modernisation Superadmin, vrais produits SaaS, quotas, trial, upgrade/downgrade et facturation SaaS restent des missions distinctes.

## Audit antérieur conservé dans l'historique

La PR #28 existait déjà avec le commit documentaire `3e2422a`, issu du même HEAD main. Cette reprise conserve ce commit et actualise son rapport dans le même fichier. Son diagnostic owner/manager/Stripe/Firestore/Storage reste applicable.

L'exécution antérieure, dans un autre environnement, avait rapporté 298 tests, 280 réussis et 18 refus Storage inattendus, avec cause non établie. La présente exécution locale utilise les mêmes sources de règles et réussit 313 tests (dont les 15 nouveaux) et les 5 contrôles CI. Les refus antérieurs ne sont pas reproduits ici ; aucune correction des règles ni conclusion sur leur cause n'est revendiquée. Reproduire l'ancien environnement si ce problème réapparaît.

## Validation initiale 12A — historique

Nouveaux tests purs : 15 tests dans `tests/productExperience.test.ts` (expériences, offres connues/inconnues, legacy, rôle, tenant, superadmin vérifié, entitlements, permissions, Manager inactif, format invariant, navigation cible et compatibilité live).
Tests ciblés de phase : 36/36 réussis. Lint : réussi. Build : réussi, avertissement Vite existant sur la taille des chunks. Suite complète `npm run test:emulators` : 313/313 tests applicatifs et sécurité + 5/5 contrôles CI, zéro échec et zéro skip, sortie 0. Java 21 temporaire officiel utilisé dans le dossier de travail du chat, sans installation système. `git diff --check` : réussi. Aucun test Manager live n’est revendiqué : ce rôle reste non activé.

Fichiers modifiés : types.ts, productCapabilities.ts, productExperience.ts, components/appShellHelpers.ts, tests/productExperience.test.ts, ce document.

FIRESTORE RULES CHANGED: NO
STORAGE RULES CHANGED: NO
DEPLOYMENT REQUIRED: NO (pour cette fondation de préparation ; une activation future exigera des règles adaptées et une livraison distincte).
Migrations réalisées : aucune. Déploiement Firebase : aucun. Merge/auto-merge : aucun.

La PR ne livre pas l'activation du rôle Manager, les restrictions serveur Studio Coach ou la nouvelle navigation live. Ces limites sont volontaires et nécessaires au respect de la condition STOP.


## Livraison 12A.1 — politique par opération

`server/authorization.ts` contient `canManageTeam`, `canAssignMembers`, `canManageClubSettings`, `canManageBilling`, `canManageStripe`, `canPerformDestructiveClubActions`, ainsi que les helpers ciblés `canOperateStudio`, `canDeleteUser`, `canChangeUserRole`, `canUseBilling` et `canReadStripeStatus`. L'acteur provient du profil serveur, du club autoritaire et de l'identité Superadmin vérifiée, jamais des champs d'un payload. `canManageClub` reste un alias de compatibilité des paramètres Owner, sans devenir Owner-or-Manager. `canShowStaffCreation` utilise maintenant la permission équipe séparée.

| Rôle | Politique appliquée |
| --- | --- |
| Owner | Équipe et affectations, paramètres club, billing sensible et Stripe conservés. Suppression des utilisateurs ordinaires de son club selon la politique historique ; suppression d'un Owner ou du club réservée au Superadmin vérifié. |
| Manager Studio | Création de Coach uniquement, édition des champs opérationnels de Coach/Member, affectation et désaffectation, création Member, CRM/conversion, planning/réservation/essai avec un vrai Coach, suivi/rétention, tâches et documents opérationnels du tenant. Aucun accès Stripe, billing sensible, paramètres Owner, modification d'Owner, attribution de rôle ni suppression de compte/organisation/historique de coaching. |
| Coach | Accès opérationnel et vérifications d'affectation conservés ; aucun nouveau pouvoir global. Billing V2 historique reste accessible sur ses membres affectés, avec les actions sensibles Owner-only. |
| Member | Accès personnel historique ; aucun droit d'administration. |
| Superadmin | Exceptions historiques vérifiées conservées. Aucun nouvel accès billing sensible/CRM/planning n'est accordé. |

Manager exige un club autoritaire `accountType == studio`. Un profil Solo portant un faux `accountType` ne reçoit aucun droit. Les contrôles de tenant et de Coach cible restent obligatoires. Les exceptions Superadmin historiques ne sont pas étendues aux autres rôles.

### Endpoints et surfaces migrés

- `POST /api/create-staff` : helper équipe, rôle créé toujours Coach, revalidation transactionnelle et compensation Auth si le droit est révoqué avant la création du profil.
- `POST /api/assign-member-coach` : helper affectations, identité et index conservés, revalidation du profil/club dans la transaction, aucun déplacement de données historiques.
- `POST /api/create-member`, `POST /api/prospects/:id/convert` : opérations Studio autorisées et affectation indépendante des droits Stripe.
- `POST /api/bookings/{reserve,cancel,reschedule,trial}` : opérations Manager du tenant, crédits/locks et accès Coach/Member conservés ; un essai Manager appartient à un Coach réel.
- Routes de suivi coaching : accès membre, templates et priorités du tenant via les helpers opérationnels, assignations Coach conservées.
- Routes Billing V2 : `canUseBilling` pour le périmètre historique Owner/Coach, `canManageBilling` pour les opérations sensibles Owner-only ; Manager refusé.
- `GET /api/stripe/status`, `POST /api/stripe/connect`, `DELETE /api/stripe/connect` : Manager refusé avant lecture/migration des secrets ou appel Stripe ; statut historique Coach/Member conservé sans secret.
- `POST /api/delete-user` : autorisation destructive et cible séparées ; Manager refusé, Owner protégé.
- Paramètres club, suppression du club et mutations de rôles : règles directes Firestore, aucun nouvel endpoint ou droit d'escalade ajouté.

Les règles Firestore distinguent staff opérationnel et accès financier historique. Les mutations Manager des profils utilisent une liste de champs autorisés ; rôle, club, identité, affectation brute, crédits et paiement ne peuvent pas être falsifiés. `accountType` et `saasPlanId` deviennent des champs protégés. Les secrets restent dans la collection interdite aux clients. Les règles Storage permettent les documents opérationnels Coach/Member du tenant et ses propres uploads Drive/vidéo, mais bloquent les contrats, l'écriture des documents/avatar Owner et les suppressions de documents/avatar membres par Manager.

Les suppressions courantes de tâches, exercices, prospects non convertis et de ses propres uploads restent possibles. Elles ne donnent aucun pouvoir de suppression de comptes, organisation ou historique longitudinal de coaching.

### Validation 12A.1

17 nouveaux tests : 6 tests purs de matrice, 4 tests Firestore/Storage et 7 tests HTTP avec vrais tokens Auth émulateur. Les tests ciblés de régression des endpoints/règles passent : 32/32 ; les tests purs et de compatibilité des résolveurs/navigation passent : 32/32. La première suite finale a identifié un dépassement de la limite de 1 000 expressions Firestore sur une édition Coach de feedback (329/330). Le helper évalue désormais le droit du Coach affecté avant la branche de gestion globale, sans modifier la politique ; les 29 tests de règles historiques et Manager passent après correction. Validation finale corrigée : `npm run test:emulators` réussit 330/330 tests applicatifs/sécurité et 5/5 contrôles CI, zéro échec et zéro skip. `npm run lint` et `npm run build` réussissent sur le code final (seule la règle Firestore a ensuite été optimisée) ; avertissement Vite existant sur la taille des chunks. `git diff --check` réussit. Une seule campagne finale a été lancée, puis la suite émulateurs a été relancée uniquement pour vérifier la correction de la régression détectée. Java 21 temporaire officiel, sans installation système.

Contrôles négatifs : mutation de son propre rôle ou d'un autre rôle, modification/suppression Owner, faux claims côté payload, Stripe status/connect/disconnect et secrets, suppression club, opérations inter-tenant, Manager Solo, mutations d'identité/affectation/crédits, révocation de rôle pendant une création staff. Contrôles positifs : Owner, Manager Studio opérationnel, création Coach forcée, réassignation sans déplacement historique et parcours Coach/Member existants.

Évaluation ciblée des changements de règles (score limité à ce périmètre ; aucun score global du dépôt) :

```json
{"score":100,"summary":"Contrôles ciblés 12A.1 : séparation des privilèges, refus des mutations protégées et isolation tenant couverts par tests émulateurs ; aucun défaut bloquant identifié dans ce périmètre.","findings":[]}
```

FIRESTORE RULES CHANGED: YES
STORAGE RULES CHANGED: YES
DEPLOYMENT REQUIRED: YES — déploiement séparé après review, non effectué dans cette mission.
Migrations : aucune. Secrets/connexion Stripe de production : non modifiés. Merge : aucun.

### Reprise 12A

Le blocage backend de granularité des droits est traité. Après review et livraison coordonnée du serveur/des règles, la politique permet l'introduction technique d'un Manager Studio sans pouvoirs sensibles Owner. Restent nécessaires : provisioning Manager sécurisé, extension cohérente du rôle live, listeners/routes/navigation et activation UI contrôlée, restrictions cibles Studio Coach avec maintien explicite de la compatibilité legacy, validation/provisioning du catalogue SaaS. Aucun de ces éléments n'est activé par 12A.1.
