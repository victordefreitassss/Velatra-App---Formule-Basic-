# Member Mobile First — audit initial, 27 septembre 2026

HEAD et origin/main vérifiés après fetch : `dcba89361f9f00ecc1334209b7cef6f87d7fe824`. Rapports Member Experience V2 et Workout Excellence relus. État initial propre. Note qualitative mobile : **7/10**, avec un workout sensiblement plus abouti que les écrans périphériques.

Inspection en navigateur réel avec dimensions émulées 375×812, 390×844, 430×932 : captures et arbres d'accessibilité, ouverture des formulaires et navigation. Compte fictif Robin, brouillon conservé, 3 séances, puis fixtures locales d'un coach attribué, d'un message, d'un plan nutritionnel et d'un document. Aucune donnée de production. Le bandeau Firebase des émulateurs recouvre une partie de la navigation : artefact QA identifié, pas défaut de production. Aucun clavier logiciel ou pouce physique testé.

## Mission et hiérarchie par écran

| Écran | Mission / action | Observation avant modification |
|---|---|---|
| Accueil | S'entraîner / commencer ou reprendre | Action reconnaissable immédiatement, mais double avatar, date/streak, haut de page et cartes repoussent la progression. |
| Séances | Reprendre puis anticiper | Action claire ; programme occupe une grosse carte ; terminées réduites à un lien. |
| Workout | Voir, saisir, valider | Champs et CTA visibles aux trois tailles, bonne référence et reprise ; conserver toute la logique. |
| Progression | Comprendre ses progrès | Compteurs puis historique ; progression par exercice enfouie dans les analyses. Trop de cartes imbriquées. |
| Nutrition sans plan | Comprendre l'attente / contacter le coach | Grande zone vide et deuxième carte pour une seule explication/action. |
| Nutrition avec plan | Noter son repas | Quatre cartes de macros et deux assistants IA précèdent les repas ; contrastes bleus/jaunes faibles ; action hors premier écran. |
| Messages | Échanger avec son coach | Composition présente, mais topbar en trois rangées, identité surdimensionnée, gris/vert peu cohérents ; pas de prochaine action sans affectation. |
| Plus | Retrouver les fonctions secondaires | Un groupe par entrée avant Plus ; Messages sous le pli. Sheet existante appropriée, architecture à conserver. |
| Profil | Consulter / modifier | Avatar 128 px et badges internes ; formulaire long, sauvegarde uniquement en haut, pas d'annulation évidente. |
| Objectifs | Retrouver son objectif | Même destination que profil : objectif après identité, physique et entraînement ; aucune prochaine étape. |
| Documents | Lire ce que partage le coach | « Drive Intégré », texte parlant de clients et d'import à un adhérent ; table et actions au survol inadaptées au tactile. |
| Historique | Retrouver une séance | Gros pictogrammes, uppercase/italique, badges ; date secondaire, absence de détail directement lisible. |
| Infos club | Contacter / horaires | Texte destiné au coach, gros espaces et horaires vides sans explication. |
| Velatra AI | Poser une question | Double en-tête Discussions/AI, avertissement long toujours affiché, hauteur minimum fixe ; personnage officiel conservé. |

Le critère « visible en trois secondes » est une appréciation de la première zone affichée, pas une étude chronométrée auprès d'utilisateurs. Les pages secondaires et Nutrition ne l'atteignent pas convenablement. L'empilement et la densité donnent encore une impression de site responsive.

## Top 15, par priorité

Pas de P0 reproduit dans le périmètre UX. Les données de séance et la reprise fonctionnent.

1. **P1** Nutrition : noter un repas arrive après six blocs secondaires.
2. **P1** Macros : chiffres/labels clairs sur surfaces claires, contraste insuffisant visuellement.
3. **P1** Documents : actions de lecture au survol et table compressée.
4. **P1** Profil : enregistrement loin des derniers champs, annulation absente.
5. **P1** Conversations : hauteur disponible réduite par le shell et minimums fixes.
6. **P2** En-tête adhérent : titre, onglets et outils répartis sur trois lignes.
7. **P2** Accueil : double identité et gamification avant la séance.
8. **P2** Accueil : succession de containers pour des informations simples.
9. **P2** Progression : historique avant comparaison d'exercice utile.
10. **P2** Objectifs : objectif sous plusieurs écrans d'informations personnelles.
11. **P2** Plus : Messages placé après les outils moins fréquents.
12. **P2** Séances : en cours / à venir / terminées insuffisamment distincts.
13. **P2** États vides : Documents parle aux coachs ; Messages sans affectation sans action de contact.
14. **P3** Historique : grandes cartes, majuscules et italique inutiles.
15. **P3** AI et infos club : textes/espaces superflus, hiérarchie et vocabulaire à simplifier.

## Périmètre de correction

Styles strictement adhérent dans le shell ; composants dédiés ou branches adhérent dans les pages partagées. Aucune modification de rôle, API, collection, règle, logique de séance ou design coach. Réemploi des helpers de performances pour les comparaisons factuelles. Pas de nouvelle dépendance UI ni nouvelle IA. Recette finale avec et sans données, tailles mobiles puis tablette/desktop et contrôle coach.
