# VELATRA — Member Mobile First

Recette du 27 septembre 2026. Périmètre : présentation et ergonomie adhérent. Aucune nouvelle dépendance, API, règle Firebase, collection ou modification du moteur de séance. Palette, police, personnage officiel et destinations V2 conservés.

## HEAD INITIAL

`dcba89361f9f00ecc1334209b7cef6f87d7fe824`, égal à `origin/main` après fetch. Répertoire initial propre. Rapports Member Experience V2 et Workout Excellence relus avant modifications.

## AUDIT INITIAL

Appréciation qualitative : **7/10**. Inspection réelle avec comptes fictifs locaux, aux trois largeurs de téléphone. Le workout était déjà le parcours le plus abouti ; les pages périphériques conservaient davantage une logique de dashboard. L’audit a été commité **avant le code**, dans `MEMBER-MOBILE-FIRST-AUDIT.md` : mission, action et défauts par écran.

## TOP 15 PROBLÈMES

Aucun P0 reproduit dans ce périmètre.

1. **P1** Nutrition : action de saisie après six blocs secondaires → action avant macros/IA.
2. **P1** Macros : couleurs peu lisibles → chiffres et labels dans des tons plus sombres.
3. **P1** Documents : table et actions au survol → lignes entièrement cliquables.
4. **P1** Profil : sauvegarde éloignée, annulation absente → sauvegarde fixe sur mobile et annulation réelle.
5. **P1** Messages/AI : hauteur utile contrainte → mesure de l’espace entre en-tête et navigation.
6. **P2** En-tête sur trois lignes → titre/outils regroupés, onglets sur la seconde ligne.
7. **P2** Accueil : identité répétée et gamification prioritaire → Aujourd’hui, séance, progression, coach.
8. **P2** Trop de cartes → métriques et objectifs séparés par des lignes.
9. **P2** Progression : comparaisons enfouies → repères par exercice avant analyses avancées.
10. **P2** Objectifs après les données physiques → objectif et prochaine étape en tête du profil.
11. **P2** Plus : Messages trop bas → groupe secondaire puis Messages en premier.
12. **P2** Séances peu différenciées → séance en cours, réservations à venir, terminées.
13. **P2** États vides peu utiles → explication courte, coach ou contact du club.
14. **P3** Historique trop décoratif → timeline avec séries dépliables.
15. **P3** AI/club : doublons et vocabulaire interne → en-têtes compacts et texte adhérent.

Deux défauts supplémentaires repérés pendant la recette ont été corrigés : texte sombre sur les bulles vertes et filtre d’animation empêchant le bouton de profil de se fixer au viewport. Sa position a ensuite été mesurée à **679–756 px** dans un viewport **390×844**, au-dessus de la navigation.

## ÉCRANS MODIFIÉS

Accueil, Séances, Progression, Nutrition (avec/sans plan et formulaire), Messages, Velatra AI, Plus, Profil/Objectifs, Documents, Historique, Infos club. En-tête et styles limités à l’espace adhérent. Les écrans secondaires non refondus gardent leurs destinations.

## ACCUEIL

**Avant :** identité répétée, cartes et repères de niveau concurrençant l’action.

**Après :** Aujourd’hui/Bonjour, séance et reprise visibles immédiatement, chiffres sur sept jours, objectif et lien coach. Gamification et outils secondaires repliés. Données et suivi du jour existants conservés.

## SÉANCES

**Avant :** gros blocs programme et historique peu visible.

**Après :** reprise dominante avec exercice, série et progression ; réservations à venir ; programme dépliable ; trois dernières séances détaillables. Pas d’invention de réservation ni de séance terminée.

## WORKOUT

**Avant/après :** moteur et interface dédiée conservés volontairement après audit. Aucune modification de `WorkoutView`, des helpers de brouillon, du timer, de l’idempotence ou du backend.

Recette de cette passe : reprise à 0/4, validation d’une série, repos 90 secondes, pause, rechargement, reprise à 1/4 sur série 2 ; référence historique et valeurs conservées, repos arrivé à expiration puis reprise. Le test complet multi-types de la passe précédente n’est pas présenté comme rejoué ici ; les tests automatisés associés ont tous repassé.

## PROGRESSION

**Avant :** compteurs puis historique, analyses lourdes en aval.

**Après :** régularité, comparaisons de premières séries, objectif, dernières séances ; graphiques/1RM dans les analyses avancées. Le gain de meilleure charge utilise le helper existant et exige des répétitions comparables. Poids du corps, durées et distances conservent leurs unités. Exemple local contrôlé : 80 × 8 → 82,5 × 8, gain de 2,5 kg ; aucune charge fictive pour les pompes.

## NUTRITION

**Avant :** quatre cartes de macros et assistants IA avant les repas.

**Après :** énergie renseignée et « Noter un repas », repères dépliables, journal ; outils IA en secondaire. Formulaire nommé, unités et claviers adaptés, choix du repas, annuler/valider accessibles. Sans plan : explication et contact du coach.

Recette : ajout d’un repas fictif de 420 kcal avec macros saisies manuellement ; confirmation, total et ligne mis à jour puis retrouvés après rechargement. Pas d’appel Gemini nécessaire à ce test.

## MESSAGES

**Avant :** en-tête imposant et hauteur peu adaptée au téléphone.

**Après :** identité compacte, bulles solides et contrastées, saisie à 16 px, hauteur calculée d’après le viewport et la navigation, défilement limité au fil. Pièce jointe nommée pour l’accessibilité, envoi vide désactivé. Sans coach : contact du club.

Recette : envoi entre comptes fictifs dans l’émulateur, message retrouvé après rechargement ; composition au-dessus de la navigation aux six dimensions. Onglet coach intégré à Velatra AI également ouvert et inspecté. Pas d’envoi à un utilisateur réel.

## PLUS

**Avant :** fonctions secondaires fréquentes après plusieurs groupes à une entrée.

**Après :** Messages en tête du groupe Plus, puis AI, Documents, Objectifs, club et historique ; réservation/évolution/boutique restent accessibles. Les cinq hubs et leur architecture ne changent pas.

## RESPONSIVE

Inspections réelles via navigateur, arbres d’accessibilité, géométrie DOM et captures :

| Dimensions | Vérifications |
|---|---|
| 375×812 | Dix destinations remaniées ; workout ; absence de débordement horizontal. |
| 390×844 | Dix destinations ; Plus ; formulaires nutrition/profil ; messages et AI ; workout. |
| 430×932 | Dix destinations ; captures progression, historique, documents, club, messages ; workout. |
| 768×1024 | Dix destinations ; accueil, chat, comparaisons en deux colonnes ; workout. |
| 1280×800 | Dix destinations ; rail, largeur bornée, conversation ; workout. |
| 1440×900 | Dix destinations ; nutrition ; workout ; contrôle des parcours coach. |

Les dix destinations correspondent à Accueil, Séances, Progression, Nutrition, Documents, Profil/Objectifs (même page), Infos club, Historique, Messages, Velatra AI. Il ne s’agit pas de 60 captures indépendantes : la matrice combine navigation, inspection du rendu DOM et captures représentatives. Les éléments principaux ont une cible de 44 px minimum ; la séance dispose d’un CTA de 56 px. Aucun débordement horizontal observé. Champs du profil mesurés à 16 px.

## TESTS

- `npm run lint` : réussi, TypeScript sans erreur.
- `npm run build` : réussi ; avertissement de taille de certains chunks toujours présent. Aucune dépendance ajoutée.
- `npm test` avec Auth/Firestore/Storage locaux : **81/81, 5 suites, 0 échec, 0 ignoré**.
- `git diff --check` : réussi.
- Profil : modification, annulation avec ancienne valeur conservée, puis sauvegarde d’un téléphone fictif avec confirmation et persistance.
- Historique : détail des 13 séries lu, incluant poids du corps, gainage, cardio, superset et dropset.
- États vides : absence de programme, plan, coach attribué et document inspectée avec un second compte.
- Coach : connexion propriétaire/coach, dashboard, six membres, vue coaching et modèles de programmes ouverts. Absence de classe de style adhérent dans le shell coach confirmée. Aucun changement de règles, rôles ou flux métier coach.

## COMMITS

- `88849e0` — audit mobile avant modifications.
- `a3e2817022561f5c5892ece45832671033f9862a` — hiérarchie, composants, conversations et ergonomie adhérent.
- Le présent rapport est livré par un commit documentaire distinct.

## VERCEL

Publication sur `main` effectuée. Le statut GitHub **Vercel success** est confirmé pour `a3e2817` : [déploiement](https://vercel.com/victordefreitassss-projects/velatra-app/89EDhSQuj1UZKqB9fpRMVyE3UNmQ).

Contrôle public en lecture seule : `https://velatra.app/login` répond HTTP 200 ; entrée `index-RFErkfKE.js`, application `App-Dgu7IxR7.js`. Les chunks `MemberDashboard-CYXsJsDY.js` et `MessagesPage-D6O9aBhy.js` contiennent respectivement les nouveaux textes Aujourd’hui et Votre coach · conversation privée. Ce contrôle confirme les fichiers servis, pas une recette authentifiée sur des comptes de production.

## NOTE FINALE

Appréciations de conception, **pas des résultats d’une étude utilisateur** :

| Critère | /10 |
|---|---:|
| Accueil | 9,0 |
| Séances | 9,0 |
| Workout | 9,2 |
| Progression | 9,0 |
| Nutrition | 8,8 |
| Messages | 8,8 |
| Navigation | 9,0 |
| Clarté | 9,2 |
| Esthétique | 9,0 |
| Praticité | 9,0 |
| Global mobile | **9,0** |

L’action et la lecture sont désormais pensées pour le téléphone, avec largeur bornée et comparaisons en colonnes sur grand écran. Je ne certifie pas artificiellement 9,5/10 : l’usage au pouce et le clavier logiciel demandent une recette matérielle.

## LIMITES

- Aucun iPhone/Android physique disponible : clavier logiciel, Safari iOS, gestes au pouce, encoche et safe areas matérielles restent à vérifier. `visualViewport` et safe areas sont pris en charge ; redimensionnement et position des champs/CTA sont contrôlés en navigateur.
- Pas de certification WCAG complète : contrastes principaux observés et corrigés, mais pas d’audit exhaustif de chaque pixel/état ni de lecteur d’écran.
- Pas de génération Gemini dans cette recette : clé absente de l’environnement local. Mise en page et champs AI inspectés ; moteur inchangé.
- Le document local à nom long est une fixture de liste/liens ; le téléchargement d’un vrai PDF ou l’upload de pièce jointe n’a pas été revalidé de bout en bout dans cette passe.
- Recette avec données fictives locales et émulateurs. Aucune donnée de production créée ou modifiée. Le bandeau Firebase des émulateurs recouvre une partie du bas de l’écran et n’appartient pas à l’interface de production.
- Le test d’échec réseau/retry/idempotence est couvert par les tests existants ; pas de nouvelle coupure réseau manuelle pendant cette passe UI.
- Les écrans planning, boutique et galerie d’évolution gardent leur fonctionnement et leur structure existants ; cette passe ne les transforme pas en nouveaux modules.
