# Phase 3 — Client / Member 360

Base : `93893e5c2830afa69625a2cc634c211b6d387e72` (PR #51 mergée).
Branche : `feat/member360-workspace`. Aucune phase 4–7, aucun déploiement Firebase ni migration.

## Architecture avant / après

Avant : `MembersPage.tsx` (~4 941 lignes) réunissait la liste, un grand modal, dix sections principales, toutes les interfaces métier et leurs actions.

Après : le même dossier, les mêmes identifiants et les mêmes opérations sont conservés. À partir de 1024 px, le dossier s’insère dans le shell existant et occupe la largeur de la page. En dessous, le modal et sa navigation originale restent disponibles. L’historique utilise toujours `client360MemberId`, avec remplacement du contexte lors du changement de rubrique pour conserver un seul retour vers l’origine. Le premier chargement du shell restaure désormais une entrée Client 360 après refresh.

Composants extraits / créés dans `components/member360` :

- `Member360Workspace` : montage responsive et navigation consolidée.
- `Member360Header` : identité, contacts, statut réel, coach, inscription, abonnement autorisé, actions et quatre faits.
- `MemberOverview` : prochaines actions existantes, historique dérivé, note, mesure, résumés Retain/onboarding.
- `MemberCoaching`, `MemberProgramArchive`, `MemberNutrition` : programme, archives déjà chargées, séances et nutrition.
- `MemberProgress` : dernières valeurs, graphiques, performances, scans, photos et historique.
- `MemberFollowup` : notes et suivi existant.
- `MemberPlanning` : réservations du membre, futurs rendez-vous chronologiques, dix séances passées à la fois.
- `MemberMessages` : conversation existante embarquée.
- `MemberDocuments` : documents administratifs existants et fichiers Drive partagés.
- `MemberProfile`, `MemberBilling` : gestion existante, sans nouvelle autorité financière.
- `member360Model` et `member360.css` : modèle de lecture, timeline, navigation et styles desktop.

Les callbacks métier restent dans MembersPage pour limiter le refactor. Les composants réutilisent `components/internal` (ViewTabs, StatusBadge, EmptyState) et les primitives UI existantes.

## Regroupement et conservation

| Espace | Contenu et opérations conservés |
|---|---|
| Vue d’ensemble | Données réelles du membre, programme, réservation, notes, mesures, coaching suivi, Retain et onboarding |
| Coaching | Programme / Séances / Nutrition ; moteur Workout, modèles, édition, outils IA existants, consultation des archives |
| Progression | Performances, courbes, scans, photos partagées, historique physique |
| Suivi | Notes / Onboarding / Rétention ; `coachingNotesHistory`, `CoachFollowup`, `OnboardingDetail`, `RetentionDetail` |
| Planning | Vue filtrée du membre, filtres existants, ouverture du planning transactionnel, annulation serveur existante |
| Messages | `MessagesPage` avec membre préselectionné |
| Documents | Documents administratifs et Drive ; `finalizeDriveFile` / `openDriveFile`, upload et suppression existants |
| Gestion | Profil et abonnement/facturation selon capacités ; `billingRequest`, reçus, factures, crédits et affectation serveur existants |

La liste conserve création, import, statut, programme, coach, dernière activité et ouverture du dossier. Aucun espace Ventes ni nouveau moteur de tâches n’est ajouté.

## Données et exactitude

`getClient360Facts` filtre désormais club **et** membre. Le modèle de timeline compose les dates d’inscription, notes, séances, mesures, programmes, réservations, abonnements et paiements. Il trie les dates valides et affiche huit entrées à la fois, jusqu’aux 200 plus récentes. Les résumés Retain et onboarding réutilisent leurs lectures existantes ; leurs événements détaillés restent dans leurs vues propres.

Les notes nouvelles ajoutent `authorUid` / `authorName` dans le tableau existant. Les notes anciennes affichent « Auteur non renseigné ». Il s’agit d’une attribution dans le stockage existant, pas d’un journal d’audit serveur immuable. La limite existante de 200 notes est signalée avant écriture ; aucune note n’est supprimée automatiquement.

Les informations absentes restent absentes : pas de risque calculé localement, pas d’auteur rétroactivement supposé, pas d’abonnement ou de date inventée. La progression du programme reste fondée sur son index de séances réel et sa durée connue. Le faux interrupteur de surcharge « +2,5 kg automatique » sans opération métier a été retiré. Le nombre total de réservations n’est plus présenté comme la consommation de crédits d’un forfait ; le solde canonique est utilisé.

## Permissions et isolation

- Résolution du membre actuel dans le roster, avec club, identité Firebase et assignation Coach.
- Refus d’un membre absent, étranger ou non affecté ; fermeture du dossier après retrait d’affectation.
- Jointures locales des données du dossier explicitement limitées au club et au membre.
- Capacités existantes conservées : Manager sans facturation ; Owner et Coach conservent uniquement les opérations déjà permises par leurs capacités et le serveur. Aucun nouveau pouvoir accordé au Coach.
- Deep links inconnus ramenés à une section autorisée. Deep links d’un membre non autorisé n’ouvrent aucun dossier.
- Les champs rôle, club et SaaS ne sont pas ajoutés au formulaire.
- Aucune modification de Rules, de backend, de Stripe, de données production ou d’IAM.
- Aucun fallback Drive vers une URL Firebase publique ; les documents administratifs historiques gardent leur mécanisme existant distinct de Drive.

## Palette et responsive

Accents desktop indigo/bleu/violet, cartes claires, typographie plus lisible, états focus et navigation partagée. Les couleurs primaires vertes du dossier, des formulaires et de la nutrition intégrée sont remplacées à partir de 1024 px. Les états sémantiques positifs conservent leur distinction. Le shell et ses données restent inchangés. Mobile/tablette gardent le modal, les sections et les opérations existantes.

## Validation locale

- `npm run lint` : PASS.
- `npm run build` : PASS ; avertissement Vite existant sur les chunks > 500 kB.
- `npm run test:emulators` : **851 tests PASS** (plus 5 contrôles CI préalables).
- Après ajout des champs auteur : **31 tests ciblés PASS**, incluant les Rules granulaire, Client 360, navigation et le nouveau modèle.
- `member360-workspace-browser.mjs` : **78 contrôles PASS** ; quatre rôles, huit espaces, programmes, notes, planning contextualisé, documents, messages, facturation autorisée, refresh, Back, membre absent/étranger/non affecté, révocation d’affectation, 390/820/1440 px.
- Rôles et formats : **433 PASS** ; desktop : **206 PASS**.
- Pulse : **389 PASS** après relance isolée d’un timeout initial de chargement Chromium.
- Retain : **417 PASS** ; Sales : **884 PASS** ; Onboarding : **1 049 PASS** ; CRM : **99 PASS**.
- `git diff --check` : PASS.

Toutes les recettes navigateur utilisent des fixtures synthétiques et bloquent les requêtes externes de l’application. Les tests Firebase utilisent exclusivement `demo-velatra`. Aucun test de paiement réel, email réel ou écriture production n’a été effectué.

## Captures

Le workflow `Mobile browser regression` ajoute un job `member360-workspace` et publie l’artefact `member360-workspace-evidence`, avec captures 1440 px pour Solo Owner, Studio Owner, Manager et Coach.

Captures de validation demandées :

- `solo-overview-1440.png`, `solo-coaching-1440.png`, `solo-progress-1440.png`, `solo-followup-1440.png`, `solo-planning-1440.png`.
- `owner-overview-1440.png`, `owner-retain-1440.png`, `owner-documents-1440.png`, `owner-billing-1440.png`.

La capture facturation utilise le Studio Owner, car le Manager n’a pas cette capacité. Des captures Manager séparées sont aussi produites.

## Limites et phase suivante

- Les opérations métier restent des callbacks dans MembersPage : extraction ciblée, pas réécriture complète.
- Les archives sont celles déjà chargées par l’application. Les sources absentes ne sont ni inventées ni recherchées via une nouvelle collection.
- La timeline est un modèle de lecture, pas un audit exhaustif serveur ; Retain/onboarding conservent leurs historiques spécialisés.
- L’upload réel Storage, les paiements Stripe et les notifications externes ne sont pas exécutés dans les recettes UI ; leurs autorisations et services sont couverts par les tests existants isolés.
- Pour la phase 4 : partir des actions et contextes existants pour unifier les tâches du quotidien, après validation produit séparée. Aucun travail de cette phase n’est inclus ici.
