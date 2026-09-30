# Velatra — SaaS / rôles / expériences : fondation 12A

## État et limite de livraison

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
| Studio manager | Opérations, clients, CRM, équipe, planning, rétention, analytics. Aucun Stripe, finances globales, paramètres owner ou mutation d'assignation par défaut. Pas de droit de suppression destructive d'organisation. Politique d'action à finaliser avant activation. |
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

**Ne pas remplacer les guards serveur ou les règles par targetUsable.** Les consommateurs historiques de `getProductCapabilities` continuent leur politique existante, y compris si une donnée externe porte saasPlanId. Ce champ n'a encore aucune autorité commerciale en production. Avant qu'il devienne autoritaire, protéger son écriture dans les règles et créer une voie de provisioning serveur vérifiée ; aujourd'hui les règles protègent accountType mais pas saasPlanId. Aucun nouveau droit réel n'en dépend dans cette PR.

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

Pour reprendre :

1. Valider une matrice d'actions Manager (lecture, création, édition, suppression, équipe et réassignations) et séparer opérations owner-only.
2. Sécuriser le provisioning des rôles et saasPlanId côté serveur ; protéger le champ commercial dans les règles.
3. Appliquer la même matrice aux API, règles Firestore/Storage et requêtes live, avec tests négatifs inter-tenant, affectations et secrets Stripe.
4. Brancher la navigation cible seulement après réussite des tests de sécurité. Conserver un mode de compatibilité explicite pour les clubs legacy.
5. Valider le catalogue commercial sans déduire l'organisation du plan et sans migration automatique.

Prompt 12B pourra consommer les résolveurs pour les vrais dashboards téléphone/desktop, après résolution du point de sécurité. Ne pas transformer les priorités CRM/Business en routes autorisées pour un salarié. La modernisation Superadmin, vrais produits SaaS, quotas, trial, upgrade/downgrade et facturation SaaS restent des missions distinctes.

## Audit antérieur conservé dans l'historique

La PR #28 existait déjà avec le commit documentaire `3e2422a`, issu du même HEAD main. Cette reprise conserve ce commit et actualise son rapport dans le même fichier. Son diagnostic owner/manager/Stripe/Firestore/Storage reste applicable.

L'exécution antérieure, dans un autre environnement, avait rapporté 298 tests, 280 réussis et 18 refus Storage inattendus, avec cause non établie. La présente exécution locale utilise les mêmes sources de règles et réussit 313 tests (dont les 15 nouveaux) et les 5 contrôles CI. Les refus antérieurs ne sont pas reproduits ici ; aucune correction des règles ni conclusion sur leur cause n'est revendiquée. Reproduire l'ancien environnement si ce problème réapparaît.

## Validation et rapport

Nouveaux tests purs : 15 tests dans `tests/productExperience.test.ts` (expériences, offres connues/inconnues, legacy, rôle, tenant, superadmin vérifié, entitlements, permissions, Manager inactif, format invariant, navigation cible et compatibilité live).
Tests ciblés de phase : 36/36 réussis. Lint : réussi. Build : réussi, avertissement Vite existant sur la taille des chunks. Suite complète `npm run test:emulators` : 313/313 tests applicatifs et sécurité + 5/5 contrôles CI, zéro échec et zéro skip, sortie 0. Java 21 temporaire officiel utilisé dans le dossier de travail du chat, sans installation système. `git diff --check` : réussi. Aucun test Manager live n’est revendiqué : ce rôle reste non activé.

Fichiers modifiés : types.ts, productCapabilities.ts, productExperience.ts, components/appShellHelpers.ts, tests/productExperience.test.ts, ce document.

FIRESTORE RULES CHANGED: NO
STORAGE RULES CHANGED: NO
DEPLOYMENT REQUIRED: NO (pour cette fondation de préparation ; une activation future exigera des règles adaptées et une livraison distincte).
Migrations réalisées : aucune. Déploiement Firebase : aucun. Merge/auto-merge : aucun.

La PR ne livre pas l'activation du rôle Manager, les restrictions serveur Studio Coach ou la nouvelle navigation live. Ces limites sont volontaires et nécessaires au respect de la condition STOP.
