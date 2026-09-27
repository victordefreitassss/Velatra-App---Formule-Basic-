# Workout Excellence — audit avant modification

HEAD initial vérifié par `git fetch origin main` : `b346ff97eeadb942d3199fce783c910597a636c6` (HEAD et origin/main identiques).

Recette réelle en navigateur, 390×844, adhérent fictif Robin QA, émulateurs `demo-velatra`. Programme dédié : développé couché 2 séries, pompes 2 séries. Une référence fictive précédente comporte 77,5×10 puis 75×9. Ouverture, charge, reps, validation, repos, correction, changement d'exercice, pause/reload/reprise, fin et carnet ont été exercés avant modification du code.

## Les dix frictions restantes

1. **Poids du corps** : Pompes sans historique, Valider déclenche l'erreur demandant 0 kg. Une entrée inutile est requise ; elle doit devenir implicite à partir de l'équipement réellement renseigné.
2. **Série suivante** : après 80×9 au développé couché, la série 2 propose 75×9, valeur historique. Il faut modifier à nouveau la charge pour répéter la série actuelle.
3. **Hiérarchie verticale** : vidéo et bloc de référence développent beaucoup de hauteur. À 390 px, le bas du champ de répétitions approche le bouton fixe et impose du défilement.
4. **Correction silencieuse** : passer de 9 à 8 reps sur la série 1 fait passer le compteur de 1/4 à 0/4 sans explication locale. Ouvrir le récapitulatif peut même retirer une validation avant tout changement.
5. **Reprise peu précise** : l'accueil indique 3/4 séries mais pas « Pompes, série 2/2 » ; il faut ouvrir pour retrouver son emplacement.
6. **Saisie directe** : aucun select-all au focus, aucun parcours Entrée/Suivant. Les attributs inputMode sont corrects, mais 100dvh seul ne prouve pas la protection du CTA quand un clavier réel apparaît.
7. **Repos** : échéance déjà correcte après reload (90→81 s constaté) ; absence de rafraîchissement immédiat sur visibilitychange/focus et aucune petite prolongation explicite.
8. **Changement d'exercice** : le titre change bien, mais le cadre identique n'annonce pas la transition. Les incréments +/− n'indiquent pas visuellement leur pas.
9. **Mesures et bilan** : virgule française acceptée mais sortie « 77.5 » ; ancien gain de charge calculé avec données manquantes converties en zéro, sans filtre de type de mesure. À sécuriser sans annoncer des records.
10. **Carnet et zone avancée** : ordre nom/date peu scannable, durée arrondie à une minute ; titres et petites étiquettes avancées encore très gras, italiques et majuscules.

## Actions et temps observés

- Ajuster 77,5→80 kg, 10→9 reps et valider : **3 taps** existants, 1,66 s d'exécution automatisée (hors perception et exercice physique). Ce chemin est déjà court ; ne pas ajouter de commandes.
- Répéter 80 kg depuis les 75 kg proposés à la série 2 : **3 taps** (+2,5 deux fois, valider), hors fin de repos.
- Première série au poids du corps : **3 actions minimales** (toucher la charge, saisir 0, valider), voire un aller-retour d'erreur si l'on valide sans zéro. Reproduit.
- Saisie arbitraire de deux nombres : toucher/sélectionner-effacer/saisir chaque champ puis valider, soit environ **7 actions**. L'automatisation fill ne mesure pas le clavier humain.
- Séance de quatre séries simulées terminée en environ **60 s de parcours actif affiché**, avec repos passés. Ce n'est ni une durée d'entraînement ni un benchmark humain.

## Garde-fous

Préserver API, transaction, déduplication, schéma serveur, règles et navigation. Améliorer uniquement les helpers et composants existants. La référence de chaque série doit rester indépendante du préremplissage proposé aujourd'hui. Ne jamais écraser une série déjà validée ou une saisie différente du préremplissage initial. Les cibles différentes / dropsets doivent rester distincts.

ExerciseEntry et SessionLog.sets ne comportent aucun axe gauche/droite : ne pas inventer de support unilatéral distinct. Aucune vraie simulation de clavier iOS/Android ou de pouce physique n'est disponible ; documenter séparément les contrôles de dimensions et de focus.
