# Expérience adhérent V2

## Architecture

Les cinq racines restent Accueil, Séances, Progression, Nutrition et Plus. Le téléphone est le format principal (320–430 px) avec bottom navigation et zone sûre. La tablette garde des cibles tactiles et peut disposer deux blocs côte à côte. Le desktop utilise une largeur contrôlée et deux colonnes légères sur l'accueil ; les écrans très larges n'étirent pas les contenus à pleine largeur. Les pages secondaires conservent leurs `state.page` et leurs contrôles de capacité existants.

## Accueil et priorités

L'entrée de séance conserve le moteur `MemberWorkoutEntry`, y compris le brouillon à reprendre. Un programme ou brouillon place cette action avant le suivi. Sans séance, le suivi apparaît d'abord, puis un état de préparation du programme donne accès aux Messages. Viennent ensuite le prochain rendez-vous, la phase et l'objectif en cours, le contact coach, puis un résumé réel des sept derniers jours. Les bilans, habitudes et phase viennent de `/api/followup/me` ; leurs erreurs restent locales et ne bloquent pas le reste de l'accueil. Quand une séance est disponible, les boutons de suivi sont secondaires. Aucune métrique de progression fictive n'est ajoutée.

Le **Coach Check-In** est un questionnaire assigné, remis au coach. Les **habitudes** sont validées séparément en une action pour les booléens ou avec une valeur pour les mesures. Le **suivi quotidien rapide historique** (eau, sommeil, protéines, humeur, XP/streak) reste distinct et ses données existantes sont préservées. Il est placé dans un panneau replié pour éviter trois formulaires concurrents sur l'accueil. Les éventuels doublons de questions appartiennent à des routines différentes ; le coach doit éviter de configurer la même question plusieurs fois.

## Séances, planning et progression

Séances présente la séance à démarrer/reprendre, trois réservations au maximum avec type, heure, coach et statut, le programme et sa prescription, puis l'historique chronologique. Les références aux exercices archivés restent résolues par ID. Réserver et gérer une réservation ouvre Planning V2, dont les crédits, limites, capacités et annulations restent inchangés. Le moteur de séance et son feedback de fin ne sont pas modifiés.

Progression montre les phases du parcours en lecture seule, leur statut et la prochaine étape, puis les comparaisons et mesures existantes. Un lien ouvre `EvolutionGallery` pour les photos. Les séances détaillées restent dans l'historique de Séances au lieu d'être répétées ici. L'objectif principal provient toujours de `User.objectifs` ; aucun nouveau moteur d'objectifs n'est créé.

## Nutrition, Plus et communication

Nutrition montre le jour, l'action pour noter un repas, les calories et repères de macros visibles, puis le journal. Sans plan, l'état vide invite à écrire au coach. Les données et règles de la nutrition ne changent pas. Plus regroupe Messages, Profil, Documents, Infos du club et Velatra AI (uniquement si sa capacité est active). La conversation reste dans Messages et le référent Solo/Studio est résolu par `/api/member/assigned-coach`. L'IA reste explicite et secondaire ; l'accueil ne lance plus de requête Gemini automatique.

## Retiré de l'accueil et reporté

Les éléments Boutique/commandes, newsletter, graphique de « fatigue » fondé uniquement sur la date des séances, conseil IA automatique, écriture dans le feed pour chaque suivi et célébration confetti/niveau ont été retirés de cette surface. Ils concurrençaient les actions de coaching, certains étant trompeurs ou non livrés. Leurs données historiques ne sont pas supprimées. Les pièces jointes Messages en data URL et la restructuration profonde de Nutrition/Profile restent des chantiers séparés. Aucun changement aux règles Firestore ou Storage ni aux données de production n'est inclus.

## Vérification et limites

Les contrôles locaux portent sur TypeScript, build, émulateurs et navigation responsive. La recette isolée `scripts/qa/member-experience-browser.mjs` couvre les quatre pages principales dans deux états (avec/sans données) et quinze formats, soit 120 rendus sans accès à Firebase production. La recette de suivi vérifie aussi quinze formats et les interactions bilan, habitude et feedback. Une recette navigateur ne certifie pas le comportement d'un appareil iPhone physique ni un compte Studio sans référent réel. Les états Solo et Studio reposent sur les API/règles existantes, et la simple visibilité d'un lien ne remplace pas une autorisation serveur.
