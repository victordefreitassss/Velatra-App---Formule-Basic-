# Velatra — Client 360

Base de départ : `427d3d1bc6fcc6338468a62ce1f50cc54cc48699`.

## Inventaire et conflits constatés avant modification du code

Le dossier existant est un dialogue rendu depuis `MembersPage.tsx` au-dessus de la liste des adhérents. `selectedProfile` est le client effectivement ouvert ; `state.selectedMember` sert d'entrée depuis d'autres pages. Les deux sont conservés pour compatibilité, sans introduire une troisième copie du client. `memberTab` pilote déjà le contenu affiché.

Les données sont issues des collections déjà chargées dans `AppState` (`users`, `programs`, `archivedPrograms`, `logs`, `bodyData`, `performances`, `progressPhotos`, `nutritionPlans`, `bookings`, `subscriptions`, `plans`, `payments`, `invoices`, `driveFiles`, `messages`). Les notes courantes et `coachingNotesHistory` vivent sur `users/{uid}` ; elles ne constituent pas deux historiques indépendants. Les documents administratifs vivent sur le profil utilisateur, tandis que les fichiers partagés sont dans `driveFiles` et Storage. Les abonnements visibles dans le dossier sont ceux du membre (`subscriptions.memberId`), distincts de l'abonnement SaaS du club. Les affectations utilisent `assignedCoachUid` et l'endpoint existant `/api/assign-member-coach`.

L'ancienne interface mélangeait les domaines : notes et outils IA dans Vue d'ensemble, nutrition quotidienne dans Mensurations, courbes corporelles dans Profil, records dans Entraînement, et profil/facturation/documents en onglets de premier niveau. L'objectif est de déplacer l'accès visuel à ces blocs sans recopier leurs données ou remplacer leurs handlers. Le dossier conserve son dialogue et son seul état de section ; la profondeur administrative utilise un sous-choix local.

Le rôle `coach` ne reçoit que les adhérents autorisés par le chargement et les règles existants. L'UI d'affectation dépend de `coachAssignments.usable` et du droit de gestion du club. Le type de compte absent reste Legacy ; il n'est jamais inféré. Les actions de suppression de compte relèvent de l'owner selon l'API actuelle.

## Architecture livrée

Le Client 360 conserve un seul dialogue et une seule arborescence de formulaires, avec huit sections pilotées par `memberTab`. Sur mobile le choix est un sélecteur natif ; dès la tablette la navigation passe dans la colonne latérale. L'administratif dispose de trois sous-sections locales (`adminSection`), sans changement de collection ni de route métier. L'ouverture depuis la liste ajoute une entrée d'historique sur `/dashboard`; Retour et Fermer reviennent à la liste. Le lien vers le Planning transmet le membre courant à la sélection de réservation ; « Retour au dossier » restaure son contexte.

| Section | Source de données | Actions existantes | Rôle | Capability | Phone | Tablet | Desktop |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vue d'ensemble | `users`, `programs`, `bookings`, `logs`, `bodyData`, `subscriptions`, `coachingNotesHistory` | Ouvrir programme, message, planning, note | Staff autorisé sur ce membre | `clients` | Cartes verticales, choix de section | Résumé et actions | Résumé à largeur de lecture |
| Coaching | `programs`, `archivedPrograms`, `logs`, modèles déjà chargés | Éditer, attribuer, préparer avec IA, voir séances | Staff autorisé | `programs` | Une colonne | 1–2 colonnes | Contenu développé |
| Progression | `bodyData`, `performances`, `progressPhotos` | Ajouter/supprimer mesure, agrandir photos, voir records | Staff autorisé | `progress` | Cartes verticales | 1–2 colonnes | Graphiques et historique |
| Suivi | `users.notes`, `users.coachingNotesHistory` | Ajouter et supprimer note | Staff autorisé | `clients` | Éditeur et sauvegarde accessibles au clavier | Notes chronologiques | Historique |
| Nutrition | `nutritionPlans`, journaux existants, `MemberNutritionView` | Voir et générer plan, ajuster cibles, attribuer modèle, journal | Staff autorisé | `nutrition` | Une colonne | Une colonne | Contenu développé |
| Calendrier | `bookings`, `plans`, `subscriptions` | Filtrer/annuler, planifier via Planning avec membre présélectionné | Staff autorisé | `planning` | Liste | Liste/filtre | Liste/filtre |
| Administratif | `users`, `subscriptions`, `plans`, `payments`, `invoices`, `driveFiles`, Storage | Profil, crédits, abonnement, paiements, documents, invitation/onboarding, suppression selon droits | Staff ; actions compte rares réservées au gestionnaire | `clients`, `billing`, `documents`; affectation via `coachAssignments` | Sous-sections compactes | Sous-sections | Sous-sections |
| Communication | `messages` existants | Lire, répondre, joindre fichier | Staff autorisé | `messages` | Conversation intégrée | Conversation intégrée | Conversation intégrée |

`getClient360Sections` utilise les capacités existantes ; un utilisateur sans capacité `clients` ne reçoit aucune section. L'ouverture d'un client reste soumise au chargement existant et aux règles serveur/Firestore ; les capacités n'accordent jamais seules un droit sur un enregistrement. Les actions de réinitialisation, pause et suppression sont masquées au coach salarié conformément au droit de gestion du club. En Solo, l'affectation multi-coach n'est pas proposée. En Studio, l'owner garde l'affectation existante. Le compte Legacy conserve ses sections et les permissions historiques, sans déduction artificielle de `accountType`.

Les contrôles de largeur demandés portent sur 320, 360, 375, 390, 430, 768, 820, 1024, 1180, 1280, 1366, 1440, 1600, 1920 et 2560 px. La colonne latérale est compacte en tablette ; la surface utilise jusqu'à 1600 px sur grand écran. Les données métier sont les mêmes pour les trois formats. Les actions principales restent disponibles en deux rangées au plus sur téléphone et le sélecteur de section évite tout ruban horizontal de huit onglets.

Restent hors de ce chantier : parcours par phases, habitudes, questionnaires, nouvelles données de check-in, couche Pulse, automatisations, nouvelle messagerie, nouveau Builder, nouveau planning global, nouvelle caisse/stock et nouvelle IA autonome. Aucun faux accès à ces capacités n'a été ajouté.

## Validation de cette passe

Les tests purs couvrent les sections et raccourcis, les rôles owner Solo/Studio, coach Studio et owner Legacy, les restrictions de capacité, ainsi que les dossiers complets et vides. La suite Firebase Emulator a passé 195 tests. La recette navigateur locale sans écriture vers Firebase a passé 35 contrôles : ouverture/fermeture, Retour navigateur, navigation des huit sections, 15 dimensions demandées, données complètes et vides, nom long à 320 px, champ et sauvegarde de note avec clavier simulé, membre présélectionné dans Planning, affectation Solo/Studio/Legacy et absence des actions gestionnaire chez le coach. Les captures sont conservées dans `.runtime-test-responsive/evidence/client360/` (dossier de travail ignoré par Git). Cette recette ne remplace pas une vérification avec des données et des droits de production.
