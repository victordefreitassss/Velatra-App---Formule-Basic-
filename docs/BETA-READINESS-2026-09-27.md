# Velatra — bilan de préparation à la bêta privée

## Conclusion

Le parcours principal a été terminé avec des comptes fictifs dans le navigateur : création d’un espace coach, coordonnées, premier adhérent, programme manuel attribué, réservation, suivi ; puis connexion adhérent, onboarding, séance et suivi quotidien. Aucun P0 n’a été reproduit dans ce périmètre local. Les P1 constatés ont été corrigés sans refonte de l’architecture, de la navigation, du design system, de la mascotte, des règles Firebase ou de la sécurité backend.

Une bêta accompagnée avec des coachs indépendants est pertinente après vérification opérationnelle des accès en production. Ce résultat n’est pas une certification « 100 % fonctionnelle » : paiements réels, emails, Gemini et équipe multi-coachs ne sont pas validés de bout en bout par cette recette.

## Méthode et audit avant code

L’[audit initial](./BETA-READINESS-INITIAL-2026-09-27.md) a été enregistré dans le commit `c7ead3e` avant les corrections produit. Base inspectée : `cc467770e8f69820aac8450d76f3a08feec84bc6`.

Recette dans le navigateur intégré, application servie par le vrai serveur local, Firebase Auth/Firestore/Storage émulés sur `demo-velatra`. Les créations, enregistrements de programme, réservation et séances ont utilisé les formulaires et API réels de l’application. Aucun compte client ni aucune donnée de production n’a été utilisé. La base par défaut de l’émulateur a été explicitement sélectionnée pour la recette ; aucune modification de configuration Firebase produit n’a été nécessaire.

Deux espaces ont été créés via l’interface : coach indépendant Camille / Atelier Coaching QA, puis responsable Sam / Studio Bêta QA. Alex et Morgan ont été créés par leur coach. Trois profils supplémentaires ont été injectés uniquement dans l’émulateur pour observer le tableau de bord à quatre adhérents : cette observation n’est pas présentée comme trois inscriptions supplémentaires testées.

## P0

Aucun blocage total reproduit sur le parcours local terminé. Les échecs de services externes non configurés dans cet environnement ne constituent pas une validation de ces services en production.

## P1 constatés et corrigés

| Écran | Problème / impact | Correction et vérification |
| --- | --- | --- |
| Compléter mon espace | Le coach arrive en lecture seule et ignore comment terminer cette étape. | L’action ouvre directement l’édition, explique téléphone/email, confirme l’enregistrement et propose « Continuer mon démarrage ». Rejoué avec Sam : 0/5 → édition → sauvegarde → 1/5. |
| Premier adhérent | Formulaire long ; absence d’explication sur l’envoi des identifiants. | Trois champs requis visibles, profil facultatif replié ; consignes avant et après création. Morgan créé et dossier ouvert. Aucun email automatique n’est promis ; mot de passe non conservé par la bannière. |
| Premier programme | Ajouter insère immédiatement un squat barre non choisi. | Le choix précède l’ajout. Échap laisse le programme à zéro exercice ; recherche et sélection ajoutent uniquement le mouvement choisi. Enregistrement de « Démarrage Morgan » et attribution vérifiés. |
| Planning / semaine | La semaine change mais le détail reste sur l’ancienne date. | Date sélectionnée et semaine avancent ensemble. Passage 21–27 septembre → 28 septembre–4 octobre : détail dimanche 4 octobre, puis choix lundi 28. |
| Planning / réservation | Une séance apparaît deux fois, avec et sans coach. | Association à une seule carte. La réservation d’Alex à 09:00 n’apparaît qu’une fois. Tests ciblés pour coachs simultanés, créneaux génériques, filtrage, types/durées distincts et réservations hors disponibilité courante. Aucun changement de réservation côté serveur. |
| Planning vide | Un dimanche vide invite à tout configurer malgré des horaires enregistrés. | Distinction entre absence de disponibilités et journée sans créneau. Accès direct et focus sur la section des disponibilités. Les deux états ont été observés sur des espaces différents. |
| Séance adhérent | Charge au poids du corps et erreur de validation peu compréhensibles. | Indication explicite « 0 kg » sans charge ajoutée, noms accessibles des champs, erreur précisant les données attendues. Séance terminée ; deux séances et 300 XP visibles après rechargement à la fin de la recette. |
| Paramètres / studio | Outil de sélection de base de données visible aux coachs et faux WhatsApp de demande staff. | Diagnostic réservé au superadmin en développement. Faux lien retiré ; indisponibilité des comptes d’équipe expliquée. Absence des deux éléments vérifiée dans le DOM coach. |
| Disponibilités sur téléphone (recette complémentaire) | Nom du type de séance comprimé ; horaires, sélecteurs et suppression débordent. Titre ciblé masqué par la barre fixe. | Champs réorganisés localement, noms de champs visibles, horaires disposés sur plusieurs lignes, commandes accessibles et marge de défilement. Vérification visuelle à 375 px ; aucun débordement global. |
| États et contraste (recette complémentaire) | Interrupteur de planning quasi invisible ; repos de séance sombre sur sombre. | Case à cocher avec état « Activé / Désactivé » ; repos sombre sur fond clair. Rendu final inspecté. Le badge repos utilise `rgb(24,24,27)` sur `rgb(244,244,245)`. |

## Parcours coach — appréciation après corrections

Notes heuristiques d’une recette experte, pas une étude statistique avec de vrais coachs.

| Étape | Note /10 | Constat |
| --- | --- | --- |
| Signup | 8 | Profil, champs et code bêta explicites. Coach et club/studio créés. Accès volontairement réservé aux invités. |
| Premier login | 9 | Une prochaine action, progression visible, reprise après reconnexion. |
| Premier adhérent | 8 | Trois champs requis, dossier immédiat et transmission d’accès expliquée. Envoi encore manuel. |
| Premier programme | 8 | Accès depuis le dossier, mouvement choisi, sauvegarde et attribution simples. Certains réglages restent spécialisés. |
| Première valeur | 8 | Adhérent équipé d’un programme, réservation retrouvée dans sa fiche, puis activité visible après sa séance. |

Repères du parcours rejoué : depuis l’accueil, coordonnées en trois actions de navigation/validation (ouvrir, enregistrer, continuer) plus saisie ; adhérent en deux actions (ouvrir, créer) plus saisie ; programme en quatre actions depuis le dossier (Programme, Ajouter, Choisir, Enregistrer) plus réglages. Pas de prétention de mesure chronométrée.

Le tableau de bord mature a également été examiné : « À traiter aujourd’hui », raccourcis et prochaines séances précèdent les quatre indicateurs. Les informations sont hiérarchisées. Les états sans urgence et sans point de vigilance sont explicites. Le scénario d’un adhérent réellement en difficulté sur plusieurs semaines n’a pas été simulé.

## Parcours adhérent

| Étape | Note /10 | Constat |
| --- | --- | --- |
| Connexion | 9 | Identifiants transmis par le coach utilisables ; quatre étapes de profil terminées durant l’audit initial. |
| Programme | 8 | Programme attribué visible ; ouverture puis démarrage de séance. Indication de charge ajoutée lisible sur mobile. |
| Suivi | 7 | Séances, XP et suivi du jour conservés après rechargement. Le retour à 0 % du cycle suivant peut surprendre pour un programme continu d’un seul jour. |

La transmission d’un email réel, la récupération de mot de passe par email et la reprise sur un autre appareil n’ont pas été testées.

## Studio

Inscription « Club / Association », coordonnées, premier adhérent, programme et réglages testés. Le socle propriétaire fonctionne dans la recette. L’ajout de staff est indisponible dans cette configuration et l’interface l’annonce. Cela ne valide pas un usage commercial avec plusieurs coachs, leurs affectations et toute l’organisation d’une équipe. La bêta doit expliciter cette limite aux studios invités.

## Responsive et contrôle visuel

Dimensions réellement appliquées : **375×812, 390×844, 430×932, 1280×800, 1440×900, 1920×1080**. Captures inspectées, interactions réelles, contrôles DOM de largeur ; pas seulement lecture du CSS.

- Tableau de bord mature : inspection visuelle sur les six formats, sans défilement horizontal global.
- 375×812 : éditeur, choix/recherche/annulation d’exercice, réglages et lignes horaires, planning.
- 390×844 : accueil de démarrage, création adhérent et confirmation, séance adhérent, consignes et bouton de repos.
- 430×932 : planning, paramètres, accueil adhérent et séance.
- 1280×800 : parcours initial, membres, planning et réservation corrigée.
- 1440×900 : inscription studio, accueil initial, édition de l’espace et confirmation.
- 1920×1080 : éditeur avec paramètres, enregistrement/attribution, liste membres et tableau de bord.

Cette matrice couvre les parcours et corrections ; elle ne signifie pas que chaque page de l’application a été testée sur chacun des six formats. Aucun clavier logiciel réel ni test physique à une main. Le bandeau propre aux émulateurs masque une partie de la barre basse dans certaines captures : gêne de recette distinguée du rendu de production, navigation parfois activée au clavier pour cette raison.

## Frictions restantes — P2 / P3, hors corrections de cette passe

1. Termes « club », « staff », « leads », « Pipeline Commercial » et « Drive Intégré » encore techniques pour un indépendant. CRM vide à mieux expliquer, sans nécessité de refonte immédiate.
2. Transmission manuelle des identifiants ; ne pas laisser entendre qu’une invitation a été envoyée automatiquement.
3. Accueil avec checklist après 5/5 tant qu’il n’y a pas quatre adhérents ; attribution du coach référent encore à distinguer de la propriété de l’espace.
4. Programme continu : retour à 0 % au nouveau cycle malgré une séance enregistrée ; valeurs de profil initiales à confirmer et petites erreurs de pluriel.
5. Multi-coachs non recetté de bout en bout ; Gemini absent de la configuration locale, Stripe et emails réels non exécutés. Ces intégrations nécessitent une recette dédiée avant de les inclure dans les promesses bêta.

## Vérifications

Après chaque lot cohérent de corrections : `npm run lint`, `npm run build`, `npm test` avec les trois émulateurs.

| Lot | Lint | Build | Tests |
| --- | --- | --- | --- |
| Démarrage et accès adhérent | OK | OK | 57/57, aucun ignoré |
| Choix exercice et charge | OK | OK | 57/57, aucun ignoré |
| Planning et paramètres | OK | OK | 62/62, aucun ignoré |
| Disponibilités mobile | OK | OK | 62/62, aucun ignoré |
| États et contraste locaux | OK | OK | 62/62, aucun ignoré |

Cinq tests de régression ajoutés pour l’affichage du planning et le changement de semaine. Les suites existantes de réservation, inscription, suivi, isolation et runtime passent sans modification du backend ni des règles. `lint` correspond au contrôle TypeScript du projet. Avertissement de build existant : certains bundles dépassent 500 kB. La recette UI reste manuelle, non ajoutée comme suite automatisée.

## Commits

- `c7ead3e` — audit initial avant modifications.
- `c0fcf0d` — démarrage coach et transmission de l’accès adhérent.
- `aa376a6` — choix d’exercice explicite et saisie de séance plus claire.
- `518b9d9` — date du planning, association unique des réservations, paramètres honnêtes.
- `9020137` — paramètres et disponibilités utilisables sur petit téléphone.
- `b424ffb` — état du planning et contraste du repos.

Le présent rapport complète ces commits. Publication GitHub/Vercel suivie dans le compte rendu de livraison ; aucune publication de règles Firebase ni modification de données de production.
