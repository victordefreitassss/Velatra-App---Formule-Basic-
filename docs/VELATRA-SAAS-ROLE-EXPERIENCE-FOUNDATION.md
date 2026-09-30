# Velatra — mission 12A : audit et arrêt de sécurité

Date : 1 octobre 2026 (Europe/Paris).

**Statut : STOP pendant l'audit initial, avant la phase 1. Aucune fondation fonctionnelle implémentée.**

La condition d'arrêt retenue est la n° 3 : ne pas introduire un manager partiellement sécurisé. L'audit révèle un couplage architectural entre gestion opérationnelle et opérations sensibles. Une activation sûre exige une séparation des autorisations par opération dans les APIs, Firestore et Storage, puis leur validation intégrée. Ce constat ne signifie pas que manager est techniquement impossible ; il interdit de l'activer comme une simple extension des capabilities actuelles.

## État initial et traçabilité

- Dépôt : `victordefreitassss/Velatra-App---Formule-Basic-`.
- HEAD initial et `origin/main` : `97ed9be35fc8a3174883944ff6b6d49816714119`.
- Working tree initial propre, branche initiale `work`.
- Branche de mission : `feat/saas-role-experience-foundation`.
- `git status`, `git fetch origin`, `git switch main`, `git pull --ff-only origin main`, `git rev-parse HEAD` exécutés. Les premières opérations distantes ont échoué dans le bac à sable sans réseau. Une vérification indépendante par le connecteur GitHub a confirmé main ; fetch et pull ont ensuite réussi avec l'accès réseau de la commande. Aucun écart de HEAD.
- Seul ce document est modifié. Aucun changement applicatif, de règles, de données ou de configuration.

## Audit initial

Les dix fichiers demandés ont été examinés sur leurs modèles, prédicats, branchements d'expérience et dépendances d'autorisation. Recherche transversale de `role ===`, `role !==`, owner, coach, member, superadmin, basic, classic, premium, `club.plan`, `accountType`, `canAddStaff`, `getProductCapabilities`, `canManageClub`. Les fichiers serveur dépendants et `storage.rules` ont été examinés pour vérifier l'étendue du risque manager.

| Fichier | État observé / dette |
| --- | --- |
| `types.ts:2` | Role possède seulement superadmin, owner, coach, member. AccountType possède déjà solo/studio. Club.plan reste basic/classic/premium. Aucun SaasPlan. |
| `productCapabilities.ts:20` | Listes de rôles staff/everyone/managers codées en dur ; « managers » signifie owner/superadmin, pas un rôle manager. Le catalogue mélange disponibilité produit, état d'implémentation et rôle. |
| `productCapabilities.ts:82` | Disponibilité déduite de l'accountType explicite ; legacy retourne null pour studioOnly. canAddStaff est une activation historique. canManageClub est indépendant du gating produit. |
| `components/appShellHelpers.ts:38` | Owner et coach partagent coachItems et coachHubs. Studio coach voit aussi Business/CRM/Finances. Pas d'Experience Resolver. |
| `components/Layout.tsx:81` | Perspective Superadmin séparée ; navigation issue des helpers. Libellé « Espace coach » commun owner/coach. Aucun format resolver central. |
| `components/CoachDashboard.tsx:38` | Même dashboard owner/coach, filtré par roster chargé. État onboarding commun ; raccourci paiements vers crm_finances dans les priorités. |
| `pages/AdminDashboard.tsx:170` | Basic 0 €, Classic 49 €, Premium 99 € codés en dur pour distribution, MRR et simulation. Aucun catalogue SaaS réel. |
| `pages/AdminDashboard.tsx:242` | updatePlan écrit Club.plan ; filtres, badges et boutons legacy aux lignes 474, 797, 867 ; ratio premium ligne 984. initializeOldClubs ligne 315 écrit basic/isActive : action existante, jamais exécutée pendant cette mission. |
| `pages/SettingsPage.tsx:14` | canManageClub gouverne les réglages ; teamManagement/canShowStaffCreation gouvernent l'ajout de coach. Liste staff sans manager ligne 54. Édition club, planning et Stripe restent liés à la même expérience de réglages. |
| `App.tsx:498` | Les lectures sont filtrées pour member/coach ; les autres rôles suivent des branches de lecture globales tenant. Ajouter manager sans revoir ces branches est insuffisant. |
| `App.tsx:1169` | currentPlan/isClassic/isPremium hérités de Club.plan ; ces variables ne servent plus ailleurs dans ce fichier. Le dispatch ligne 1176 regroupe owner/coach ; tout autre rôle non-superadmin tombe vers les pages Member. |
| `firestore.rules:29` | isStaff accepte owner/coach/superadmin ; isClubManager ligne 37 accepte owner/superadmin. Sécurité membre/coach affecté séparée, mais pas de manager ni de policy SaaS. |
| `server.ts:670` | Affectations, création de staff et connexion/déconnexion Stripe réutilisent canManageClub. Ajouter manager à ce prédicat ouvrirait Stripe. Suppression Auth possède encore un contrôle owner séparé ligne 981. |

Autres branchements de rôle trouvés : `MembersPage`, `CoachingPage`, `PlanningPage`, `MessagesPage`, `FinancesPage`, `DrivePage`, `PresetsPage`, `HistoryPage`, `NutritionPage`, `ProfilePage`, `AboutPage`, `AICoachPage`, `CoachOnboardingDashboard`, `MemberNutritionView`. Côté serveur : `createMember`, `convertProspect`, `bookings`, `coachingFollowup`, `completeWorkout`, `billing`, `memberCoachingContact`, ainsi que les scopes IA dans server.ts. Ces branches ont des portées différentes ; une liste staff universelle ne suffit pas.

## Risque manager et justification STOP

1. `server.ts:731` transforme canManageClub en isClubManager, utilisé pour Stripe POST/DELETE et pour la migration de secret legacy lors du GET status. Les mêmes droits servent aux affectations et au recrutement. Manager doit pouvoir faire certaines opérations d'équipe sans administrer des secrets Stripe.
2. `firestore.rules:224` autorise la suppression de profils via isClubManager. Étendre ce helper au manager ouvrirait une suppression directe alors que la suppression Auth serveur reste réservée owner. Il faut définir la politique destructive et maintenir sa cohérence entre les deux chemins.
3. `firestore.rules:232` protège accountType mais ne connaît pas saasPlanId. Introduire un champ SaaS de confiance exigerait de le rendre server-owned : aucun entitlement commercial ne doit provenir d'une écriture client owner.
4. `server/billing.ts:57` accepte owner/coach et son paramètre managersOnly signifie owner seul. `bookings`, `createMember`, `convertProspect`, `coachingFollowup` ont chacun leurs allowlists et revalidations transactionnelles. Changer seulement le modèle ne rend pas manager utilisable.
5. `storage.rules:27`, `:41`, `:94` distinguent staff, gestion membre et owner. Sans adaptation, un manager pourrait obtenir des droits fonctionnels sur le dossier sans accéder aux pièces jointes ; l'ajouter à owner ouvrirait aussi des suppressions.
6. La navigation et le dispatch App.tsx ne savent pas rendre manager. La navigation seule ne constitue jamais une autorisation serveur.

La mission est donc arrêtée avant tout élargissement. Aucune allowlist n'a été modifiée, aucun manager créé, aucun rôle substitué par owner. Il reste nécessaire de cadrer les opérations d'équipe destructives du manager et de valider une matrice par opération sur les trois couches de sécurité. Aucun test de sécurité rouge ne prouve ce constat : il découle de l'audit des chemins d'autorisation existants.

## Plan métier et SaasPlan : architecture proposée, non implémentée

`Plan` (`types.ts:416`) décrit la formule commerciale studio → adhérent : prix, cycle, crédits, sessions, engagement et références Stripe. Conserver ce nom et le modèle.

Un futur `SaasPlanId = string` et `Club.saasPlanId?: SaasPlanId` doivent désigner l'offre Velatra. Un registre central de définitions d'offres doit résoudre l'identifiant en entitlements ; les composants ne doivent pas comparer cet identifiant à studio/coach. Les identifiants, tarifs et éventuels niveaux d'offres ne sont pas établis par cet audit. Aucun prix nouveau, quota, trial, upgrade/downgrade ou moteur de billing SaaS proposé.

Chaîne cible : SaaS plan → entitlements commerciaux → permissions d'opération et de données tenant → expérience/navigation → présentation selon format. Le dernier niveau ne participe à aucune autorisation.

## AccountType et legacy

`resolveAccountType` existe déjà : solo/studio seulement si le champ est explicite ; sinon legacy. `readClubDocument` enlève un accountType inconnu à la lecture et conserve le document original. Ne rien déduire de Club.plan, canAddStaff, du nom, des notes ou de la taille du roster.

Compatibilité proposée pour SaaS : absence de saasPlanId → chemin legacy explicite conservant le comportement historique ; identifiant inconnu présent → état inconnu distinct, jamais une offre Studio implicite. La définition exacte de ce chemin doit être testée avant intégration. Aucune conversion Basic/Classic/Premium vers Coach/Studio et aucune migration de clubs.

## Rôles, entitlements et permissions

Rôles réellement disponibles à l'arrêt : superadmin, owner, coach, member. Manager reste une cible non activée.

Entitlements cibles à centraliser : clients, crm, coaching, programs, planning, billing, finances, retention, analytics, messages, teamManagement, coachAssignments, studioManagement. Le catalogue existant expose aussi exercises, nutrition, progress, documents, aiAssistance, clubManagement, bookingSettings, stripeConnection, multipleCoaches, sharedPlanning, groupClasses et des placeholders non implémentés. Ajouter un entitlement ne doit jamais prétendre implémenter une fonctionnalité absente.

Séparer l'inclusion commerciale d'une feature de l'autorisation d'une opération : lire un dossier affecté, gérer un planning global, inviter un coach, connecter Stripe et supprimer une organisation ne sont pas une permission unique. Vérifier identité Firebase de confiance, clubId, propriétaire réel lorsque requis, affectations et identité du membre. Préserver les revalidations transactionnelles déjà présentes. Scope personnel, affecté et organisationnel doit rester explicite.

## Expériences cibles et situation effective

| Expérience cible | Contrat demandé | État effectif après STOP |
| --- | --- | --- |
| SOLO_OWNER | Clients, coaching, programmes, planning, CRM, business, billing, finances, retention, analytics personnels, messages dans un espace unifié. | Owner solo actuel conservé, aucun nouveau resolver. |
| STUDIO_OWNER | Pilotage tenant complet, équipe, coaching et planning globaux, finances, retention, analytics, settings. | Owner studio actuel conservé. |
| STUDIO_MANAGER | Business, clients, CRM, équipe, planning global, retention, analytics et opérations ; aucun secret Stripe ni suppression destructive organisation. | Non activé, aucune permission accordée. |
| STUDIO_COACH | Clients affectés, coaching, programmes autorisés, planning opérationnel, messages, bilans, tâches/actions. Aucun accès global finances, Stripe, settings organisation ou équipe par défaut. | Coach actuel conservé ; finance/CRM historiques restent des dettes, pas simplement cachés. |
| MEMBER | Expérience sportive personnelle et ses propres données. | Les cinq racines Accueil/Séances/Progression/Nutrition/Plus conservées. |
| SUPERADMIN | Console Velatra séparée avec identité vérifiée. | Console existante conservée. |
| LEGACY_OWNER / LEGACY_COACH | Préserver les parcours historiques sans supposer Solo/Studio. | Comportement actuel conservé, aucune migration. |

Un futur `resolveProductExperience` doit résoudre ces cas au centre avec un état invalide explicite pour les combinaisons inconnues/incohérentes ; il ne doit pas transformer manager solo ou un rôle inconnu en owner/member implicitement. Ce contrat reste à implémenter et tester.

## Propriété des données Studio

Le tenant/clubId reste propriétaire des données. L'audit constate que l'affectation serveur met à jour assignedCoachUid et les index des coachs, puis synchronise ce champ sur les records ; aucun transfert de clubId n'est nécessaire. Ce mécanisme mérite une validation de continuité de l'historique lors de la reprise. Il ne faut ni renommer Club/clubId partout ni modifier toutes les collections pour ajouter l'expérience.

## Format resolver et navigation

Format cible proposé : phone, tablet, desktop, largeDesktop. La résolution du viewport doit vivre dans la présentation ; aucun format ne doit figurer dans l'entrée d'une permission serveur/Firestore.

- Phone coach : action suivante, client suivant, messages, séance suivante, notes, check-ins, planning et urgences.
- Desktop coach : portefeuille, construction de programmes, progression, semaine, CRM/retention ; business pour l'indépendant.
- Tablet/largeDesktop : variations de densité et de priorité, jamais de droits.
- Comparer phone/desktop à tenant/plan/role identiques : stratégies de présentation différentes autorisées, permissions strictement identiques.

Navigation cible pilotée par l'expérience, en conservant les destinations state.page : Solo unifié ; Studio owner/manager orienté Business/Management/Team/Clients/Retention/Planning avec accès au coaching global ; Studio coach opérationnel ; Member cinq racines inchangées ; Superadmin séparé. Aucun nouvel écran fictif pour une feature non implémentée. Les helpers actuels sont la base réutilisable pour recherche, menus et actions ; leur sélection owner/coach commune reste à remplacer. **Navigation réellement impactée par cette PR : aucune.** Aucun redesign, nouveau dashboard, design system ou palette.

## Vérification

Résultats définitifs et limites consignés ci-dessous avant publication de la PR. Aucun test nouveau puisqu'aucun code fonctionnel n'est ajouté. Les tests existants ne valident pas les resolvers SaaS/manager/format proposés.

| Contrôle | Résultat |
| --- | --- |
| Tests purs ciblés existants | **56/56 réussis**, 0 échec ; capabilities, appShell, Client 360, Program Builder, Exercise Library, Follow-up, Planning, CRM. Exécution avec `node --import tsx --test --test-isolation=none` pour vérifier les assertions individuelles. |
| `npm run lint` | Réussi, code 0. |
| `npm run build` | Réussi, code 0 ; avertissement Vite existant sur des chunks > 500 kB. |
| `npm run test:emulators` | **Échec : 298 tests, 280 réussis, 18 échoués**, 0 ignoré. Les 5 tests du pretest CI sont également réussis. |
| Sécurité Firestore | La suite Firestore ne présente pas d'échec dans cette exécution. Aucun manager testé. |
| Sécurité Storage | Les 18 échecs sont dans `tests/storage.rules.test.ts`, avec `storage/unauthorized` sur des actions attendues autorisées : avatars, documents, contrats, images club, vidéos et Drive. Cause non établie ; ne pas conclure à une vulnérabilité production ni corriger les règles au hasard. |
| `git diff --check` | Réussi. |
| QA navigateur | Non lancée : aucune modification navigation/layout. |

La suite s'est exécutée sur le projet **demo-velatra**, avec Auth/Firestore/Storage émulés, puis les émulateurs ont été arrêtés. Les premiers essais ont rencontré le réseau restreint et un cache npm non inscriptible ; la commande finale utilise l'accès réseau de commande et les caches `/workspace/.cache` (`npm_config_cache`, `XDG_CACHE_HOME`, `FIREBASE_EMULATORS_PATH`). Aucun changement de HOME ni de configuration de projet. Le CLI a aussi émis un avertissement final de mise à jour/config locale ; il ne remplace pas les 18 échecs de tests constatés.

Ces échecs existent avec les sources exactes du HEAD initial : la seule différence de travail est ce document. Aucune correction fonctionnelle tentée après le STOP architectural ; aucun élargissement de règle pour contourner les refus. Le gate de sécurité n'est donc pas vert. La PR doit rester en brouillon, documentaire, et ne doit pas être présentée comme la livraison des fondations 12A. Reprendre aussi le diagnostic Storage avant tout changement de permission.

## Dettes restantes et reprise avant Prompt 12B

1. Séparer les permissions d'opération owner/manager dans APIs, Firestore et Storage, notamment équipe, suppression de profil et Stripe. Fixer les frontières destructives manager avant activation.
2. Ajouter et protéger le champ saasPlanId ; implémenter un registre central et la compatibilité legacy sans migration. Ne pas réutiliser Plan métier.
3. Implémenter Experience Resolver, role resolver, entitlements, permissions tenant et navigation ; traiter les valeurs inconnues explicitement.
4. Revoir les lectures App.tsx, le dispatch et les surfaces sensibles Coach/Manager ; supprimer l'exposition globale financière du Studio coach avec une politique serveur/règles cohérente.
5. Ajouter la matrice pure demandée : Solo owner, Studio owner/manager/coach, Member, Superadmin, Legacy owner/coach, plan inconnu, entitlement absent, rôle interdit ; tester parité des droits phone/desktop et différence des priorités de présentation.
6. Tester l'intégration manager : refus Stripe/destruction, isolation inter-tenant, lectures/écritures autorisées, refus d'auto-attribution de plan/rôle, cohérence Storage et changements de rôle en transaction. Tester la continuité des données à la réaffectation coach.
7. Superadmin : cataloguer les offres SaaS réelles, remplacer ensuite les statistiques de tarifs legacy ; ne pas appeler le MRR calculé 49/99 € une vérité SaaS nouvelle. Aucun nouveau lien avec Club.plan dans cette PR.

**Prompt 12B ne peut pas supposer les fondations 12A terminées.** Reprendre les éléments ci-dessus avant les dashboards définitifs. Après fondations validées, 12B pourra exploiter expérience et priorités phone/desktop pour les dashboards, sans dupliquer les applications ni changer les autorisations selon format.

## Bilan de sécurité et release

- FIRESTORE RULES CHANGED: NO
- STORAGE RULES CHANGED: NO
- DEPLOYMENT REQUIRED: NO (PR documentaire uniquement)
- Migrations réalisées : aucune.
- Déploiements Firebase/production, Stripe live, merge main, auto-merge : aucun.
- Phases 1 à 5 d'implémentation : non exécutées. Audit Superadmin consigné ; pas de refonte.
- Critère de succès fonctionnel 12A : non atteint ; arrêt prudent documenté pour review humaine.
