# Velatra — système visuel desktop Coach / Studio

## Périmètre

Refonte de présentation à partir de `c07aa00` (main), pour les expériences SOLO_OWNER, STUDIO_COACH, STUDIO_MANAGER et STUDIO_OWNER, dès 1024 px. Les mises en page phone/tablet existantes restent utilisées en dessous de 1024 px. Le Member et le Super Admin conservent leur shell.

Le shell réutilise les destinations filtrées par `getAllContextItems`, les callbacks de navigation/création existants, le menu du compte et la palette de commandes. Les fonctionnalités coaching, CRM et commerciales autorisées restent accessibles, y compris les destinations secondaires sous « Autres outils ». Le modèle actuel ne comporte pas de rôle autonome « commercial ».

Les sections métier de `ExperienceHome` gardent leurs sélecteurs, états, actions et chargements. Aucune modification de backend, requête réseau, permission, schéma, règle Firebase, Stripe ou donnée production. Le widget Documents utilise les métadonnées déjà chargées du club courant et ouvre le Drive existant ; il ne produit aucune URL de téléchargement.

## Composants et identité

- `components/desktop/DesktopUI.tsx` : PageHeader, SectionHeader, DashboardCard, KpiCard, HeroAssistantCard, InsightCard, MonthlyFocusCard, ActionPill, StatusBadge, SearchBar, ProfileSummary, EmptyState, UpgradeCard.
- `DesktopSidebar.tsx` : catalogue de navigation existant, identité Velatra et bloc d’exploration ancré en bas.
- `DesktopDashboard.tsx` : composition Coach / Studio avec les mêmes sections métier.
- `desktop-theme.css` : tokens et styles encapsulés sous `.vd-shell` et les breakpoints desktop. Palette indigo `#0F1447`, bleu `#4A5BFF`, violet `#A855F7`, rose `#EC6BFF`, fond clair et cartes blanches ; rayons 16–20 px, ombres discrètes et focus visibles.

Coach : planning et portefeuille affecté en tête, activité de coaching, documents, messages et tâches. Studio : activité, suivi membres, équipe et prospects ; indicateurs financiers uniquement pour Owner conformément à l’autorisation existante. À partir de 1440 px, la zone de travail passe sur deux colonnes, avec une troisième colonne de repères. À 1024–1439 px, deux colonnes générales.

## Fidélité aux données et interactions

Les chiffres des maquettes ne sont pas reproduits. Les KPI utilisent exclusivement les comptes des sélecteurs existants : membres suivis, prospects en cours, coachs enregistrés, séances confirmées restant aujourd’hui, tâches ouvertes et clients avec programme actif selon l’expérience.

Aucun taux de rétention, évolution hebdomadaire ou objectif chiffré n’est inventé. « Objectif du mois » est explicitement une suggestion éditoriale de Pitou, sans progression ou persistance. « Le mot de Pitou » est un conseil éditorial. La recherche du hero ouvre la palette de pages/outils existante : elle ne promet pas un nouvel assistant IA. Le bloc de sidebar ouvre les outils existants, sans nouveau flux de souscription.

## Assets fournis et dérivés

Références utilisateur : `charteV.png`, `logoV.png`, `pitouSPORT.png`, `pitouVF.png`, maquette manager « Image ChatGPT 3 oct. 2026 à 05_29_36.png » et maquette coach « Tableau de bord Velatra pastel.png ».

- `public/brand/desktop/velatra-logo.png` : copie exacte du logo fourni.
- `public/brand/desktop/pitou-copilot.png` : illustration RGBA générée avec l’outil imagegen intégré, à partir de `pitouVF.png` (identité canonique) et de la maquette coach (pose laptop). Pas d’appel IA dans l’application. Asset utilisé uniquement pour la présentation desktop, réutilisé dans le widget conseil.

Prompt final de génération :

> Use case: background-extraction / identity-preserve. Create a production UI asset as a genuinely transparent RGBA cutout of the EXACT Pitou mascot from the references, cheerful deep indigo-purple little fox companion, oversized ears, ivory face and belly, purple eyes, blue-violet-pink lightning emblem on belly. Reference 1 is the canonical character identity; reference 2 is the desired laptop pose. Extract/reconstruct only Pitou leaning with both paws beside an open slim lavender laptop, warmly smiling at the viewer, matching the premium softly lit 3D mascot in reference 2. Laptop screen back faces the viewer and has the colored Velatra lightning emblem. Full complete silhouette with ears, paws and laptop contained, small soft contact shadow. Wide 4:3 composition with mascot and laptop occupying almost all image, transparent all around. No background scene, no desk beyond small contact shadow, no text, no dashboard/UI, no humans, no additional characters. Preserve Pitou identity and the referenced colors faithfully. Intended as the right-side illustration of desktop dashboard hero.

## Validation et extension

Commandes de validation :

```sh
npm run lint
npm run build
node --import tsx --test tests/productExperience.test.ts tests/appShellHelpers.test.ts tests/roleFormatExperiences.test.ts
node scripts/qa/role-format-experiences-browser.mjs
VELATRA_DESKTOP_QA_ONLY=true node scripts/qa/role-format-experiences-browser.mjs
git diff --check
```

Les deux modes navigateur utilisent RootApp avec fixtures Firebase et bloquent les requêtes externes. Ils doivent s’exécuter séquentiellement (répertoire temporaire partagé). Le mode desktop couvre quatre expériences à 1024, 1280, 1440, 1600 et 1920 px, chargement des assets, absence de débordement, cibles d’action de 44 px, palette du hero, navigation, menu profil et retour de focus, isolation des documents et restrictions financières ; il vérifie aussi phone/tablet. Le mode complet conserve les scénarios d’actions métier, pagination/recherche, autorisations et suspension. La CI Mobile browser regression exécute également les deux modes et conserve leurs preuves.

Pour étendre la DA : réutiliser les composants de présentation et tokens pour les pages Clients, CRM/Ventes, Équipe, Planning et Drive. Le shell et les primitives partagées sont déjà harmonisés ; les vues métier internes n’ont pas été restructurées. Les illustrations sont statiques ; une optimisation d’asset pourra être faite séparément. Le build peut conserver l’avertissement existant sur les gros chunks JavaScript.
