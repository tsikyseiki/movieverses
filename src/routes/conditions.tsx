import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/mv/LegalPage";

export const Route = createFileRoute("/conditions")({
  head: () => ({ meta: [{ title: "Conditions d'utilisation — MovieVerse" }, { name: "description", content: "Règles d'utilisation de MovieVerse." }] }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage title="Conditions d'utilisation" updated="3 octobre 2026">
      <p>En utilisant MovieVerse, vous acceptez les règles suivantes.</p>
      <h2>Le service</h2>
      <p>MovieVerse est un service d'information et de découverte : fiches, notes, bandes-annonces et liens vers des plateformes. Il <strong>ne diffuse pas de contenu protégé</strong>. Les films de la section « Classiques » proviennent d'Internet Archive et relèvent du domaine public ou d'une diffusion libre ; vérifiez la licence indiquée sur la page de chaque film.</p>
      <h2>Votre compte</h2>
      <ul>
        <li>Vous êtes responsable de la confidentialité de vos identifiants.</li>
        <li>Les informations fournies doivent être exactes.</li>
        <li>Nous pouvons suspendre un compte qui enfreint ces règles.</li>
      </ul>
      <h2>Avis et commentaires</h2>
      <p>Vous restez responsable de ce que vous publiez. Sont interdits : insultes, harcèlement, haine, spam, publicité, contenus illégaux et spoilers non signalés. Les modérateurs peuvent masquer ou supprimer tout contenu signalé.</p>
      <h2>Utilisation de l'API publique</h2>
      <p>L'API publique est gratuite, en lecture seule et limitée en débit. Toute tentative de contournement, de surcharge ou de collecte abusive entraîne un blocage.</p>
      <h2>Contenus d'IA</h2>
      <p>Les réponses de l'assistant, les résumés de critiques et la reconnaissance d'affiche sont générés par une IA : ils peuvent contenir des erreurs et ne remplacent pas les sources officielles.</p>
      <h2>Propriété et crédits</h2>
      <p>Les affiches, synopsis et métadonnées appartiennent à leurs ayants droit. Ce produit utilise l'API de TMDB mais n'est ni approuvé ni certifié par TMDB. Les données d'animés proviennent d'AniList.</p>
      <h2>Responsabilité</h2>
      <p>Le service est fourni « en l'état », sans garantie de disponibilité permanente. Consultez la page <a href="/statut">État du système</a> pour suivre son fonctionnement.</p>
    </LegalPage>
  );
}
