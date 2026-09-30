# Parcours de coaching et suivi longitudinal

## Source de vérité

`coachingJourneys/{memberUid}` contient le seul parcours principal d'un adhérent : `clubId`, `memberId`, `memberUid`, `version` et un tableau ordonné de phases. Une phase porte son nom libre, objectif, durée indicative, dates, notes, statut (`planned`, `active`, `completed`, `paused`), une référence éventuelle à `programs` ou `archivedPrograms` et des IDs de modèles de bilan. Le contenu du programme n'est jamais copié. Le serveur refuse deux phases actives et utilise `version` dans une transaction pour éviter la perte de mises à jour concurrentes. Les phases terminées restent dans l'historique.

```
CLIENT
  ↓
PARCOURS
  ↓
PHASE → PROGRAMME + MODÈLES DE BILAN (références)
```

Les documents de suivi utilisent les collections `coachCheckInTemplates`, `coachCheckInAssignments`, `coachCheckInResponses`, `coachHabits`, `coachHabitEntries`. Les réponses et validations ont des IDs déterministes combinant assignation ou habitude et date d'échéance : un double clic ou retry renvoie l'entrée initiale. La réponse conserve les questions assignées pour rester interprétable après modification du modèle.

```
TEMPLATE
  ↓ snapshot des questions
ASSIGNMENT
  ↓ échéance calculée (aucun document cron)
DUE INSTANCE
  ↓ réponse unique
RESPONSE
```

Le feedback adhérent est un champ `memberFeedback` du vrai document `logs/{logId}`. Le RPE utilise le champ `rpe` déjà présent dans le journal. La séance est enregistrée avant l'ouverture du formulaire facultatif. Aucun journal ni programme n'est dupliqué.

## Deux formes de bilan

Le **suivi quotidien rapide** historique (`dailyCheckIns`, eau/sommeil/protéines/humeur, XP) reste inchangé. Il est personnel, léger et enregistré via `/api/member/daily-checkin`. Le **bilan du coach** est un questionnaire configurable, assigné à un adhérent avec fréquence et réponse historisée. Les deux historiques ne sont pas fusionnés et aucune migration implicite n'est effectuée.

Les templates acceptent texte, nombre, échelle, oui/non, choix unique et choix multiple ; ils sont créés et archivés par le coach. Une assignation contient un snapshot des questions. `once` et `manual` couvrent les questionnaires ponctuels. `daily`, `weekly` et `everyWeeks` sont calculés à partir de la date de départ ; `manual` utilise une unique date choisie. Aucun cron ni notification push n'est lancé. Les statuts `expected`, `received`, `late` sont dérivés de la date due et de l'existence de sa réponse. Les réponses ne sont jamais écrasées.

Les habitudes peuvent être booléennes ou numériques avec cible et unité facultatives, selon une fréquence quotidienne, hebdomadaire, toutes les X semaines ou unique. La clé de validation est la date d'échéance calculée ; une validation tardive dans la période hebdomadaire reste donc une seule entrée logique. Elle appartient à l'adhérent et ne se réécrit pas. La synthèse des habitudes quotidiennes compte les validations ayant atteint la cible sur les sept derniers jours ; les autres affichent l'échéance en cours. Il ne s'agit pas d'une interprétation médicale.

## Autorisations et protection des données

Toutes les lectures/écritures nouvelles passent par `/api/followup/*`, derrière Firebase Auth et le profil résolu côté serveur. Les collections Firestore nouvelles sont explicitement refusées aux SDK clients. Les tests de règles le vérifient pour adhérent, coach, owner et anonyme. La règle `logs` empêche un client de créer, modifier ou supprimer le feedback serveur, tout en conservant les autres écritures de séance autorisées. **Le déploiement des règles incluses dans cette branche doit précéder l'activation de l'interface en production.**

Le serveur résout `clubId`, `memberId` et `assignedCoachUid` depuis les profils ; ces champs fournis par le client sont ignorés. L'adhérent lit uniquement son suivi et répond à ses propres bilans/habitudes/séances. Le coach Studio n'accède qu'aux membres dont `assignedCoachUid` est son UID courant. L'owner accède à son club et, pour Solo/Studio, sa propriété est vérifiée par `clubs/{clubId}.ownerId`. Solo utilise l'owner comme référent implicite, sans écrire une fausse assignation. Le comportement owner Legacy reste inchangé. Un accès entre clubs est refusé. Les requêtes sont bornées ; les notes, commentaires, questions et payloads ont des limites de taille. Aucun diagnostic n'est produit.

Les dates métier et échéances de ce module utilisent `Europe/Paris`, comme la confirmation des séances. Le suivi quotidien rapide historique utilise sa convention UTC antérieure ; il n'a pas été migré silencieusement. L'heure d'envoi est conservée en ISO UTC.

## Surfaces et formats

Client 360 > Coaching présente les phases et leurs actions. Vue d'ensemble affiche seulement phase active et prochaine étape via un endpoint léger. Client 360 > Suivi présente bilans, modèles, assignations, historique récent des réponses, habitudes et derniers ressentis. Le dashboard coach affiche un petit nombre de bilans attendus ou en retard. L'accueil adhérent affiche le bilan dû, les habitudes du jour et la phase active près de la séance, avec un formulaire vertical sur téléphone ; il ne charge pas l'historique coach complet. Les mises en page restent en une colonne sur petit téléphone et gagnent une seconde colonne pour les outils coach dès que l'espace le permet ; aucune table horizontale n'est nécessaire. Les erreurs sont locales aux panneaux et ne bloquent pas la séance.

## Différé

Pas de diagnostic, adaptation automatique par IA, notifications push, Pulse complet, wearables, moteur cron ou édition complexe du Program Builder. Une future itération pourra ajouter une pagination dédiée aux historiques anciens et un éditeur complet des phases existantes ; les réponses actuelles restent conservées.
