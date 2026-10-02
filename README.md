# Verse Explorer

Crée un site vitrine moderne "MovieVerse" pour un catalogue de films, animés manga et animés occidentaux, avec données en temps réel via API.**



**Structure générale :**

- Page d'accueil avec un design moderne, épuré, professionnel (pas un rendu débutant), animations et transitions fluides

- 3 catégories principales clairement séparées : **Films**, **Animé Manga**, **Animé Occidental**

- Chaque catégorie a ses propres sous-filtres par genre :

  - Films : Romance, Action, Horreur, Zombie, Comédie, Thriller, Science-fiction, Drame, Aventure, Fantastique, Documentaire, Animation, Guerre, Policier

  - Animé Manga : Shonen, Shojo, Seinen, Isekai/Réincarnation, Mecha, Slice of Life, Horreur, Sport, Fantastique, Comédie

  - Animé Occidental : Action, Comédie, Aventure, Super-héros, Science-fiction, Famille

- Les filtres doivent être stricts : aucun contenu ne doit apparaître hors de sa catégorie/genre



**Données et API :**

- Pour les Films : utiliser l'API **TMDB** — je fournirai ma propre clé API

- Pour les Animés (Manga et Occidental) : utiliser **AniList** ou **MangaDex** selon pertinence

- Afficher pour chaque titre : affiche à jour, note, synopsis/infos, disponibilité, date de sortie

- Les infos détaillées apparaissent au clic sur un bouton "Explorer" depuis la vitrine d'accueil



**Fiche détail enrichie :**

- Bande-annonce intégrée (via YouTube, fournie par l'API TMDB)

- Liste du casting/acteurs principaux (pour les films)

- Section "Titres similaires/recommandés" en bas de la fiche

- Bouton "Partager" pour copier le lien de la fiche

- Notation personnelle possible en plus de la note officielle (stockée localement)



**Recherche et navigation :**

- Barre de recherche en haut avec suggestions en direct pendant la saisie

- Système de favoris/watchlist, sauvegardé localement sur l'appareil (sans compte requis)

- Historique "Vu récemment"



**Lecture de scans (Animé Manga uniquement) :**

- Bouton **"Lire le scan"** uniquement sur les fiches Animé Manga, via l'API MangaDex, pour lire les chapitres disponibles



**Menu paramètres professionnel :**

- Icône menu **3 traits horizontaux** en haut de l'écran

- Panneau de paramètres façon application premium (Netflix, Spotify) : thème clair/sombre, taille de police ajustable, langue, préférences d'affichage des catégories



**Contenu dynamique :**

- Le contenu mis en avant en haut de la page d'accueil doit être **différent à chaque ouverture** (rotation basée sur tendances/nouveautés), comme un feed Facebook ou TikTok

- Notifications pour les nouveautés/sorties à venir dans les genres favoris de l'utilisateur



**Comportement général :**

- Mode hors-ligne partiel (PWA) — consultation des derniers catalogues chargés même sans connexion

- Catalogue à défilement infini, fluide, sans latence perceptible

- Design responsive (mobile et ordinateur)

- Grille de cartes avec image, titre, note visible directement

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://movieverses.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0c598a81-aafc-4306-87d2-757edda64554).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
