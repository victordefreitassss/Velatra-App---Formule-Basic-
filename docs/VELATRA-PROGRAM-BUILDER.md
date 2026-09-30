# Program Builder Velatra

## État audité avant la modification

HEAD de départ : `242af685991afa4008651651ece9821029cbe58b`.

`components/Editor.tsx` est l'unique éditeur des programmes client, des modèles et des séances planifiées. `App.tsx` charge les exercices du club et globaux et écrit les programmes ou modèles dans Firestore. `pages/MembersPage.tsx`, `pages/CoachingPage.tsx` et `pages/PresetsPage.tsx` ouvrent ce même éditeur via l'état d'application. Le retour à Client 360 dépend de cet état ; aucun nouveau routeur n'a été créé.

L'éditeur permettait déjà de nommer un programme, régler sa durée, gérer les jours, importer un modèle, chercher un exercice par nom ou catégorie, modifier séries/répétitions/repos/tempo/durée/notes, grouper des séries, dupliquer/déplacer/copier les exercices, exporter en PDF et prévenir la sortie avec modifications. Les données sont `Program → Day → ExerciseEntry` et `Preset → Day → ExerciseEntry`. Les exercices de bibliothèque utilisent `Exercise` (`name`, `cat`, `equip`, `photo`, `videoUrl`, `clubId`).

Les limites observées étaient : paramètres empilés sous la liste sur téléphone, objectifs sous forme de longue liste, filtre équipement absent, catégories personnalisées invisibles dans le sélecteur, création d'exercice nécessitant de quitter le programme, groupes pouvant devenir orphelins ou entrer en collision après copie/import, et association automatique peu explicite. Le menu jour montrait quatre icônes sans libellés. L'éditeur n'avait pas de charge/RPE/RIR **prescrits**.

`ExerciseEntry` est consommé par `components/workoutSession.ts` (nombre de séries, ordre des groupes, temps de repos), `components/WorkoutView.tsx` (prescription et exécution adhérent), `components/CoachingSessionView.tsx` (préremplissage et suivi du coach), les rendus dans `pages/MembersPage.tsx` et l'export PDF. Les charges et le RPE **réalisés** se trouvent dans `SessionLog` et `Performance`. Les nouveaux champs facultatifs `targetLoad`, `targetRpe`, `targetRir` ne changent pas ces résultats de séance. Aucun document existant n'est migré.

## Fonctionnement actuel

Sur téléphone, l'éditeur sépare programme, séance et paramètres d'exercice. Le bouton retour revient à la séance ; la sortie reste accessible depuis la séance et le menu. Sur tablette, les paramètres s'ouvrent dans un panneau latéral. Sur grand écran, jours, séance et paramètres sont visibles ensemble. Les actions de déplacement restent utilisables sans glisser-déposer.

Le sélecteur cherche dans les exercices réellement chargés, y compris les catégories personnalisées, avec filtre équipement, marquage des récents de la session et miniature si elle existe. Un exercice de club peut être créé directement avec nom, catégorie, équipement libre et lien vidéo. Il est disponible immédiatement dans le programme en cours. L'upload de photo/vidéo dans ce dialogue est différé ; la bibliothèque d'exercices garde son propre flux média.

Les groupes sont explicitement composés d'exercices choisis par le coach. Les helpers de `components/programBuilderModel.ts` préservent les groupes contigus, annulent les groupes devenus orphelins, rendent les copies indépendantes et remappent les identifiants lors de l'import d'un modèle. Le dropset reste un type d'un seul exercice. Les anciens programmes avec `reps` en texte (`8-12`, `MAX`, etc.) restent inchangés.

La charge cible, le RPE cible et le RIR cible sont facultatifs et visibles dans les consignes d'exécution ; ils ne préremplissent ni ne remplacent les résultats réellement saisis. Les remarques générales du coach (`coachRemarks` pour un programme, `remarks` pour un modèle) sont distinctes du retour adhérent (`memberRemarks`).

## Contrôles et limites

- `npm run lint`, `npm run build`, `git diff --check`.
- `tests/programBuilderModel.test.ts` : association explicite, duplication/copie, dégroupage et import de modèle.
- `scripts/qa/program-builder-browser.mjs` : vérifie le rendu à 320, 390, 430, 768, 1024, 1280, 1440, 1600, 1920 et 2560 px, le pas à pas sur 320 px, la création d'exercice et le panneau tablette. Ce script utilise un composant local et n'accède pas à Firebase.
- `scripts/qa/mobile-foundations-browser.mjs` : contrôle de non-régression des coques coach/adhérent et de l'éditeur aux tailles déjà couvertes.

`npm run test:emulators` nécessite Java, absent de cet environnement local. La CI exécute cette commande ; son résultat doit être vérifié sur la PR. Aucun test local n'écrit en production.

La récupération automatique d'un brouillon après crash est différée : elle exige un stockage isolé par utilisateur et programme ainsi qu'une politique de conflit avec les changements distants. L'état non enregistré et la confirmation de sortie fonctionnent pendant la session courante. Le drag/drop n'est pas nécessaire car les actions Monter/Descendre sont disponibles. La taxonomie avancée des exercices reste hors de ce chantier.
