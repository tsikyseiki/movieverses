import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/mv/LegalPage";

export const Route = createFileRoute("/a-propos")({
  head: () => ({ meta: [{ title: "À propos — MovieVerse" }, { name: "description", content: "MovieVerse : catalogue gratuit de films, animés et séries d'animation, avec assistant IA, listes partagées et outils pour choisir quoi regarder." }, { property: "og:title", content: "À propos de MovieVerse" }, { property: "og:type", content: "website" }] }),
  component: About,
});

function About() {
  return (
    <LegalPage title="À propos de MovieVerse">
      <p>MovieVerse aide à trouver quoi regarder : films, animés japonais et séries d'animation occidentales, avec des données en temps réel, des outils pour décider (« Que regarder ce soir ? », comparateur, recherche avancée) et une communauté.</p>
      <h2>Ce que vous y trouvez</h2>
      <ul>
        <li>Un catalogue en direct, filtrable par genre, année, note et tri.</li>
        <li>Un assistant IA sur chaque fiche, qui connaît le titre et cherche les infos récentes.</li>
        <li>Des listes personnelles et partagées en temps réel, un journal de visionnage et des trophées.</li>
        <li>Un calendrier des sorties, la reconnaissance d'affiche par photo et des films libres de droits.</li>
        <li>Une <Link to="/developpeurs">API publique</Link> et une page d'<Link to="/statut">état du système</Link>.</li>
      </ul>
      <h2>Crédits</h2>
      <p>Ce produit utilise l'API de TMDB mais n'est ni approuvé ni certifié par TMDB. Données d'animés : AniList. Films du domaine public : Internet Archive. Bandes-annonces : YouTube.</p>
    </LegalPage>
  );
}
