# Velatra — architecture de navigation

Base initiale : `feaf4e24d626a0f1065961db2d98ff63c4a0420f`. Sources : [Master Feature Map](VELATRA-MASTER-FEATURE-MAP.md), [Responsive Capability Map](VELATRA-RESPONSIVE-CAPABILITY-MAP.md), [Product Capabilities](VELATRA-PRODUCT-CAPABILITIES.md).

## Contrat

`components/appShellHelpers.ts` est la table commune des espaces, sous-pages et actions Créer. `Layout`, la recherche et les menus mobiles consomment les mêmes destinations filtrées par `getProductCapabilities`. `state.page` reste le mécanisme de routing de `/dashboard` ; déplacer une page dans l’interface ne change pas son identifiant. Les changements de page du shell ajoutent une entrée dans l’historique de `/dashboard` pour que Retour/Avancer restaure la page précédente. Les autorisations sur chaque donnée restent contrôlées par l’API et les règles Firebase. La largeur ne participe jamais aux droits.

Le catalogue retire des menus les fonctions non implémentées comme les campagnes. Les destinations historiques continuent à être interprétées dans leur espace pour les états déjà ouverts ; cela ne rend pas disponible une capacité absente. Les pages métier conservent leurs contrôles propres.

## Espaces coach et propriétaire

| Espace principal | Destination d’entrée | Sous-pages et accès contextuels |
| --- | --- | --- |
| Accueil | `home` | Pilotage quotidien, checklist et messages existants |
| Clients | `users` | Dossier, recherche, messages `chat`, invitation ; affectation dans le dossier si autorisée |
| Coaching | `coaching` | Programmes `presets`, nutrition, documents `drive`, exercices, historique |
| Planning | `calendar` | Calendrier et réservations déjà présents |
| Business | `crm_pipeline` | Tâches et relances `crm_tasks`, finances `crm_finances` |

La fiche du club, les paramètres et les guides vivent dans le contexte compte/aide, accessible par le profil, le menu de rubriques sur téléphone et la recherche. Ils ne forment pas une sixième destination. Le menu Créer est issu du même catalogue : adhérent, modèle de programme, prospect, invitation. Il n’apparaît pas pour l’adhérent ni pour la console administrateur. Le bouton historique sans effet « À rappeler avant » a été retiré de la page Relances.

## Espaces adhérent

| Espace principal | Entrée | Sous-pages |
| --- | --- | --- |
| Accueil | `home` | Séance du jour, reprise, check-in existants |
| Séances | `calendar` | Réservation `planning` si activée, historique |
| Progression | `performances` | Évolution et photos |
| Nutrition | `nutrition` | Plan et journal existants |
| Plus | Ouvre le volet sur téléphone ; `profile` ailleurs | Profil, messages, documents, infos club, IA configurée, boutique existante |

Plus regroupe des fonctions secondaires dans une seule liste courte, sans montrer le CRM, les finances coach ou l’administration. La console superadmin conserve son espace distinct.

## Matrice de navigation

O = owner ; C = coach ; M = member ; A = superadmin dans sa console. Le type Legacy signifie `accountType` absent/invalide, sans inférence. Les capacités Studio du catalogue sont évaluées avec leurs activations existantes.

| Destination | Rôle | Account type | Capability | Phone | Tablet | Desktop |
| --- | --- | --- | --- | --- | --- | --- |
| Accueil | O/C/M | Solo/Studio/Legacy | cœur | Barre basse | Rail compact | Rail |
| Clients | O/C | Solo/Studio/Legacy | clients | Barre basse, dossier par étapes existant | Rail + sous-pages | Rail + sous-pages |
| Coaching | O/C | Solo/Studio/Legacy | coaching/programs | Barre basse + sélecteur de sous-page | Rail + tabs | Rail + tabs |
| Planning | O/C | Solo/Studio/Legacy | planning | Barre basse | Rail + calendrier | Rail + calendrier |
| Business | O/C | Solo/Studio/Legacy | crm/finances | Barre basse, relances en sous-page | Rail + sous-pages | Rail + sous-pages |
| Séances | M | Solo/Studio/Legacy | programs/planning | Barre basse | Rail + sous-pages | Rail + sous-pages |
| Progression | M | Solo/Studio/Legacy | progress | Barre basse | Rail + sous-pages | Rail + sous-pages |
| Nutrition | M | Solo/Studio/Legacy | nutrition | Barre basse | Rail | Rail |
| Plus | M | Solo/Studio/Legacy | chaque entrée selon catalogue | Volet | Rail + sous-pages | Rail + sous-pages |
| Équipe | O/A | Studio si activation ; Legacy selon flag historique | teamManagement | Paramètres | Paramètres | Paramètres |
| Affectation coach | O/A | Studio ; Legacy | coachAssignments | Dossier client | Dossier client | Dossier client |
| Paramètres, club, aide | O/C selon action | Solo/Studio/Legacy | contrôle propre de la page | Menu rubriques/profil | Profil/recherche | Profil/recherche |
| Admin | A | propre à la console | rôle vérifié côté serveur | Console | Console | Console |

Les sous-pages restent atteignables depuis leur espace, la recherche et le menu de rubriques. La recherche utilise uniquement les destinations offertes par le catalogue. Les anciens `state.page` `exercises`, `history`, `marketing`, `crm_tasks`, `drive`, etc. ne sont pas renommés ; `marketing` est conservé techniquement mais n’est plus proposé car ses campagnes ne sont pas implémentées.

## Solo, Studio et Legacy

- **Solo** : les cinq espaces coach restent présents ; les contrôles d’équipe et d’affectation sont retirés de l’interface à partir de `teamManagement` et `coachAssignments`. Aucune réécriture du club.
- **Studio** : mêmes espaces ; l’équipe reste dans Paramètres et les affectations dans le dossier client. Le flag bêta `canAddStaff` continue de régir le formulaire. Les capacités fictives n’apparaissent pas.
- **Legacy** : mêmes destinations historiques, aucune supposition Solo/Studio. Les flags et autorisations existants demeurent. Aucune migration de données.

L’API historique de création staff pour un owner n’est pas modifiée ici. Sa séparation du flag d’interface est documentée dans [Product Capabilities](VELATRA-PRODUCT-CAPABILITIES.md) et nécessite une décision métier explicite avant un futur contrôle commercial serveur.

## Présentation selon le format

- **320–767 px** : cinq entrées basses au maximum, avec safe areas. Le coach ouvre les rubriques secondaires dans un seul volet depuis le haut ; une sous-page se choisit dans un sélecteur natif. L’adhérent utilise Plus pour ses fonctions secondaires. Les tableaux longs restent propres à chaque page.
- **768–1023 px** : rail compact permanent et sous-navigation contextuelle ; pas de seconde barre basse. L’espace sert au travail de consultation, programmation, CRM et planning en portrait ou paysage.
- **1024 px et plus** : rail et sous-navigation existants, recherche clavier et Créer. Les pages restent libres d’utiliser liste/détail et surfaces plus riches sur 1440–2560 px. Les formulaires gardent leurs contraintes de largeur.

Le menu secondaire est une boîte de dialogue avec retour du focus et fermeture Escape. La destination active utilise aussi `aria-current` et un style distinct. Les transitions du shell respectent `prefers-reduced-motion`. Le chargement local, le préchauffage borné et le mode séance/éditeur sont conservés.

## Vérification locale

La recette navigateur a utilisé des comptes fictifs et une API/Firebase locale de démonstration, sans données de production. Les cinq espaces principaux ont été contrôlés pour owner Solo, owner Studio, coach Studio, member et owner Legacy aux 15 dimensions demandées, de 320×568 à 2560×1440. Des états secondaires ont aussi été contrôlés : CRM, Planning, Clients, Séances, Réserver, Drive et Relances. Aucun de ces états ne produit de débordement horizontal global après la correction de l’en-tête Drive. Le menu Plus adhérent, la sous-navigation Coaching, l’accès aux Paramètres, le menu Créer, la recherche sans Campagnes et le retour arrière navigateur ont été exercés par interaction. La recette ne prouve pas le rendu sur des appareils physiques ni les intégrations externes.

## Limites et suite

Cette passe stabilise les chemins d’accès et le shell. L’édition avancée par étapes, les vues liste/détail métier très larges, la profondeur du dossier client, du builder, du CRM et de la finance relèvent du Prompt 3 et des missions métier ultérieures. Les états réels Stripe, Gemini, SMTP et les appareils physiques ne sont pas certifiés par une recette de navigation sur données fictives.
