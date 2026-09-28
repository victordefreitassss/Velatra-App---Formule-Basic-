# Contre-vérification Mobile Foundations — 28 septembre 2026

## Périmètre et base

Revue de la PR #7, intégrée dans `41e58dd20f741b95fb5297bf4aa4559ccfca7977`. Les corrections sont dans la branche `fix/mobile-foundations-review`, PR #8. La reprise de la session interrompue a réutilisé cette branche et ses preuves, sans recommencer les changements ni écrire directement sur main.

Aucun changement de logo, de données métier, de règles Firebase, de politique de persistance Auth, de dépendances applicatives ou de structure des programmes. La destination PWA `/dashboard` et le scope `/` de la PR #7 sont conservés. La home marketing reste publique.

## Défauts reproduits avant correction

La recette initiale utilisait le code applicatif de la PR #7, des composants React réellement rendus, une couche Firebase fictive et Chromium. Les écritures des fixtures navigateur sont refusées ; aucun compte de production n'est utilisé.

Preuve : [run de reproduction 36401531075](https://github.com/victordefreitassss/Velatra-App---Formule-Basic-/actions/runs/36401531075).

| Point | Résultat observé | Correction ciblée |
|---|---|---|
| Restauration de session | Avec Auth puis profil différé, trajet `/dashboard → /login → /dashboard`. Ce n'est pas une preuve de perte du stockage Auth. | Attendre la résolution Auth et le premier résultat du profil avant la décision de route. |
| Champs hors shell | Champ et textarea de portail mesurés à 15 px, malgré la règle ajoutée dans le shell. | Contexte applicatif sur `html` pour couvrir aussi les portails, sans appliquer cette règle au marketing. |
| Transition de pages | Deux conteneurs `.va-content` simultanés pendant la transition `AnimatePresence mode=sync`. | Un seul conteneur, frontière Suspense locale et fondu court sans translation ni flou. |
| Éditeur en chargement | La navigation était déjà masquée alors que l'éditeur n'avait pas encore chargé. | Conserver la navigation pendant le fallback ; le mode de travail concentré s'applique une fois l'éditeur disponible. |
| Header adhérent | Avec un inset haut simulé de 44 px, padding calculé de seulement 6 px, écrasé par la cascade CSS. | Sélecteurs applicatifs explicites : 6 + inset pour le membre, 9 + inset pour le coach. |
| Ouverture de séance | Le fallback global pouvait masquer le shell. La première assertion vérifiait seulement sa présence DOM et était insuffisante. | Suspense propre à la séance, attente annulable et assertion renforcée sur la VISIBILITÉ du shell et l'absence du fallback global. |
| Header séance | Padding de 14 px sans l'inset simulé. | Chaque écran plein écran possède son inset ; aucun inset identique ajouté au parent. |
| Préchargement | Quatre destinations coach téléchargées malgré un signal `saveData/2g`. | Chargement différé après rendu, borné et séquentiel, désactivé sur conditions défavorables. |

Le manifest et le chemin anonyme `/dashboard → /login` passaient déjà les contrôles : ils n'ont pas été réécrits.

## Dernier défaut trouvé en inspectant les captures

Les captures après les premières corrections montraient encore la barre de navigation par-dessus le bouton « Bilan de séance » du portail coach. Un test supplémentaire a été ajouté AVANT sa correction, au commit `18f868b`.

[Run de reproduction 36409129756](https://github.com/victordefreitassss/Velatra-App---Formule-Basic-/actions/runs/36409129756) : 48 contrôles, deux échecs liés à ce problème. Le bouton occupait y=756–810 dans un viewport 390×844, mais `elementFromPoint` renvoyait un élément de la navigation à son centre. Un bouton présent et géométriquement visible n'était donc pas réellement cliquable.

La correction donne au portail plein écran coach une couche supérieure à la navigation. Le test exige désormais que le bouton reçoive le clic puis ouvre effectivement le bilan, sans enregistrer de séance ni contacter un service réel. Le chargement préalable conserve volontairement une navigation utilisable.

## Comportement final attendu et testé par la suite

- Une entrée anonyme arrive sur `/login`. Une identité dont le profil arrive avec retard ne passe plus furtivement par le login. La déconnexion explicite finit sur le login sans boucle.
- Champs mobiles testés : au moins 16 px ; champs principaux de performance maintenus à 22 px, variantes déjà plus grandes préservées. Les contrôles checkbox/radio/range ne sont pas transformés en champs texte.
- Sous insets synthétiques 44/34 px : header coach 53 px, adhérent 50 px, éditeur 52 px, workout 58 px ; écran court workout 52 px ; pied de séance protégé par l'inset bas.
- Un seul conteneur de page pendant les transitions. Le focus volontairement posé sur un bouton de navigation est conservé ; aucune animation de page avec réduction des mouvements.
- Une séance encore en téléchargement peut être annulée et ne se rouvre pas lorsque le module finit de charger.
- Préchargement : deux destinations maximum par contexte de compte/espace/rôle, imports séquentiels ; après contenu monté, deux frames, délai de 1 800 ms puis disponibilité idle si l'API existe, avec 700 ms entre imports. Aucun démarrage si hors ligne, onglet masqué, économie de données, réseau annoncé lent, saisie, édition ou séance. Un import déjà lancé n'est pas annulable ; les suivants le sont.
- Coach/owner : Clients et Coaching. Adhérent : Séances et Progression. Pas de préchargement superadmin.
- Le zoom manuel reste autorisé ; aucun `user-scalable=no` ni `maximum-scale=1` n'a été ajouté.

## Tests et preuves

La validation avant le dernier correctif de superposition est consultable dans :
- [quality-gate 36405422901](https://github.com/victordefreitassss/Velatra-App---Formule-Basic-/actions/runs/36405422901) : installation verrouillée, postinstall, TypeScript, build, 165 tests applicatifs + 5 garde-fous réussis, aucun ignoré. Auth/Firestore/Storage via `demo-velatra`.
- [recette navigateur 36405422948](https://github.com/victordefreitassss/Velatra-App---Formule-Basic-/actions/runs/36405422948) : 46 contrôles réussis et captures, mais sans encore vérifier l'occlusion du bouton coach. La lecture des captures a précisément permis de compléter cette couverture.

La suite renforcée comprend 48 contrôles. La PR doit repasser **quality-gate ET mobile-browser sur son dernier commit**, sans bypass, avant fusion. Les liens et conclusions de la dernière exécution sont enregistrés dans la conversation de la PR #8, puis vérifiés après merge. Un run antérieur vert n'est pas utilisé pour certifier un commit ultérieur.

Reproduction avec Node 24 et Java 21, depuis le lockfile :

```sh
npm ci
npm run lint
npm run build
npm run test:emulators
node scripts/qa/mobile-foundations-browser.mjs
git diff --check
```

Les dix tests unitaires supplémentaires de préchargement couvrent conditions, attente après rendu, budget, séquentialité, annulation, rejet et séparation par identité. La recette navigateur rend les composants réels avec des services fictifs, retarde les modules ciblés de 800 ms et vérifie styles calculés, routes, nombre de conteneurs, cibles de clic, focus et requêtes de préchargement.

Tailles : 375×812, 390×844, 430×932, 820×1180, 1280×800, 1440×900 ; cas court 390×500. Les captures et mesures sont des artefacts CI, pas des ressources de production. L'éditeur forcé sous une fixture membre sert à vérifier la cascade CSS, pas à accorder un droit fonctionnel à un adhérent.

## Limites explicites

- Aucun iPhone/Android physique, clavier iOS réel, installation native sur écran d'accueil ni Safari iOS n'est testé ici. Les insets 44/34 et la fenêtre courte sont synthétiques.
- Ces tests ne prouvent ni un partage de session Safari/app installée, ni la persistance après fermeture iOS, ni la conservation de toutes les données hors ligne. Le manifest règle l'entrée, pas le stockage d'authentification.
- Le navigateur de recette ne contacte pas la production. Les polices externes sont bloquées ; les captures utilisent des polices de repli. Il s'agit de preuves géométriques/fonctionnelles, pas d'une certification visuelle pixel-perfect.
- Le runtime Tailwind actuel est acquis une fois puis servi localement pour la recette ; ce téléchargement externe reste un prérequis du test. Sa migration hors CDN n'est pas réalisée dans cette mission.
- Aucun gain chiffré de performance réelle sur téléphone n'est revendiqué. Les délais observés sont des mesures de laboratoire, pas des Core Web Vitals terrain.
- L'audit ne certifie pas tous les formulaires, tous les menus, toutes les orientations ni toute l'accessibilité clavier/lecteur d'écran. La refonte générale de l'éditeur, le débordement horizontal signalé sans écran précis et les règles métier solo/studio restent hors périmètre.

## Recette à faire sur un téléphone

Ouvrir depuis l'icône, se connecter si nécessaire, fermer et rouvrir ; saisir charge et répétitions ; vérifier header et actions avec clavier ouvert ; ouvrir puis annuler une séance ; ouvrir la séance coach et son bilan ; tester pause/verrouillage/reprise. Ne pas supprimer l'installation ni effacer ses données avant d'avoir synchronisé les éventuels brouillons de séance conservés seulement sur l'appareil.
