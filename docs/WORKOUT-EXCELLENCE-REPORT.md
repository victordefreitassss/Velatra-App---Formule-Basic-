# VELATRA — WORKOUT EXCELLENCE PASS

## HEAD INITIAL

`b346ff97eeadb942d3199fce783c910597a636c6`, vérifié égal à `origin/main` après fetch, avant l'audit. Audit réalisé avant modification : [détail](WORKOUT-EXCELLENCE-AUDIT.md).

## AUDIT AVANT

Séance complète dans le navigateur, adhérent fictif Robin QA, émulateurs locaux `demo-velatra`, 390×844. Aucun entraînement ni compte de production utilisé.

1. Pompes : obligation inutile de saisir zéro, erreur si validation directe.
2. Série suivante : retour à l'ancienne charge au lieu de proposer celle juste réalisée.
3. Référence, vidéo et consignes occupent trop de hauteur avant les champs.
4. Lecture/correction d'une ancienne série retirant silencieusement sa confirmation.
5. Accueil : reprise sans nom de l'exercice ni numéro de série.
6. Saisie directe sans sélection intégrale ni parcours clavier Suivant/Terminé.
7. Timer sans rafraîchissement immédiat au retour au premier plan ni prolongation rapide.
8. Changement d'exercice trop discret et pas d'incrément visible sur les boutons.
9. Affichage décimal peu français et gain de charge pouvant comparer des références incomplètes.
10. Carnet peu scannable et statistiques avancées au style historique trop chargé.

## CORRECTIONS

1. Conservation de Workout V2 : aucun nouveau modèle, collection, backend, règle Firebase, système de brouillon ou navigation. Aucun composant coach modifié.
2. Poids du corps implicite, lest facultatif ; charge ±2,5 kg et répétitions ±1. Champs 56 px, actions importantes ≥44 px et CTA ≥52 px avec safe area.
3. Objectif du coach / dernière série correspondante / aujourd'hui séparés. Consignes et références complètes repliables.
4. Préremplissage de la série suivante, sans confirmation automatique ni bouton de copie supplémentaire ; protections des saisies différentes de la proposition initiale, séries confirmées, dropsets et prescriptions variables.
5. Sélection du nombre au focus, virgule et point acceptés, Entrée passe de charge à répétitions puis valide. `visualViewport` adapte le panneau ; champ actif remis en vue. Aucun geste caché.
6. Lecture d'une série conservant sa validation ; changement effectif demandant explicitement de valider la correction. Lecture possible même après toutes les séries.
7. Repos à échéance absolue, +30 sec et rafraîchissement sur focus/visibilitychange/pagehide. Transition d'exercice courte, compatible avec réduction des animations.
8. Reprise depuis l'accueil avec exercice, série et compteur ; brouillon local existant conservé.
9. Bilan court, séries dépliables et gain de charge seulement à répétitions égales sur mesures complètes compatibles. Carnet date/nom/durée précise/séries.
10. Zone avancée adoucie. Suppression des calories cardio arbitraires et de l'estimation de force au poids du corps ; référence cardio datée, sans comparer mètres et minutes. Hiérarchie de l'accueil déjà conforme, conservée : séance, progression, objectif/coach, réservation éventuelle, suivi du jour.

## SAISIE D’UNE SÉRIE

| Scénario | Avant | Après |
|---|---:|---:|
| Charge +2,5, reps −1, valider | 3 taps | 3 taps |
| Répéter la charge actuelle, auparavant 5 kg au-dessus de la proposition historique | 3 taps | 1 tap |
| Poids du corps, reps déjà proposées | 3 actions minimum, parfois une erreur préalable | 1 tap |
| Remplacer arbitrairement deux nombres puis valider | environ 7 actions | environ 5 actions, sans effacement manuel |

Comptage hors repos et exercice physique ; la saisie d'un nombre compte comme une action. Automatisation : ajuster/valider avant 1,66 s ; validation de la série répétée après 0,28 s ; poids du corps après 0,75 s. Ces délais ne mesurent ni la perception ni la vitesse d'une personne. La séance de recette complète affiche 4 min 47 s, comprenant les manipulations de test ; aucune promesse de benchmark humain.

## POIDS DU CORPS

Identification à partir de l'équipement explicitement renseigné « Poids du corps », pas d'une charge zéro ni du nom seul. Zéro technique conservé, sans le saisir. « Ajouter un lest », puis retour sans lest possible. Ancien brouillon sans charge compatible. Le lest reste un poids dans le modèle existant.

## RÉPÉTITIONS

±1 et champ éditable avec sélection de la valeur ; clavier numérique demandé. Charge : clavier décimal demandé, affichage 82,5, acceptation de 82.5. Gainage testé avec 35 secondes, sans libellé répétitions côté adhérent.

## SÉRIE SUIVANTE

Option A retenue : préparation automatique de la prochaine série du même exercice, y compris le prochain tour d'un superset. La référence historique reste indépendante. Aucune série n'est réalisée avant sa validation explicite. Les valeurs manuellement différentes de la proposition initiale, les séries déjà confirmées et les dropsets ne sont pas écrasés. Des objectifs de répétitions différents ne sont pas uniformisés.

## TIMER

Échéance en millisecondes conservée dans le brouillon existant. Le calcul ne dépend pas du nombre d'intervalles exécutés. +30 sec prolonge l'échéance réelle. Pause/reload/reprise constaté : 1:52 puis 1:28 après le temps écoulé. Test unitaire de suspension de 45 s. Superset : pas de repos entre A1/A2, repos après A2. Dropset : aucune pause entre les parties. Verrouillage d'un téléphone physique non testé.

## REPRISE

Un tap depuis l'accueil retrouve exercice et série : développé couché, série 2/2, charge 82,5 et 9 reps après rechargement. Les événements de cycle de vie écrivent uniquement le stockage local. Après serveur local arrêté : pas de fausse réussite, message compréhensible, rechargement puis réessai avec le mécanisme de déduplication existant. Une seule séance finale enregistrée : trois séances au total pour Robin (référence, audit avant, recette après).

## CAS TESTÉS

- Musculation : deux séries de développé couché ; remplacement direct 82,5 ; sélection et Entrée ; correction 9→8 ; consultation sans dévalidation.
- Poids du corps : pompes 2×10, ajout de lest +2,5 puis retour sans lest, sauvegarde à zéro.
- Timed : gainage 35 s.
- Cardio : rameur 00:30 puis 500 m, références sans comparaison d'unités différentes.
- Superset : tractions A1 / pompes sur genoux A2 sur deux tours, ordre et repos contrôlés.
- Dropset : curl 20×8 puis 15×8 sans repos automatique ni écrasement de charge.
- Panne serveur, conservation du brouillon, reload et réessai sans doublon ; bilan 7 exercices / 13 séries ; carnet et progression.
- Côté coach : dossier Robin, historique et récapitulatif ouverts dans l'interface. Les 7 exercices / 13 séries et la correction 82,5×8 remontent, cardio 00:30 / 500 m conservé. Limites de libellés de l'ancienne vue coach signalées ci-dessous.

## RESPONSIVE

Inspection réelle par captures du navigateur : 375×812, 390×844, 430×932, 768×1024, 1280×800, 1440×900. Champs, progression et CTA contrôlés ; lest à 430, corps et bilan/carnet à 390, dropset sur tablette et desktop. Contrôle supplémentaire 375×450 avec champ sélectionné et CTA visible pour tester une hauteur réduite. Ce dernier contrôle n'est pas un test de clavier logiciel iOS/Android. Actions du bas et tailles de cibles inspectées, sans test physique de pouce droit.

## TESTS

- lint : réussi (`npm run lint`).
- build : réussi (`npm run build`), avertissement préexistant sur la taille de certains bundles.
- npm test : 81 réussis, 5 suites, aucun échec/ignoré ; les 73 précédents sont conservés, 8 nouveaux tests couvrent les règles ajoutées.
- diff check : réussi (`git diff --check`).

## COMMITS

- `f6cbe61` — audit préalable, frictions et comptage des actions.
- `c3435d1` — saisie, poids du corps, préparation, correction, repos, reprise, carnet et références factuelles ; tests associés.
- Ce rapport est ajouté dans un commit documentaire séparé. Le SHA final et l'état de publication sont communiqués après vérification.

## VERCEL

Publication sur `main` via l'intégration Vercel existante. Le statut et les fichiers publics effectivement servis sont vérifiés après le push ; ils ne sont pas anticipés dans ce rapport. Aucun déploiement de règles Firebase nécessaire pour cette passe.

## NOTE FINALE

Expérience séance mobile : **9,5/10 sur le périmètre adhérent inspecté en navigateur**, auto-évaluation ergonomique et non mesure comparative indépendante. Le chemin rapide est court, la référence séparée, la correction explicite et la reprise éprouvée. Cette note ne certifie pas le matériel mobile non testé ni l'ensemble de l'application.

## LIMITES

- Aucun téléphone physique, clavier iOS/Android, test réel du pouce droit ou verrouillage matériel disponible. Focus, Entrée, dimensions, hauteur réduite, échéance et rechargement ont été vérifiés séparément.
- Pas de distinction gauche/droite dans le modèle existant : aucune nouvelle architecture unilatérale créée.
- Le brouillon reste sur le même navigateur/appareil ; son effacement supprime cette copie. Pas de synchronisation interappareils ajoutée.
- Le préremplissage protège les valeurs différentes de leur proposition initiale ; le modèle n'enregistre pas l'intention d'une personne qui retaperait exactement cette même valeur.
- Certaines anciennes performances ne portent qu'une date : impossible de certifier l'ordre intrajournalier de leurs références cardio. Les nouvelles séances utilisent leur horodatage existant.
- Vérification fonctionnelle complète en émulateurs ; aucune séance ajoutée à un compte réel de production pour la recette.
- Vue coach historique inchangée conformément au périmètre : son récapitulatif affiche encore « 0 kg » pour le poids du corps et « 35 reps » à côté des « 35 s » correctement conservées ; son tableau PR conserve un affichage cardio 0 kg / 0 reps. Ce sont des libellés préexistants, pas une perte des données transmises. Leur correction appartient à une passe dédiée au coach.
