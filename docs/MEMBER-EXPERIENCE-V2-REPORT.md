# Member Experience V2 — compte-rendu du 27 septembre 2026

Code : `1dee991`. Audit initial enregistré séparément dans `5bf3ce0`, avant les modifications. Base antérieure : `eef825b`.

## Audit et résultat

Appréciation UX initiale : **5,5/10**. Après cette passe : **8/10**, appréciation qualitative de la recette, pas une mesure auprès d'un panel d'adhérents. Les détails P0/P1/P2/P3 et leurs preuves sont dans [l'audit initial](MEMBER-EXPERIENCE-V2-AUDIT.md).

Le P0 reproduit était la perte des poids saisis à la fermeture du mode séance. Le brouillon conserve désormais le programme d'origine, l'exercice, la série, les valeurs, les validations et l'échéance de repos sur le navigateur utilisé. L'accueil et la page Séances proposent directement de reprendre.

P1 corrigés : détour par le programme avant de commencer ; formulaire de toutes les séries à la fois ; confusion entre prescription et résultat ; repos manuel ; absence de bilan après l'enregistrement ; progression vide malgré des séances au poids du corps ; perte de la demande d'enregistrement après une erreur réseau.

Avant : ouvrir le programme, parcourir des formulaires, valider un mouvement entier, perdre ses saisies en fermant, puis revenir au programme sans bilan.

Après : commencer en un clic depuis l'accueil, confirmer une série à la fois avec grandes commandes, voir la référence antérieure distincte des consignes, suivre le repos automatique, reprendre un brouillon, obtenir un reçu serveur puis consulter son carnet.

## Écrans

- Accueil adhérent : séance puis progression, objectif et lien coach ; outils secondaires repliés. La demande de programme existante est conservée pour les comptes sans programme.
- Mes séances : action directe, jours du programme consultables, nombre réel de séances terminées ; un programme continu ne revient plus visuellement à 0 % après chaque cycle.
- Mode séance : dialogue plein écran, champs et incréments accessibles, correction d'une série, repos automatique, reprise, erreur réseau explicite et résumé final.
- Progression : séances, régularité et séries avant les graphiques ; historique au poids du corps visible ; mesures, graphiques et records existants conservés dans une section secondaire.
- Nutrition sans plan : explication et accès aux échanges avec le coach. Le module nutrition existant reste intact.

La navigation globale, le parcours coach, Glass Rail, Liquid Navigation, les assets du personnage et les règles de sécurité ne sont pas refaits.

## Données et sauvegarde

Les modèles existants Program / Day / ExerciseEntry, SessionLog et Performance sont réutilisés. Aucune nouvelle collection. Une seule métadonnée facultative est ajoutée aux journaux : `completedAt`, produit par le serveur, afin d'ordonner correctement plusieurs séances le même jour. Les anciens journaux restent lisibles avec leur date.

Les séries complètes sont dans le journal. Les exercices suivis alimentent aussi les performances existantes ; les charges nulles sont acceptées, les exercices chronométrés gardent leurs secondes sans créer un faux record de répétitions. Les fourchettes du coach ne sont jamais enregistrées comme des répétitions mesurées.

Le brouillon local est isolé par compte et espace. Il ne constitue pas une sauvegarde Firebase. L'écran distingue brouillon, attente de confirmation et séance enregistrée. Une demande incertaine conserve son identifiant et son contenu pour réutiliser la déduplication serveur existante. Les refus explicites de validation/d'accès rendent les saisies à nouveau éditables ; les pannes réseau et erreurs serveur gardent la requête pour réessayer. Aucun assouplissement d'autorisation.

Si le coach modifie le programme actif, l'ancien brouillon reste consultable, mais la validation est bloquée et le motif est affiché. Les écritures de recette ont uniquement touché des comptes fictifs dans les émulateurs `demo-velatra`.

## Vérifications techniques

- `npm run lint` : réussi.
- `npm run build` : réussi ; avertissement existant de taille de certains bundles, sans erreur.
- `npm test` avec Auth / Firestore / Storage locaux : **73 réussis, 0 échec, 0 ignoré**.
- `git diff --check` : réussi.

Nouveaux tests : restauration exacte du brouillon et du timer ; isolation entre comptes/espaces ; données locales corrompues ; programme changé ; mémoire des mesures ; charges nulles et virgules françaises ; supersets / dropsets et repos ; conservation exacte de la requête après rechargement ; secondes et cardio ; absence de faux record pour un exercice chronométré. Le test transactionnel existant vérifie aussi l'horodatage unique lors de deux confirmations concurrentes. Les tests de droits coach/adhérent existants passent.

## Recette réelle dans le navigateur

Compte adhérent fictif Alex :

1. Connexion, action de séance visible dès l'accueil, ouverture directe.
2. Saisie `7,5 kg`, validation de la première série, repos automatiquement déclenché.
3. Pause puis rechargement : série 2, première série validée et compte à rebours restaurés.
4. Validation des séries suivantes, arrêt volontaire du serveur local avant Terminer : erreur explicite, aucune fausse réussite.
5. Redémarrage du serveur, rechargement, Confirmer puis Réessayer : un seul nouveau journal, compteur de 3 à 4 séances, bilan avec les 3 séries exactes.
6. Progression : détails `7.5 × 10`, `0 × 10`, `0 × 10`, conservés après rechargement ; la séance suivante propose cette nouvelle référence.
7. Deuxième séance en pause, déconnexion, connexion coach puis autre adhérent vide : aucun brouillon d'Alex présenté dans ces comptes. Retour à Alex : reprise à la série 2 avec la série 1 validée et les valeurs conservées.
8. Modification temporaire des consignes du programme dans l'émulateur : message de changement, validation désactivée, ancienne saisie lisible. Restauration du programme : reprise et finalisation réussies (5 journaux au total attendus).
9. Compte fictif sans programme ni séance : explications et actions visibles ; nutrition sans plan contrôlée sur mobile.
10. Coach : accueil, statistiques des séances actualisées, liste de membres, dossier d'Alex et page des modèles de programmes accessibles. Contrôle de non-régression ciblé, pas nouvelle certification de toutes les fonctions coach.

## Responsive

Mode séance réellement affiché et contrôlé à **375×812, 390×844, 430×932, 1280×800, 1440×900 et 1920×1080** : champs, focus, commandes, défilement et action fixe de validation. Repos et reprise vérifiés sur mobile. Le compteur de repos est ramené dans la zone visible après validation d'une série.

Contrôles supplémentaires : accueil et états vides à 390×844 ; carnet à 375×812 ; nutrition à 390×844 ; page Séances à 1920×1080 ; espace coach à 1440×900. Cette liste décrit les écrans effectivement inspectés, sans prétendre avoir testé toutes les combinaisons écran×format.

Le bandeau « emulator mode » masque partiellement la navigation basse dans l'environnement QA uniquement ; le mode séance en dialogue reste au-dessus. La navigation a été exercée au clavier quand ce bandeau interceptait le clic.

## Publication et limites

La publication est prévue sur `main` avec le déploiement Vercel existant. Le SHA final et le résultat du déploiement sont fournis dans le compte-rendu de livraison, après contrôle distant. Aucune publication de règles Firebase n'est nécessaire.

- Reprise sur le même navigateur/appareil. Effacer les données du navigateur efface le brouillon ; aucun système de synchronisation des brouillons entre appareils n'est annoncé.
- Connexion nécessaire pour confirmer la sauvegarde et charger l'application ; pas de mode hors ligne complet.
- La durée affichée est la durée écoulée, pauses incluses. Aucun calcul de temps d'effort prétendument précis.
- Pas de promesse « entraînement effectué en moins de 30 secondes ». L'action d'ouverture est directe ; la rapidité en salle demande encore une observation avec de vrais adhérents.
- Les dimensions mobiles sont émulées. Le clavier virtuel réel iOS/Android et l'usage physique à une main ne sont pas certifiés par cette recette.
- Cardio, supersets et isométriques ont des tests de logique ; le parcours navigateur complet a utilisé le squat, avec puis sans charge ajoutée.
- L'IA n'a pas été retestée avec une clé de production : elle n'est pas nécessaire au carnet et reste hors du périmètre de cette passe.
- Les séances anciennes sans heure exacte gardent leur date ; leur ordre dans une même journée ne peut pas être reconstitué avec certitude.
