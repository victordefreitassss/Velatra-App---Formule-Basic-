# VELATRA — Master Feature Map

Audit du 29 septembre 2026. Base : `dc6d050e76c9c9f6bf22aa8bd9ecb8c79cba0351` (main après PR #8).

**Mission documentaire : aucune fonction métier, règle Firebase, donnée de production ou direction artistique modifiée.** Cette carte décrit le code et les interfaces actuels, pas un produit futur considéré comme livré.

## Résultat principal

Velatra possède déjà un socle de coaching réel : clients, programmes, séance adhérent, suivi, nutrition, CRM, planning, messagerie, fichiers et fonctions de facturation. La profondeur et la qualité restent inégales. Les principaux écarts sont la séparation Solo/Studio non persistée, la parité CRM mobile, les débordements Drive/relances et du CRM tablette et des actions secondaires trop petites. Les campagnes, la caisse complète et les intégrations santé ne doivent pas être vendues comme disponibles.

La séance adhérent est une base à préserver : saisie de charge, validation d’une série et passage au repos effectués à 320×568 sur un compte fictif. Aucune séance n’a été terminée côté serveur.

## Comment lire les deux cartes

- `Implémenté` : code et dépendances identifiés. Cela ne signifie pas « testé de bout en bout en production ».
- `Partiel`, `conditionnel`, `indisponible`, `legacy` : limites explicitées dans chaque fiche.
- Rôles : **O** propriétaire (`owner`), **C** coach salarié (`coach`), **M** adhérent (`member`), **A** superadmin. Un coach indépendant s’inscrit actuellement comme **owner**, pas comme rôle `coach`.
- `accountType` : sauf mention contraire, **aucune différenciation persistée coach/club**. Commun ne veut pas dire accès autorisé à tous les rôles.
- Les clés `home`, `users`, etc. sont des valeurs de `state.page` dans **`/dashboard`**, pas des routes `/users` ou `/crm_pipeline`. La fixture locale ajoute des paramètres QA ; ces paramètres ne sont pas une API du produit.
- La [carte responsive](VELATRA-RESPONSIVE-CAPABILITY-MAP.md) associe à chaque ID la présentation actuelle, les trois qualités et les rôles PHONE/TABLET/DESKTOP **recommandés**.

## Preuves et limites

Lecture de `App.tsx`, `types.ts`, routes publiques, pages/composants, services et endpoints. Recette navigateur avec les composants React du commit audité, des données synthétiques et une couche Firebase/API fictive refusant les écritures. Les collections de production n’ont pas été interrogées pour alimenter cette recette.

41 vues/états × 16 formats = **656 combinaisons vue/format contrôlées**. Inspections visuelles ciblées : liste clients mobile/desktop, dossier tablette, Drive et relances 320px, modèles, éditeur mobile/large écran, CRM laptop/tablette, séance adhérent 320px. Les mesures ont été répétées après stabilisation des styles ; ce ne sont pas 656 tests métier réussis. Détails de couverture et limites dans la seconde carte.

Le banc local est dérivé du montage de `scripts/qa/mobile-foundations-browser.mjs`, sans lancer son automatisation Puppeteer ; pilotage via le navigateur de recette. La sélection de page et les données sont des fixtures compilées locales, pas une modification des modules applicatifs. Polices de repli dans ce banc : une recette avec polices chargées reste nécessaire avant validation graphique définitive. Les états externes Stripe/Gemini/SMTP, les refus de sécurité et les appareils physiques ne sont pas certifiés par cet audit.

## Modèle réellement en place

`Club.plan` utilise encore `basic | classic | premium`. `canAddStaff` commande une partie de l’interface équipe. `isActive` suspend une structure. Les affectations s’appuient sur `assignedCoachUid`, un index `assignedMemberIds` et les champs recopiés sur les enregistrements. Ces mécanismes ne forment pas un modèle contractuel Coach/Studio ni une matrice de permissions personnalisables.

`accountType` apparaît dans `ClubRegistration` et dans `POST /api/register-club`, mais ne figure pas dans les documents créés ni les interfaces `Club`/`User`. Il modifie le texte de description et de notes. Tester `canAddStaff=true/false` ne revient donc pas à tester deux vrais accountTypes.

## Inventaire des capacités

### F01 — Connexion, Google, réinitialisation du mot de passe

- **Existence / qualité :** Implémentées ; fournisseurs et emails réels non retestés.
- **Rôle :** Tous. **accountType :** Commun.
- **Page / sources :** `/login · components/Login.tsx`.
- **Données / API :** Firebase Auth, users/{uid} ; restauration Auth/profil dans App.tsx.
- **Recommandation :** Recette réelle de connexion/reprise et erreurs avant certification.
- **Formats :** voir F01 dans la carte responsive.

### F02 — Inscription coach ou structure sur invitation

- **Existence / qualité :** Implémentée ; dépend du code serveur.
- **Rôle :** Futur owner. **accountType :** coach ou club à la création seulement.
- **Page / sources :** `/register · components/ClubRegistration.tsx`.
- **Données / API :** POST /api/register-club ; Auth, users, clubs ; CLUB_INVITE_CODE côté serveur.
- **Recommandation :** Conserver le choix de compte dans le modèle métier, sans déduire ce choix des notes.
- **Formats :** voir F02 dans la carte responsive.

### F03 — Invitation et onboarding adhérent

- **Existence / qualité :** Implémentés ; quatre étapes de profil.
- **Rôle :** M ; invitation O/C. **accountType :** Commun.
- **Page / sources :** `/register puis /dashboard · components/RegistrationForm.tsx, components/Onboarding.tsx`.
- **Données / API :** POST /api/register-member ; users, plans, subscriptions ; objectifs, profil, pratique, contraintes.
- **Recommandation :** Retester les quatre étapes et les erreurs au clavier réel ; ne pas confondre inscription et onboarding connecté.
- **Formats :** voir F03 dans la carte responsive.

### F04 — Séparation durable Solo / Studio

- **Existence / qualité :** Absente du modèle persistant.
- **Rôle :** O/C/M. **accountType :** Non disponible.
- **Page / sources :** `types.ts, server.ts, components/ClubRegistration.tsx`.
- **Données / API :** accountType accepté dans la requête ; seulement description et notes différenciées ; Club/User sans ce champ.
- **Recommandation :** Définir puis migrer le type de compte avant tout parcours conditionnel ou promesse Studio.
- **Formats :** voir F04 dans la carte responsive.

### F05 — Navigation, recherche de pages, actions rapides

- **Existence / qualité :** Implémentées ; cible téléphone coach partiellement respectée.
- **Rôle :** O/C/M/A. **accountType :** Commun.
- **Page / sources :** `/dashboard · components/Layout.tsx, components/appShellHelpers.ts`.
- **Données / API :** state.page ; recherche locale des destinations ; menus Créer, Plus, profil.
- **Recommandation :** Donner au Planning une entrée téléphone cohérente ; conserver les destinations secondaires accessibles.
- **Formats :** voir F05 dans la carte responsive.

### F06 — Premiers pas coach

- **Existence / qualité :** Implémentés ; checklist fondée sur les données.
- **Rôle :** O/C. **accountType :** Commun.
- **Page / sources :** `home · components/CoachOnboardingDashboard.tsx, components/coachOnboardingHelpers.ts`.
- **Données / API :** users, programs, bookings, profil du club ; événements locaux productEvents.
- **Recommandation :** Garder une prochaine action unique ; analytics distants encore à brancher si souhaités.
- **Formats :** voir F06 dans la carte responsive.

### F07 — Pilotage quotidien coach

- **Existence / qualité :** Implémenté ; KPI dérivés des collections.
- **Rôle :** O/C. **accountType :** Commun.
- **Page / sources :** `home · components/CoachDashboard.tsx`.
- **Données / API :** logs, payments, prospects, tasks, subscriptions, messages ; passage à la vue mature à 4 membres.
- **Recommandation :** Prioriser les actions téléphone ; exploiter le grand écran avec suivi contextuel plutôt que rallonger les cartes.
- **Formats :** voir F07 dans la carte responsive.

### F08 — Liste, recherche et filtres clients

- **Existence / qualité :** Implémentés ; base responsive solide.
- **Rôle :** O ; C affectations. **accountType :** Commun.
- **Page / sources :** `users · pages/MembersPage.tsx`.
- **Données / API :** users, programs, logs, subscriptions ; filtres locaux après abonnement Firestore.
- **Recommandation :** Ajouter contexte latéral/bulk desktop ; garantir accès au feedback masqué dans la liste étroite.
- **Formats :** voir F08 dans la carte responsive.

### F09 — Création et invitation individuelle de client

- **Existence / qualité :** Implémentées ; formulaire non soumis ici.
- **Rôle :** O/C. **accountType :** Commun.
- **Page / sources :** `users · components/AddMemberDialog.tsx, pages/MembersPage.tsx`.
- **Données / API :** POST /api/create-member ; POST /api/send-onboarding-email ; Auth + users ; SMTP conditionnel.
- **Recommandation :** Conserver le parcours rapide ; distinguer création du compte et livraison effective de l’email.
- **Formats :** voir F09 dans la carte responsive.

### F10 — Import CSV clients

- **Existence / qualité :** Implémenté ; import en série, traitement partiel possible.
- **Rôle :** O/C. **accountType :** Commun.
- **Page / sources :** `users · pages/MembersPage.tsx, services/aiService.ts`.
- **Données / API :** parseClientsCSV puis création de comptes ; aperçu/sélection ; données fictives uniquement en recette.
- **Recommandation :** Expliquer sur téléphone comment ouvrir la vue complète ; auditer volume, reprise et doublons séparément.
- **Formats :** voir F10 dans la carte responsive.

### F11 — Dossier client, identité et statut

- **Existence / qualité :** Implémenté ; modal riche.
- **Rôle :** O ; C affectations. **accountType :** Commun.
- **Page / sources :** `users > dossier · pages/MembersPage.tsx`.
- **Données / API :** users ; programmes, abonnements, logs, coach référent.
- **Recommandation :** Conserver toutes les données dans le dossier ; agrandir l’action modifier et simplifier les formulaires téléphone.
- **Formats :** voir F11 dans la carte responsive.

### F12 — Notes de suivi, mensurations et bilan client

- **Existence / qualité :** Implémentés ; écriture non rejouée.
- **Rôle :** O ; C affectations. **accountType :** Commun.
- **Page / sources :** `users > Vue d’ensemble/Mensurations · pages/MembersPage.tsx`.
- **Données / API :** users.notes, coachingNotesHistory, bodyData ; rapports IA via proxy.
- **Recommandation :** Mettre la prise de note rapide en avant ; éviter de mêler note globale et historique daté.
- **Formats :** voir F12 dans la carte responsive.

### F13 — Affectation adhérent → coach

- **Existence / qualité :** Implémentée avec endpoint dédié.
- **Rôle :** O/A ; C consultation de son périmètre. **accountType :** Équipe, sans accountType stocké.
- **Page / sources :** `users > profil · pages/MembersPage.tsx, server.ts`.
- **Données / API :** POST /api/assign-member-coach ; assignedCoachUid, assignedMemberIds ; synchronisation des enregistrements.
- **Recommandation :** Présenter un contrôle simple sur mobile ; la recette visuelle ne prouve pas les droits serveur.
- **Formats :** voir F13 dans la carte responsive.

### F14 — Gestion de plusieurs coachs

- **Existence / qualité :** Partielle : création staff et activation présentes.
- **Rôle :** O/A ; UI également atteignable C. **accountType :** Équipe activée par clubs.canAddStaff.
- **Page / sources :** `settings · pages/SettingsPage.tsx, server.ts`.
- **Données / API :** POST /api/create-staff ; Auth/users ; UI canAddStaff ; backend vérifie owner/club.
- **Recommandation :** Aligner UI et droits : le formulaire apparaît aussi au coach ; canAddStaff n’est pas contrôlé dans cet endpoint.
- **Formats :** voir F14 dans la carte responsive.

### F15 — Permissions avancées et rôles personnalisables

- **Existence / qualité :** Absentes comme produit configurable.
- **Rôle :** O/A. **accountType :** Cible Studio ; non implémenté.
- **Page / sources :** `Pas de page ; types.ts, firestore.rules, storage.rules`.
- **Données / API :** Rôles fixes superadmin/owner/coach/member ; règles et vérifications serveur.
- **Recommandation :** Ne pas vendre une matrice de permissions ; prévoir une conception explicite avec tests de droits.
- **Formats :** voir F15 dans la carte responsive.

### F16 — Modèles de programmes et attribution

- **Existence / qualité :** Implémentés ; cartes et actions adaptées dans les états inspectés.
- **Rôle :** O/C. **accountType :** Commun.
- **Page / sources :** `presets · pages/PresetsPage.tsx`.
- **Données / API :** presets, programs ; duplication, attribution, suppression.
- **Recommandation :** Préserver les actions nommées et leur cible tactile ; ne regrouper que si cela améliore la lisibilité.
- **Formats :** voir F16 dans la carte responsive.

### F17 — Builder manuel complexe

- **Existence / qualité :** Implémenté ; vraie adaptation au conteneur.
- **Rôle :** O/C. **accountType :** Commun.
- **Page / sources :** `Editor depuis modèle/dossier · components/Editor.tsx, components/program-editor.css`.
- **Données / API :** programs/presets ; jours, exercices, séries, repos, tempo, groupes ; état local avant sauvegarde.
- **Recommandation :** Mettre les réglages immédiats plus près de l’exercice sur téléphone ; agrandir les boutons icônes.
- **Formats :** voir F17 dans la carte responsive.

### F18 — Programmation et synthèses assistées par IA

- **Existence / qualité :** Implémentées côté code ; Gemini réel non appelé.
- **Rôle :** O/C selon données accessibles. **accountType :** Commun.
- **Page / sources :** `users > outils IA · pages/MembersPage.tsx, services/aiService.ts`.
- **Données / API :** POST /api/gemini/generateContent ; génération sport/nutrition, bilan, stagnation ; contexte fourni par le client.
- **Recommandation :** Tester génération→relecture→validation ; vérifier les données envoyées et ne pas promettre une adaptation autonome.
- **Formats :** voir F18 dans la carte responsive.

### F19 — Bibliothèque exercices et médias

- **Existence / qualité :** Implémentée ; contenu initial fourni dans le code.
- **Rôle :** O/C ; M consultation via séance. **accountType :** Commun.
- **Page / sources :** `exercises · pages/ExercisesPage.tsx, constants.ts`.
- **Données / API :** exercises, INIT_EXERCISES ; Storage exercise_videos ; liens vidéo externes.
- **Recommandation :** Nommer les boutons icônes et agrandir les cibles 32×40 ; qualifier les médias initiaux séparément des données client.
- **Formats :** voir F19 dans la carte responsive.

### F20 — Séance coach en direct

- **Existence / qualité :** Implémentée ; validation backend dédiée.
- **Rôle :** O/C. **accountType :** Commun.
- **Page / sources :** `coaching > Libre/Prog. · components/CoachingSessionView.tsx`.
- **Données / API :** programs, exercises ; POST /api/workouts/complete ; logs, performances.
- **Recommandation :** Retester clavier/tablette et plusieurs adhérents ; conserver le CTA au-dessus de la navigation.
- **Formats :** voir F20 dans la carte responsive.

### F21 — Accueil et prochaine action adhérent

- **Existence / qualité :** Implémentés ; orientés usage mobile.
- **Rôle :** M. **accountType :** Commun.
- **Page / sources :** `home · components/MemberDashboard.tsx, components/MemberWorkoutEntry.tsx`.
- **Données / API :** programs, bookings, logs, check-in ; brouillon séance local ; conseil IA conditionnel.
- **Recommandation :** Préserver la priorité à la séance et au suivi du jour ; tester données longues et absence de programme.
- **Formats :** voir F21 dans la carte responsive.

### F22 — Mes séances et consultation du programme

- **Existence / qualité :** Implémentées.
- **Rôle :** M. **accountType :** Commun.
- **Page / sources :** `calendar · pages/CalendarPage.tsx`.
- **Données / API :** programs, bookings, logs ; prochain jour calculé ; historique.
- **Recommandation :** Garder le programme intégral accessible via le volet secondaire.
- **Formats :** voir F22 dans la carte responsive.

### F23 — Workout : saisie série, charge, répétitions

- **Existence / qualité :** Implémenté ; interaction locale vérifiée à 320px.
- **Rôle :** M. **accountType :** Commun.
- **Page / sources :** `dialog WorkoutView · components/WorkoutView.tsx, components/workoutSession.ts`.
- **Données / API :** État séance et brouillon local ; référence performances ; aucun enregistrement serveur pendant ce test.
- **Recommandation :** Conserver le CTA fixe ; tester clavier iOS/Android et exercices à durée.
- **Formats :** voir F23 dans la carte responsive.

### F24 — Repos, pause et reprise de séance

- **Existence / qualité :** Implémentés ; repos déclenché dans la recette.
- **Rôle :** M. **accountType :** Commun.
- **Page / sources :** `WorkoutView · components/useWorkoutDraft.ts, components/workoutSession.ts`.
- **Données / API :** Brouillon local par session ; chronomètre et séries validées.
- **Recommandation :** Tester verrouillage/reprise téléphone et navigation arrière ; ne pas assimiler brouillon local à sauvegarde cloud.
- **Formats :** voir F24 dans la carte responsive.

### F25 — Fin de séance et synchronisation

- **Existence / qualité :** Implémentée ; transaction serveur, non soumise ici.
- **Rôle :** M/O/C selon séance. **accountType :** Commun.
- **Page / sources :** `WorkoutView/CoachingSessionView · server/completeWorkout.ts`.
- **Données / API :** POST /api/workouts/complete ; logs, performances, progression ; contrôles serveur.
- **Recommandation :** Recette séparée réseau coupé/reprise/idempotence ; ne pas certifier à partir d’un bouton visible.
- **Formats :** voir F25 dans la carte responsive.

### F26 — Check-in quotidien adhérent

- **Existence / qualité :** Implémenté via API.
- **Rôle :** M ; suivi coach selon périmètre. **accountType :** Commun.
- **Page / sources :** `home · components/MemberDashboard.tsx, server/memberDailyCheckIn.ts`.
- **Données / API :** GET /api/member/daily-checkin/today ; POST /api/member/daily-checkin ; collection dédiée.
- **Recommandation :** Tester formulaire et états sauvegarde/erreur sur appareil ; clarifier le retour coach.
- **Formats :** voir F26 dans la carte responsive.

### F27 — Progression, statistiques et historique sportif

- **Existence / qualité :** Implémentés ; jeux vide et rempli affichés.
- **Rôle :** M ; O/C via dossiers/historique. **accountType :** Commun.
- **Page / sources :** `performances/history · pages/StatsPage.tsx, pages/HistoryPage.tsx`.
- **Données / API :** logs, performances, bodyData ; agrégats locaux ; séances détaillées.
- **Recommandation :** Distinguer absence de données et absence d’évolution ; éprouver historiques longs et graphiques.
- **Formats :** voir F27 dans la carte responsive.

### F28 — Photos d’évolution et mensurations adhérent

- **Existence / qualité :** Implémentées ; upload non retesté.
- **Rôle :** M ; O/C périmètre autorisé. **accountType :** Commun.
- **Page / sources :** `evolution · pages/EvolutionGalleryPage.tsx`.
- **Données / API :** progressPhotos, visibilité, mensurations ; lecture fichier et persistance ; pas de photo réelle utilisée.
- **Recommandation :** Valider import, partage et suppression séparément avec fixtures ; mettre la confidentialité en contexte.
- **Formats :** voir F28 dans la carte responsive.

### F29 — Nutrition : création et suivi coach

- **Existence / qualité :** Implémentés ; calculs et édition.
- **Rôle :** O/C. **accountType :** Commun.
- **Page / sources :** `nutrition/dossier · pages/NutritionPage.tsx`.
- **Données / API :** nutritionPlans, nutritionPresets ; repas, macros, objectifs ; IA facultative.
- **Recommandation :** Rendre l’édition de repas plus directe sur tablette ; tester sauvegarde complète et longues listes.
- **Formats :** voir F29 dans la carte responsive.

### F30 — Nutrition : plan et journal adhérent

- **Existence / qualité :** Implémentés ; plan vide/rempli vérifié.
- **Rôle :** M. **accountType :** Commun.
- **Page / sources :** `nutrition · pages/MemberNutritionPage.tsx, components/MemberNutritionView.tsx`.
- **Données / API :** nutritionPlans, nutritionLogs ; journal, repères, repas ; estimation/photographie via Gemini.
- **Recommandation :** Retester saisie réelle, erreur IA et conservation des champs ; ne pas vendre des analyses médicales.
- **Formats :** voir F30 dans la carte responsive.

### F31 — Messagerie coach–adhérent et pièces jointes

- **Existence / qualité :** Implémentée ; envoi non effectué.
- **Rôle :** O/C/M. **accountType :** Commun.
- **Page / sources :** `chat/messages · pages/MessagesPage.tsx`.
- **Données / API :** messages, assignedCoachUid ; Storage pièces jointes ; API coach attribué côté membre.
- **Recommandation :** Valider clavier, conversation longue et upload ; l’input fichier caché 1×1 est associé à un bouton, pas un défaut tactile en soi.
- **Formats :** voir F31 dans la carte responsive.

### F32 — Conversation IA persistante

- **Existence / qualité :** Implémentée ; réponse réelle non testée.
- **Rôle :** M ; O/C via contexte dossier. **accountType :** Commun.
- **Page / sources :** `ai_coach et dossier · pages/AICoachPage.tsx, server/aiConversation.ts`.
- **Données / API :** GET/PUT/DELETE /api/ai/conversation ; proxy Gemini ; scope utilisateur/adhérent ; aucune modification autonome de programme.
- **Recommandation :** Conserver la validation coach ; ne pas confondre historique IA autorisé et contexte serveur automatiquement recherché.
- **Formats :** voir F32 dans la carte responsive.

### F33 — Planning, réservation, annulation

- **Existence / qualité :** Implémentés ; endpoints transactionnels.
- **Rôle :** O/C/M selon périmètre. **accountType :** Commun, booking.enabled.
- **Page / sources :** `calendar coach / planning membre · pages/PlanningPage.tsx, server/bookings.ts`.
- **Données / API :** POST /api/bookings/reserve, cancel ; bookings, crédits, horaires.
- **Recommandation :** Ajouter vue calendrier+journée sur écran large ; conserver sélection de date accessible sans miniature de semaine.
- **Formats :** voir F33 dans la carte responsive.

### F34 — Configuration disponibilités, crédits et types de séances

- **Existence / qualité :** Implémentée ; surface unique peu spécialisée.
- **Rôle :** O/A ; UI atteignable C. **accountType :** Commun.
- **Page / sources :** `settings · pages/SettingsPage.tsx`.
- **Données / API :** clubs.settings.booking ; schedule, types, coachId, délais, places ; plans/credits.
- **Recommandation :** Adapter profondeur mobile ; aligner les actions permises avec le rôle ; tester formulaires longs.
- **Formats :** voir F34 dans la carte responsive.

### F35 — CRM : consultation, notes et pipeline

- **Existence / qualité :** Implémenté ; parité d’édition incomplète.
- **Rôle :** O/C. **accountType :** Commun, CRM partagé club.
- **Page / sources :** `crm_pipeline · pages/ProspectFlowPage.tsx`.
- **Données / API :** prospects ; lead/contacted/trial/call_pending/won/lost ; écritures Firestore.
- **Recommandation :** Ajouter sélecteur d’étape accessible téléphone/clavier ; ne pas considérer une liste filtrable comme équivalente au pipeline éditable.
- **Formats :** voir F35 dans la carte responsive.

### F36 — Conversion prospect, séance d’essai et suivi commercial

- **Existence / qualité :** Implémentés dans le code ; accès de certains chemins à revalider.
- **Rôle :** O/C. **accountType :** Commun.
- **Page / sources :** `crm_pipeline · pages/ProspectFlowPage.tsx`.
- **Données / API :** Création membre, prospects.status, bookings trial ; modales conversion/relance.
- **Recommandation :** Tracer chaque chemin depuis un bouton visible, y compris sur téléphone ; les handlers seuls ne prouvent pas l’accessibilité du parcours.
- **Formats :** voir F36 dans la carte responsive.

### F37 — Relances programmées

- **Existence / qualité :** Partielle ; bouton sans action et débordement.
- **Rôle :** O/C. **accountType :** Commun.
- **Page / sources :** `crm_tasks · pages/TasksPage.tsx`.
- **Données / API :** prospects call_pending ; nextReminderDate ; cette page n’est pas un gestionnaire générique de tasks.
- **Recommandation :** Brancher ou retirer À rappeler avant ; corriger header ; distinguer tâches et relances.
- **Formats :** voir F37 dans la carte responsive.

### F38 — Tâches automatiques et priorités

- **Existence / qualité :** Partielles ; déclenchement navigateur et transaction Firestore, pas workflow autonome complet.
- **Rôle :** O/C. **accountType :** Commun.
- **Page / sources :** `home · components/automaticTasks.ts, components/CoachDashboard.tsx`.
- **Données / API :** tasks, échéances client ; calculs dans le navigateur ; événements locaux.
- **Recommandation :** Documenter qui crée/exécute chaque tâche et à quel moment ; ne pas promettre des relances email autonomes.
- **Formats :** voir F38 dans la carte responsive.

### F39 — Finances et analytics activité

- **Existence / qualité :** Implémentées ; projections estimatives.
- **Rôle :** O/C visibilité ; droits selon opération. **accountType :** Commun.
- **Page / sources :** `crm_finances · pages/FinancesPage.tsx`.
- **Données / API :** payments, subscriptions, expenses, fixedCosts ; MRR, CA, projections calculées localement.
- **Recommandation :** Séparer résultat réel et estimation ; réserver analyses longues à desktop, synthèse téléphone.
- **Formats :** voir F39 dans la carte responsive.

### F40 — Encaissement, paiements et facturation client

- **Existence / qualité :** Implémentés, conditionnels pour Stripe.
- **Rôle :** O/A pour opérations Stripe ; C selon règles. **accountType :** Commun.
- **Page / sources :** `users > Facturation · pages/MembersPage.tsx, server/stripePayments.ts`.
- **Données / API :** payments, invoices ; liens/débits Stripe via API ; solde local.
- **Recommandation :** Différencier saisie manuelle et encaissement confirmé ; boutons crédits +/- trop étroits.
- **Formats :** voir F40 dans la carte responsive.

### F41 — Formules, abonnements, contrats et portail client

- **Existence / qualité :** Implémentés ; paiement externe conditionnel.
- **Rôle :** O/A ; M son abonnement. **accountType :** Commun.
- **Page / sources :** `settings/finances/dossier/profile · pages/ProfilePage.tsx, pages/SettingsPage.tsx`.
- **Données / API :** plans, subscriptions, contractUrl ; /api/stripe/create-plan, payment-link, portal ; Storage contracts.
- **Recommandation :** Clarifier formule client vs abonnement Velatra ; tester Stripe en environnement prévu et signature séparément.
- **Formats :** voir F41 dans la carte responsive.

### F42 — Exports CSV/PDF et factures

- **Existence / qualité :** Implémentés côté client ; génération non rejouée.
- **Rôle :** O/C selon données autorisées. **accountType :** Commun.
- **Page / sources :** `crm_finances/dossier · pages/FinancesPage.tsx, services/pdfService.ts`.
- **Données / API :** Agrégats locaux → CSV/jsPDF ; invoices ; données filtrées de l’utilisateur.
- **Recommandation :** Valider contenu et export sur téléphone réel ; ne pas assimiler PDF généré à comptabilité certifiée.
- **Formats :** voir F42 dans la carte responsive.

### F43 — Connexion Stripe et encaissement sécurisé serveur

- **Existence / qualité :** Implémentés ; configuration externe requise.
- **Rôle :** O/A. **accountType :** Commun.
- **Page / sources :** `settings · pages/SettingsPage.tsx, server.ts`.
- **Données / API :** /api/stripe/status, connect ; secrets serveur, webhook ; permissions gestionnaire.
- **Recommandation :** Masquer/expliquer les actions au coach salarié ; vérifier configuration effective hors de cet audit.
- **Formats :** voir F43 dans la carte responsive.

### F44 — Drive commun, dossiers et partage

- **Existence / qualité :** Implémentés ; défaut responsive confirmé.
- **Rôle :** O/C ; M fichiers partagés. **accountType :** Commun ; bibliothèque staff commune.
- **Page / sources :** `drive · pages/DrivePage.tsx`.
- **Données / API :** driveFiles, driveFolders ; Storage drive ; sharedWith ; URLs de téléchargement.
- **Recommandation :** Empiler les actions sous le titre mobile ; tester dossiers remplis et accès aux liens ; aucune modification Storage ici.
- **Formats :** voir F44 dans la carte responsive.

### F45 — Documents client, avatar, contrats et médias

- **Existence / qualité :** Implémentés ; autorisations selon chemin.
- **Rôle :** O/C/M selon propriété et partage. **accountType :** Commun.
- **Page / sources :** `dossier/profile/exercises · pages/MembersPage.tsx, storage.rules`.
- **Données / API :** users.documents, avatars, contracts, drive, exercise_videos ; règles Storage.
- **Recommandation :** Réutiliser la recette de sécurité dédiée ; auditer upload/erreur sur mobile séparément.
- **Formats :** voir F45 dans la carte responsive.

### F46 — Profil, objectifs et infos club

- **Existence / qualité :** Implémentés ; objectifs guidés par le coach.
- **Rôle :** M ; O réglages club. **accountType :** Commun.
- **Page / sources :** `profile/about/settings · pages/ProfilePage.tsx, pages/AboutPage.tsx`.
- **Données / API :** users, measurements, clubs, coaches ; données de contact ; abonnement.
- **Recommandation :** Maintenir lecture complète téléphone ; ne pas transformer un objectif en progression chiffrée fictive.
- **Formats :** voir F46 dans la carte responsive.

### F47 — Notifications et annonces

- **Existence / qualité :** Partielles : données/badges et notifications navigateur.
- **Rôle :** O/C/M ; A annonces. **accountType :** Commun.
- **Page / sources :** `Layout/App/AdminDashboard · components/Layout.tsx, App.tsx`.
- **Données / API :** notifications, feed, annonces admin ; API Notification quand permission déjà accordée.
- **Recommandation :** Vérifier destination des badges et flux complet ; une notification navigateur n’est pas une garantie push native.
- **Formats :** voir F47 dans la carte responsive.

### F48 — Chronomètre autonome

- **Existence / qualité :** Implémenté.
- **Rôle :** O/C/M. **accountType :** Commun.
- **Page / sources :** `Créer/profil/Plus · components/Timer.tsx, components/Layout.tsx`.
- **Données / API :** État local, sans API métier.
- **Recommandation :** Garder l’outil accessible sans masquer les actions de séance ; test de verrouillage appareil à prévoir.
- **Formats :** voir F48 dans la carte responsive.

### F49 — Campagnes marketing

- **Existence / qualité :** Indisponibles, placeholder explicite.
- **Rôle :** O/C. **accountType :** Commun.
- **Page / sources :** `marketing · pages/MarketingPage.tsx`.
- **Données / API :** Aucune action d’envoi ; page Bientôt disponible.
- **Recommandation :** Ne pas vendre cette capacité ; décider de sa place dans Business.
- **Formats :** voir F49 dans la carte responsive.

### F50 — Boutique adhérent et caisse/stock studio

- **Existence / qualité :** Boutique = guide statique ; caisse/stock opérationnels non trouvés.
- **Rôle :** M guide ; cible O/C pour caisse. **accountType :** Cible Studio non matérialisée.
- **Page / sources :** `supplements · pages/MemberSupplementsPage.tsx, types.ts`.
- **Données / API :** Contenu statique ; types Product/SupplementProduct/Order et subscriptions de données ne constituent pas une caisse.
- **Recommandation :** Ne pas promettre achat, panier ou gestion de stock utilisable ; bouton achat affiche bientôt.
- **Formats :** voir F50 dans la carte responsive.

### F51 — Administration globale

- **Existence / qualité :** Implémentée ; plusieurs notions commerciales anciennes.
- **Rôle :** A uniquement. **accountType :** Plateforme, hors accountType.
- **Page / sources :** `admin · pages/AdminDashboard.tsx`.
- **Données / API :** clubs, users, annonces, audit ; canAddStaff, isActive, basic/classic/premium ; projections simulées.
- **Recommandation :** Aligner les formules avec Coach/Studio après décision de modèle ; ne pas présenter une simulation comme revenu observé.
- **Formats :** voir F51 dans la carte responsive.

### F52 — PWA, entrée app et hors ligne

- **Existence / qualité :** Partiels : manifest, service worker, brouillon ; pas native.
- **Rôle :** Tous. **accountType :** Commun.
- **Page / sources :** `RootApp/index/public · public/manifest.json, public/sw.js, components/useWorkoutDraft.ts`.
- **Données / API :** Entrée /dashboard ; service worker avec handler fetch vide (pas de cache applicatif implémenté ici) ; brouillon local ; queue de synchronisation legacy dans App.tsx.
- **Recommandation :** Tester installation et reprise iOS/Android ; ne pas promettre toute l’application hors ligne ni App Store.
- **Formats :** voir F52 dans la carte responsive.

### F53 — Compagnon officiel, aide et guides

- **Existence / qualité :** Implémentés ; assistant visuel distinct de Gemini.
- **Rôle :** Tous selon surface. **accountType :** Commun.
- **Page / sources :** `guide et composants · components/VelatraMascot.tsx, pages/GuidePage.tsx`.
- **Données / API :** Assets du pack et états visuels ; contenu guide statique.
- **Recommandation :** Conserver assets officiels ; aide contextuelle utile ; ne pas confondre animation et fonction IA.
- **Formats :** voir F53 dans la carte responsive.

### F54 — Site public produit et contact

- **Existence / qualité :** Implémentés ; hors recette visuelle de cette mission connectée.
- **Rôle :** Public. **accountType :** Offres Coach/Studio commerciales.
- **Page / sources :** `MarketingSite.tsx, pages/PricingPage.tsx, pages/ContactPage.tsx`.
- **Données / API :** Routes produit/solutions/tarifs/blog/aide ; /api/public/contact, prospects ; contenus éditoriaux.
- **Recommandation :** Garder les promesses alignées sur cette carte ; pages marketing non certifiées ici aux 16 formats.
- **Formats :** voir F54 dans la carte responsive.

### F55 — Apple Health / MyFitnessPal

- **Existence / qualité :** Non trouvés comme intégrations exécutables.
- **Rôle :** M cible. **accountType :** Commun.
- **Page / sources :** `types.ts : User.integrations`.
- **Données / API :** Drapeaux de type ; pas de connecteur fonctionnel identifié.
- **Recommandation :** Ne pas annoncer une synchronisation active sur la seule présence de champs de type.
- **Formats :** voir F55 dans la carte responsive.

### F56 — Fidélité, XP, trophées et communauté

- **Existence / qualité :** Partiels/legacy ; pas une suite accessible complète.
- **Rôle :** M ; O réglages fidélité. **accountType :** Commun.
- **Page / sources :** `types.ts, pages/TrophyPage.tsx, App.tsx`.
- **Données / API :** XP/streak/points ; trophées importés mais pas de case trophy dans renderPage ; plusieurs clés Page sans écran.
- **Recommandation :** Distinguer points réellement calculés et destinations non branchées ; ne pas vendre une communauté complète.
- **Formats :** voir F56 dans la carte responsive.

## Décisions prioritaires pour la prochaine mission

1. **Rétablir les capacités opérationnelles** : changement d’étape CRM sans drag/drop ; action de relance réellement reliée ; accès clair aux actions autorisées par rôle.
2. **Corriger les blocages responsive reproduits** : Drive 320–375px, relances 320–390px, header CRM à 768px, petites actions exercices/éditeur/dossier. Préserver les structures qui fonctionnent déjà.
3. **Stabiliser le modèle produit** : définir Coach/Studio dans les données et les droits, puis améliorer la densité desktop avec des panneaux utiles. Ne pas migrer des comptes à partir d’une note libre.

Le premier chantier recommandé est **la parité opérationnelle du CRM sur téléphone/tablette** : une liste lisible ne suffit pas si le coach ne peut pas faire avancer un prospect. Inclure une alternative clavier au drag/drop desktop. Inclure les en-têtes qui débordent dans le CRM, les relances et le Drive.

Aucun de ces correctifs n’est appliqué dans cette mission d’audit.
