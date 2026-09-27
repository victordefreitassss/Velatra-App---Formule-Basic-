# Velatra — Visual Excellence Pass

HEAD initial : `46c63755e3f98e90805f0468234ac442c022b55a`.

## Audit visuel préalable

Parcours réels sur HTTP local et émulateurs Firebase : login desktop/mobile, démarrage coach, accueil coach avec quatre adhérents, liste membres, ajout adhérent, dossier adhérent, éditeur, bibliothèque vide, onboarding adhérent, accueil adhérent et Velatra AI. Les données de QA sont locales et fictives. Aucun audit technique global ni réactivation d’intégration externe.

| Priorité | Écran | Défaut observé et impression produite | Correction réalisée | Impact |
| --- | --- | --- | --- | --- |
| 1 | Accueil coach | Navigation secondaire et métriques devant les séances : lecture de tableau générique | Agenda prioritaire, raccourcis compacts, suppression du doublon d’actions | Fort |
| 2 | Démarrage coach | Deux grands blocs empilés, prochaine action peu distincte | Composition action/checklist en deux colonnes sur desktop | Fort |
| 3 | Membres | Colonnes de titres désalignées avec les lignes | Grille commune avec largeur d’action fixe, lecture mobile explicite | Fort |
| 4 | Dossier | Nom en capitales italiques, grande initiale ombrée et identité répétée | Identité typographique calme, objectif et statut lisibles | Fort |
| 5 | Dossier | Cartes IA démesurées devant les notes | Outils secondaires dans une section dépliable, fonctions conservées | Fort |
| 6 | Éditeur | Titre mobile coupé en plusieurs lignes, trop de réglages visibles | En-tête stable, métadonnées compactes, réglages rapides dépliables | Fort |
| 7 | Programmes | PRESETS / Templates, capitales et cartes peu denses | Microcopie métier et cartes plus compactes | Moyen |
| 8 | Accueil adhérent | Suivi du jour trop étalé, accents chromatiques concurrents | Grille desktop, palette unifiée et séance dominante | Fort |
| 9 | Login / IA | Login mobile encombrant, discussion desktop trop large | Proportions plus légères et largeur de lecture plafonnée | Moyen |
| 10 | Compagnon / surfaces | Mouvement perpétuel au repos, ombres variables | Compagnon immobile au repos et surfaces solides cohérentes | Moyen |

## Périmètre conservé

Architecture V2, Glass Rail, Liquid Nav, palette, Outfit/Inter, logo original. Aucun changement serveur, Firebase Rules, création d’adhérent, transactions, idempotence, Gemini, Stripe ou email. Aucun nouveau framework ni bibliothèque UI.

## Écrans modifiés — avant / après

| Écran | Avant | Après |
| --- | --- | --- |
| Connexion | Personnage pâle, proportions mobiles plus encombrantes | Halo derrière le dessin, compagnon mobile 74 px, ombre du panneau allégée, structure conservée |
| Accueil coach actif | Agenda après les métriques, répétition des urgences, raccourcis volumineux | Agenda prioritaire, une seule liste de priorités incluant les messages, raccourcis horizontaux, largeur plafonnée à 1320 px |
| Démarrage coach | Action et checklist empilées sur desktop | Prochaine action à gauche, parcours à droite ; empilement lisible sur mobile, progression existante conservée |
| Membres | En-têtes et lignes désalignés | Colonnes communes, cartes mobiles avec activité explicite, action de réinitialisation de recherche |
| Dossier adhérent | Identité répétée, nom en capitales italiques, outils IA devant les notes | Sidebar plus sobre, programme et repères de suivi d’abord, outils IA dépliables, notes rapidement accessibles |
| Éditeur | Titre mobile cassé, sauvegarde très vive, raccourcis toujours ouverts | En-tête stable, sauvegarde vert profond, nom complet dans son champ, métadonnées compactes, réglages rapides dépliables |
| Modèles | PRESETS / TEMPLATE, actions en italique et cartes peu denses | Vocabulaire français, cartes compactes, badges neutres ; attribution dans un dialog natif avec focus et Échap |
| Accueil adhérent | Check-in étalé et couleurs concurrentes | Humeur, eau et sommeil alignés sur desktop ; palette verte cohérente, séance principale conservée |
| Velatra AI | Conversation trop large et saisie basse | Largeur maximale 1040 px, lignes de conversation limitées, saisie dans le viewport, champs et envoi nommés |
| Messagerie | Écran vide sans explication, faux libellé « En ligne », saisie sous la navigation, marge négative débordante | État vide explicatif, « Conversation privée », saisie remontée, débordement supprimé |
| Nutrition | « Aucun plan » à 50 % d’opacité | Statut sans réduction d’opacité |
| Performances | Titre décoratif, état sans scan presque invisible | « Mes performances », message lisible et accès au suivi d’évolution |

## Design system

- Outfit pour les titres ; Inter pour les contenus et contrôles. Réduction ciblée des capitales, italiques, graisses extrêmes et espacements de lettres.
- Surfaces de données solides ; ombres des cartes supprimées. Glass réservé à la navigation et aux overlays existants.
- Quatre familles visuelles de boutons : principal, secondaire, discret, danger. Les noms historiques `success`, `blue` et `glass` restent acceptés comme alias secondaires pour ne pas casser les écrans existants.
- Badges plus sobres : succès vert sombre, attention ambre sombre, neutres gris. Le badge bleu historique devient neutre.
- Classes locales dans `components/visual-polish.css`. Aucun nouveau `!important` dans ce fichier. Deux règles de shadow déjà existantes ont été allégées dans `app-shell.css`.
- Fermetures de modales lisibles, cibles de 44 px sur les contrôles retouchés ; arrière-plan de modale vert sombre translucide.

## Personnage Velatra

Dessin existant conservé : cheveux bruns, yeux verts, hoodie vert. Aucun remplacement du personnage ou du symbole original.

Tailles inspectées ensemble dans une planche locale : **54, 74, 82, 90, 112, 118 et 190 px**. Contrôles dans les contextes réels : login, démarrage coach, bibliothèque vide et discussion IA. À 54 px, le visage reste identifiable, mais ses détails sont naturellement moins perceptibles.

Le halo était peint devant le SVG : il est désormais derrière, ce qui restaure la couleur et la netteté du visage. Le repos ne déclenche plus de mouvement perpétuel. Les réactions courtes restent présentes et `prefers-reduced-motion` reste pris en compte. Les réactions de succès et de salut existantes ne sont pas entièrement ramenées à 350 ms pour préserver leur geste.

La planche reproductible est dans `scripts/qa/visual-gallery.html` ; elle utilise le composant réel et n’est pas incluse dans l’entrée de build de production.

## Responsive et recette visuelle

Dimensions exercées dans le navigateur :

- 375 × 812, 390 × 844, 430 × 932.
- 768 × 1024, 820 × 1180.
- 1024 × 768, 1100 × 800, 1280 × 800, 1440 × 900, 1728 × 1117, 1920 × 1080.

Mesures DOM de largeur et de débordement sur les onze tailles pour la connexion, les deux états d’accueil coach, Membres, le dossier adhérent, l’éditeur, la bibliothèque, l’accueil adhérent, Velatra AI et la conversation coach. Aucun débordement horizontal de page détecté à l’issue de la passe. La messagerie débordait initialement de 3 px à droite : sa marge négative a été supprimée puis les onze formats ont été retestés. Les listes d’onglets et filtres conservent leur défilement horizontal interne intentionnel.

Les mesures ne remplacent pas les captures. Les contrôles visuels manuels ont couvert :

| Écran | Formats réellement inspectés visuellement après modification |
| --- | --- |
| Connexion | 390 et 1440 |
| Accueil coach actif | 430 et 1440 |
| Démarrage coach | 390 et 1440 |
| Membres / sans résultat / sans adhérent | 390 et 1440 |
| Dossier adhérent | 390, 768 et 1440 |
| Ajout adhérent | 430 ; desktop également contrôlé lors de l’audit préalable |
| Éditeur | 375, 820, 1024, 1440 et 1920 |
| Bibliothèque vide et carte de modèle | 390 et 1440 |
| Attribution d’un modèle | 375 et 1440 |
| Accueil adhérent | 390 et 1440 |
| Velatra AI | 390 et 1440 |
| Messagerie | 375 et 390 ; mesures desktop jusqu’à 1920 |
| Nutrition | 1440 |
| Performances sans mesures | 390 et 1440 |

Je ne présente donc pas cette recette comme une capture manuelle de chaque écran à chacune des onze tailles, ni comme un test sur onze appareils physiques.

Autres écrans inspectés et conservés : planning vide, Documents vide, CRM sans prospect, galerie d’évolution. Les actions existantes du planning et des documents sont suffisamment visibles. Le CRM garde son pipeline et son bouton d’ajout ; son vocabulaire « Lead » / « Glissez ici » pourra être affiné dans une passe secondaire.

Vérifications interactives effectuées :

- Recherche sans résultat puis « Réinitialiser les filtres » : liste restaurée.
- Ajout adhérent : ouverture, focus initial et fermeture par Échap.
- Attribution : ouverture, Tab vers la recherche, Échap, retour au contenu.
- Dossier : dépliage des outils IA, fermeture et ouverture du programme.
- Éditeur : réglages rapides, sauvegarde effective d’un programme local puis retour à la liste.
- Performances : « Voir mon évolution » mène à la galerie existante.
- Connexion réelle aux comptes coach neuf, coach actif et adhérent, dans les émulateurs.

## Accessibilité

Noms accessibles ajoutés aux recherches/filtres concernés, à la fermeture du dossier, à la suppression/duplication de modèle et à l’envoi de messages. La fenêtre d’attribution utilise désormais `dialog.showModal()`, ce qui fournit la modalité native et la gestion du clavier. La fiche adhérent annonce son rôle et son titre ; son focus trap historique n’a pas été entièrement reconstruit.

Contrastes de référence : blanc sur vert principal `#17452f` **10,89:1** ; texte `#18181b` sur blanc **17,72:1** ; texte secondaire `#59695f` sur blanc **5,82:1**, sur ivoire `#f7f8f2` **5,45:1**. Les couleurs calculées du dossier et du bouton Programme ont été vérifiées dans le DOM rendu, en complément des captures.

Ce sont des vérifications ciblées, pas une certification WCAG complète. Les états secondaires non rencontrés et toutes les combinaisons de données réelles ne sont pas couverts. Les contrôles déjà désactivés gardent leur présentation atténuée.

## Performance

Aucune dépendance ajoutée et aucun changement de lockfile. Le gros chunk applicatif passe d’environ **797,25 kB / 193,32 kB gzip** à **796,96 kB / 193,31 kB gzip**. La différence est négligeable ; cette passe ne résout pas le poids historique du bundle. Le build conserve son avertissement de chunk supérieur à 500 kB. Aucun score Lighthouse ou gain de Core Web Vitals n’est revendiqué.

## Validations

- `npm run lint` : réussi (TypeScript sans émission).
- `npm run build` : réussi.
- `npm test`, avec les émulateurs Firebase locaux : **57 réussis, 0 échec, 0 ignoré**.
- Smoke HTTP local : réussi, incluant connexion, création d’adhérent, répétition de requête, programme persisté, refus inter-clubs et séance atomique.
- `git diff --check` : réussi.
- API, règles Firebase, authentification, transactions, idempotence, dépendances et lockfile : aucun diff dans cette passe.

Les erreurs `PERMISSION_DENIED` attendues par les tests de refus d’accès ne sont pas des échecs. Les données utilisées pour les captures sont fictives, uniquement dans `demo-velatra`. Les fixtures ont été restaurées après les tests.

## Commits de code

| SHA | Description |
| --- | --- |
| `046aeb8` | Surfaces, hiérarchie des boutons, clarté du compagnon et proportions du login |
| `6bac533` | Priorités du dashboard coach, démarrage et densité du suivi adhérent |
| `7b9341a` | Liste et dossier adhérent, éditeur et modèles de programmes |
| `40b0e52` | Discussions, saisie mobile et états vides lisibles |

## Publication

Les quatre commits de code ont été poussés directement sur `main`. Vercel a confirmé **success** pour `40b0e52` : [déploiement vérifié](https://vercel.com/victordefreitassss-projects/velatra-app/HnPcVPEJYzyWQCnZBguNNs9oHu8z). Les contrôles de disponibilité ont répondu HTTP 200 pour `/` et `/login`, et HTTP 401 pour `/api/member/assigned-coach` sans authentification. Aucun test connecté n’a écrit de données en production. Ce rapport est ajouté dans un commit documentaire distinct.

## Auto-évaluation honnête

| Critère | Note / 10 | Appréciation |
| --- | --- | --- |
| Identité | 9 | Palette, logo, typographies et personnage préservés ; visage plus net |
| Cohérence | 8 | Surfaces et boutons harmonisés ; styles historiques encore présents sur des pages secondaires |
| Hiérarchie | 8,5 | Agenda et suivi métier prioritaires ; outils secondaires moins envahissants |
| Densité | 8 | Meilleure utilisation du desktop, éditeur plus calme |
| Mobile | 8 | CTA et saisie plus accessibles ; certains filtres demandent encore un défilement horizontal |
| Desktop | 8,5 | Largeurs plafonnées et dossiers mieux structurés |
| États vides | 8 | Actions et explications ajoutées là où elles manquaient ; CRM perfectible |
| Motion | 8 | Repos statique, interactions brèves ; animations historiques secondaires conservées |
| Impression premium | 8 | Plus sobre et crédible, sans prétendre que chaque page atteint le même niveau de finition |

## Volontairement inchangé

Homepage et site marketing, architecture V2, Glass Rail, Liquid Nav, navigation des rôles, fonctions métier et services externes. Pas de nouvelle clé Gemini, pas de reconstruction email, pas de nouvelle intégration Stripe, pas de publication de règles Firebase. Les appels Gemini réels restent indisponibles sans clé ; l’interface a été vérifiée sans demander de secret ni prétendre avoir validé une réponse IA réelle.

La qualité visuelle des parcours prioritaires progresse. Cela ne signifie pas que l’application est intégralement prête à être commercialisée, ni que tous les états et tous les navigateurs ont été certifiés.
