# Audit initial — Member Experience V2

Base : `eef825b`. Audit effectué avant les modifications de cette passe, dans le navigateur intégré à 390×844, compte adhérent fictif et émulateurs locaux. Les parcours complets et les autres formats de la recette bêta précédente restent documentés séparément.

## Appréciation initiale : 5,5/10

La connexion et l’enregistrement final fonctionnent, mais le carnet ne peut pas encore remplacer le papier : les saisies intermédiaires disparaissent à la fermeture, chaque mouvement présente toutes ses séries et la progression privilégie les records et mesures plutôt que les séances réalisées.

| Priorité | Écran | Problème et preuve | Impact | Correction proposée |
| --- | --- | --- | --- | --- |
| P0 | Séance / reprise | Saisie de 7,5 kg constatée dans le champ ; fermeture puis réouverture : retour à 0. Aucun brouillon persistant. | Perte de travail pendant une séance, impossible de reprendre fiablement. | Brouillon local isolé par compte et espace, valeurs/séries/exercice/timer conservés ; action Reprendre ; signalement explicite des limites locales. |
| P1 | Accueil | « Démarrer l’entraînement » ouvre le programme, puis un second bouton démarre. Réservation future avant l’action. | Action principale ambiguë et détour en salle. | Commencer/Reprendre directement, informations secondaires après l’action. |
| P1 | Exécution | Longue liste, validation du mouvement entier, commandes +/− petites et labels minuscules. | Défilement et saisie difficiles à une main ; séries effectuées non repérables. | Un exercice et une série courante, champs et contrôles d’au moins 44 px, validation par série, accès aux séries précédentes. |
| P1 | Mémoire | Anciennes valeurs préremplies sans contexte « dernière fois ». Une fourchette prescrite peut être reprise comme valeur réalisée. | Risque de confondre prescription et performance. | Dernière séance explicitée ; valeurs numériques proposées mais confirmation de chaque série ; prescription du coach distincte, aucune augmentation automatique imposée. |
| P1 | Repos | Timer à ouvrir manuellement et décompte lié au montage de l’écran. | Repos oublié, reprise incohérente après fermeture. | Repos après validation, échéance persistée, prochaine action visible ; respecter les groupes d’exercices. |
| P1 | Fin | Retour immédiat au programme ; cycle continu revient à 0 %. | L’adhérent ne voit pas le résultat de son travail. | Résumé après confirmation serveur : durée, séries, exercices, comparaison factuelle, lien progression. |
| P1 | Progression | Après trois séances au poids du corps : mesures vides, aucune donnée de force, aucun record. | Impression que les séances n’ont pas été enregistrées. | Séances récentes, régularité et détails des séries d’abord ; mesures et graphiques existants secondaires. |
| P1 | Réseau | Sauvegarde finale idempotente existante, mais identifiant de requête et données uniquement en mémoire. | Un échec réseau suivi d’un rechargement fait perdre la possibilité de reprendre la même sauvegarde. | Conserver la requête et son identifiant jusqu’à confirmation, erreur explicite et nouvelle tentative sans annoncer de synchronisation prématurée. |
| P2 | Nutrition | Aucun plan : phrase explicative sans prochaine action, constatée dans le navigateur. | Impasse visuelle. | Lien vers les échanges avec le coach, sans nouveau module nutrition. |
| P2 | Programme vide | Explication existante sans action (inspection du code). | Attente passive. | Accès au coach et historique si disponible. |
| P2 | Relation coach | Discussions et remarque sous plusieurs blocs de statistiques/gamification. | Contact difficile à repérer. | Lien clair au coach et objectif personnel après séance/progression. |
| P3 | Texte | S1/J1, pluriels, prédiction 1RM dominante. | Jargon et bruit. | Ajustements locaux des écrans concernés, sans chantier de navigation. |

## Données et contraintes

Modèles existants conservés : Program → Day → ExerciseEntry ; SessionLog.exercises[].sets (weight/reps/duration), Performance, historique et progression de currentDayIndex. Le serveur `/api/workouts/complete` valide l’association membre/espace/programme, enregistre atomiquement et déduplique par requestId. Il accepte déjà la durée de séance. Le coach utilise CoachingSessionView, distinct de WorkoutView : ne pas le remplacer.

Pas de nouvelle collection ni modification des règles ou de la sécurité backend. Le brouillon est une copie de travail locale, pas une séance synchronisée. Les données restent celles de l’utilisateur connecté. Un programme modifié pendant une séance doit être signalé avant envoi. Une sauvegarde dont la réponse a été perdue doit pouvoir être confirmée avec le même identifiant, même si le programme a avancé côté serveur.

L’objectif « moins de 30 secondes » concerne trouver/commencer/reprendre et saisir une série ; il ne peut pas signifier réaliser physiquement un entraînement entier dans ce délai. Pas de promesse chronométrée sans mesure humaine.
