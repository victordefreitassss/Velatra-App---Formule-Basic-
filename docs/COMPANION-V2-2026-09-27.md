# Compagnon Velatra — pack officiel v2

## Source et périmètre

HEAD initial réel de main : `aa8b4cb61103399f399d86c6de63f8a4a31420a4`, récupéré avant modification. La copie locale précédente était `ad23794` ; elle a été avancée sans conflit.

Source unique : `velatra-companion-pack-v2.zip` fourni par Victor. Inventaire du ZIP contrôlé avant extraction : cinq WebP, composant TSX, README et aperçu PNG. L’aperçu présente aussi une pose « working », absente des fichiers fournis : aucune approximation ajoutée.

Le composant livré sert de base. L’ancien portrait embarqué en base64 et son cadrage CSS sont retirés. Aucun dessin, génération, conversion, redimensionnement des fichiers ou recompression.

## Assets installés

Dans `public/brand/companion/` :

| Fichier | Dimensions originales | Octets |
| --- | --- | --- |
| vela-idle.webp | 554 × 551 | 34 660 |
| vela-wave.webp | 547 × 545 | 37 788 |
| vela-thinking.webp | 554 × 543 | 33 956 |
| vela-success.webp | 547 × 542 | 38 096 |
| vela-celebrate.webp | 547 × 533 | 32 874 |

Transparence confirmée pour les cinq images ; comparaison binaire avec le ZIP : cinq identiques. Total : 177 374 octets. L’asset celebrate est disponible mais n’est pas chargé ni affiché par défaut. L’état error utilise l’image thinking et un badge « ! », comme le composant fourni.

## Intégration et cadrage

- Login : 170 px desktop/tablette dès 768 px ; 74 px mobile.
- Onboarding coach : 82 px au repos ; 84 px pour le succès de démarrage existant.
- Assistant : 74 px dans l’accueil ; 54 px pendant une génération. L’en-tête avec personnage est masqué pendant le chargement pour éviter le doublon.
- Bibliothèque vide : 112 px.
- Programme adhérent absent : 118 px.
- Toutes les images : object-contain, ratio conservé, hauteur réservée à 1,08 × la largeur, aucun masque ni crop additionnel. Cheveux, visage et main levée conservés. Le bas du buste reste celui du fichier original.
- Ombre douce issue du composant livré ; aucun cadre blanc ajouté.
- Préchargement de la seule pose idle à l’ouverture du login. Les autres états se chargent lorsqu’ils sont affichés.

## Animation et accessibilité

- idle : respiration de 0,6 % sur 5,6 secondes.
- wave : mouvement de 0,8 seconde ; interaction clavier/souris, puis retour au repos.
- thinking : déplacement vertical de 2 px et trois points discrets.
- success : mouvement positif bref et badge ✓.
- error : micro-secousse de 1,5 px et badge !.
- Badges redimensionnés aux petites tailles et positionnés hors du visage.
- Décoratif : aria-hidden et alt vide. Interactif : bouton natif, nom accessible et focus visible.
- prefers-reduced-motion : transformations neutralisées, points statiques, auto-salut désactivé. Branche relue dans le code ; préférence système non basculée pendant la QA.
- Aucun changement de visage, cheveux, yeux ou hoodie. Le salut est une pose du pack animée globalement, pas une nouvelle animation articulée.

## QA visuelle réalisée

Chrome a été demandé mais l’outil indique qu’il n’est pas disponible dans cette session. Contrôle effectué dans le navigateur intégré Codex, sur l’application locale avec émulateurs et comptes fictifs.

Login inspecté visuellement dans les neuf formats :

- 375 × 812
- 390 × 844
- 430 × 932
- 768 × 1024
- 820 × 1180
- 1024 × 768
- 1280 × 800
- 1440 × 900
- 1920 × 1080

Cheveux et visage visibles, aucune image étirée, compagnon mobile discret. Salut déclenché au clavier : état wave observé.

Autres écrans inspectés :

- onboarding coach à 1440 × 900 ; compagnon idle 82 px ;
- modèles de programmes vides à 1440 × 900 et 390 × 844 ;
- séances adhérent sans programme à 1440 × 900 et 390 × 844 ;
- Velatra AI au repos à 1440 × 900 et 390 × 844 : un seul compagnon, image 74 px, object-fit contain confirmé.

Galerie locale : `/scripts/qa/visual-gallery.html`. Cinq états × six tailles (54, 74, 90, 112, 150, 190 px), fonds clair/sombre et bouton de rejeu. Les trente combinaisons ont été examinées. Galerie protégée par DEV + localhost, absente des entrées du build et des fichiers dist.

Un refus de lecture local a été rencontré : le serveur QA héritait d’un identifiant de base isolée depuis l’environnement de développement. Relance locale avec `VITE_FIREBASE_FIRESTORE_DATABASE_ID=''` pour utiliser la base par défaut des émulateurs : accès adhérent rétabli. Aucun fichier Firebase, règle ou donnée de production modifié.

## Validation technique

- `npm run lint` : TypeScript valide.
- `npm run build` : réussi ; avertissement existant sur un chunk supérieur à 500 kB.
- `npm test` avec les trois émulateurs : 57 réussis, 0 échec, 0 ignoré.
- Smoke HTTP local existant : réussi après restauration des fixtures.
- `git diff --check` : valide.
- SHA/comparaison binaire : tous les WebP identiques au ZIP.

## Limites

- Pas de validation dans Chrome, ni sur appareils physiques.
- Génération Gemini réelle non déclenchée : aucune clé Gemini configurée dans le serveur QA. Thinking et error vérifiés dans la galerie ; branche de chargement de l’assistant inspectée dans le code.
- Le succès complet de l’onboarding n’a pas été rejoué ; pose success contrôlée en galerie et usage 84 px conservé.
- Toutes les pages ne sont pas testées dans chacun des neuf formats : le login l’est ; les autres contrôles sont détaillés ci-dessus.
- Aucun engagement de refonte du login, de l’onboarding, de la navigation, du backend ou de la direction artistique : modifications limitées au compagnon.

Le commit final et le résultat Vercel sont fournis dans le compte-rendu de livraison après publication.
