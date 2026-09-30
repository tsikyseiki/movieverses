# Matchs & Sports Live pour MovieVerse

## Résultat
- Ajouter une page `/sports` accessible depuis la navigation et l’accueil, sans modifier la séparation des trois catalogues.
- Proposer quatre vues rapides : En direct, Aujourd’hui, Prochains matchs et Chaînes TV.
- Filtrer le tableau par Football, Basketball, Tennis et Autres.

## Expérience sportive
- Alimenter la démonstration avec des données structurées : équipes, fanions, compétition, scores, minute, horaire local et diffuseurs officiels.
- Actualiser localement les chronomètres et les scores de démonstration afin de rendre l’interface vivante, avec une mention explicite que les données sont simulées.
- Ouvrir une fenêtre détaillée au clic : statistiques, diffuseurs légaux et espace Résumé & Highlights prêt pour une vidéo officielle.
- Afficher des écrans de chargement et un état vide adapté aux filtres.
- Utiliser la localisation du navigateur uniquement après accord, détecter le pays, convertir les horaires dans le fuseau du téléphone et afficher une alerte pour les matchs de l’équipe nationale à venir. Prévoir un fonctionnement neutre si l’accès est refusé.

## Style global
- Harmoniser toutes les pages avec une palette cinéma gris profond, surfaces graphite, texte blanc argenté et accent rouge moderne.
- Préserver les thèmes clair/sombre existants, la lisibilité mobile et ordinateur, ainsi que les composants et mises en page actuels.

## Installation et hors ligne
- Compléter l’installation Android avec une icône adaptée et les métadonnées de l’application.
- Mettre en cache l’interface, les pages visitées, les images et les données déjà consultées, puis privilégier les données fraîches au retour de la connexion.
- Ajouter un indicateur clair hors ligne/en ligne et éviter toute mise en cache des opérations sensibles.

## Technique
- Créer une source locale typée pour les matchs et un écran React dédié, sans API sportive payante ni flux vidéo illégal.
- Ajouter la route, les liens de navigation et les métadonnées sociales propres à la page Sports.
- Utiliser exclusivement les composants et couleurs sémantiques du design existant.
- Vérifier la compilation, les erreurs du navigateur, la page Sports et l’affichage mobile/ordinateur.
