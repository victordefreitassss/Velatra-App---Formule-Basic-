# Audit initial — première expérience bêta

Établi avant les modifications produit, sur `cc467770e8f69820aac8450d76f3a08feec84bc6` (main vérifié). Recette réelle dans le navigateur intégré, environnement local `demo-velatra`, comptes fictifs créés via les formulaires. Pas de compte ou donnée de production.

## Parcours observé

Coach Camille : inscription avec invitation → accueil 0/5 → coordonnées → adhérent Alex → programme manuel avec un exercice choisi → attribution par enregistrement → réservation → fiche de suivi. Progression 5/5 conservée après reconnexion. Adhérent Alex : connexion provisoire → quatre étapes de profil → programme → trois séries → séance enregistrée → suivi quotidien → rechargement, données toujours présentes.

Repères de clics (hors saisie et hors actions de contrôle de l’audit) : inscription depuis login 3 actions + saisie ; coordonnées 4 actions avec retour Accueil ; premier adhérent 2 actions + saisie puis dossier ouvert ; premier programme 5 actions depuis dossier, dont une action inutile pour remplacer le squat imposé ; première réservation 9 actions avec configuration et choix de date ; adhérent : 4 validations du profil puis 2 actions pour ouvrir sa séance. Compte rendu d’un parcours, pas une mesure statistique d’utilisabilité.

## P0 — blocage total

Aucun reproduit dans les parcours locaux terminés. Cela ne valide pas les emails réels, Stripe, Gemini, les appareils physiques ni la délivrabilité des invitations en production.

## P1 — corrections prioritaires

| Écran | Problème observé | Impact | Correction proposée |
| --- | --- | --- | --- |
| Compléter mon espace | Fiche en lecture seule, téléphone nécessaire non expliqué, pas de prochaine action après sauvegarde | Le coach ignore comment valider l’étape ; retour manuel à l’accueil | Ouvrir l’édition depuis l’onboarding, expliquer les coordonnées utiles, confirmer et proposer la suite |
| Ajouter un adhérent | Douze champs visibles alors que seuls nom/email/mot de passe sont nécessaires ; aucune instruction claire de transmission de l’accès | Hésitation et risque d’attendre un email qui n’est pas annoncé/envoyé par ce parcours | Distinguer accès requis et profil facultatif, expliciter les identifiants à transmettre sans conserver le mot de passe |
| Éditeur | « Ajouter un exercice » ajoute immédiatement Squat barre | Mouvement non choisi susceptible d’être enregistré ; clic de remplacement supplémentaire | Ouvrir le choix de mouvement avant d’ajouter une ligne |
| Planning : semaine | La bande passe au 28 septembre–4 octobre, le détail reste au 27 septembre | Le coach lit la mauvaise date et pense ne pas avoir de disponibilités | Déplacer ensemble semaine et date sélectionnée |
| Planning : séance | Une réservation de 09:00 est affichée deux fois, avec et sans coach, alors que le résumé compte une séance | Doute sur un double enregistrement | Associer une réservation à un seul créneau, en conservant les vrais créneaux de plusieurs coachs |
| Planning vide | Le dimanche affiche « Configurez vos disponibilités » même après configuration du lundi au vendredi ; le lien ouvre le haut d’une longue page | Détour inutile ; paramètres pertinents difficiles à trouver | Distinguer journée vide et planning non configuré ; ouvrir directement la section planning |
| Séance adhérent | Poids du corps : champs charge vides, validation « Remplissez tous les champs ! » | L’adhérent ne comprend pas quelle charge saisir | Libellés explicites, indication 0 kg sans charge, erreur précise ; préserver la validation existante |
| Paramètres / studio | Sélecteur technique de base de données visible aux coachs ; demande staff vers un numéro WhatsApp de démonstration | Confusion et fausse piste pour le responsable de studio | Réserver le diagnostic à l’environnement de développement et au superadmin ; signaler honnêtement l’indisponibilité du staff au lieu du faux lien |

## P2 / P3 — relevés sans refonte

- CRM : « Pipeline Commercial », « leads », « Glissez ici » sur un écran entièrement vide : jargon et absence d’explication d’amorçage (P2).
- Documents : action Importer visible, empty state utile, intitulé « Drive Intégré » technique (P2).
- Coach indépendant : vocabulaire « club » et « staff » encore répandu (P2).
- Après 5/5 avec un seul membre, l’accueil conserve la checklist ; le tableau de bord mature nécessite au moins quatre adhérents (P2, pas de changement d’architecture demandé).
- « Coach non attribué » sur la fiche créée par un propriétaire : attribution explicite à distinguer de la propriété de l’espace (P2, ne pas inventer d’affectation).
- Onboarding adhérent : valeurs par défaut (âge/poids/taille) à confirmer ; pas de test de reprise inter-appareils (P2).
- Un programme continu d’un seul jour revient à 0 % du nouveau cycle après la séance ; la séance et les XP sont pourtant enregistrés (P2).
- « 1 jours », « 1 séances », « Exos », « S1/J1 » : petites incohérences de texte (P3).

## Points solides

Accueil coach calme, progression et CTA lisibles. Masquage/reprise déjà disponible. Aucun programme généré imposé. Dossier automatiquement ouvert après création. Enregistrement du programme associé au bon adhérent. Réservation confirmée et visible côté adhérent. Suivi quotidien confirmé et conservé après rechargement. Empty states membres, programmes et documents disposent d’un chemin pour commencer.

## Limites de l’audit initial

Mobile 375/390 et desktop 1280/1440 utilisés sur des étapes réelles ; la matrice finale inclura 430 et 1920. Le bandeau des émulateurs recouvre partiellement le bord inférieur du navigateur et gêne certains clics de la barre mobile : artefact QA, pas attribué au produit en production. Pas de clavier logiciel réel ni test physique à une main. Le studio est examiné comme espace propriétaire : création de comptes staff indisponible dans cette configuration, aucun parcours multi-coachs complet prétendu.
