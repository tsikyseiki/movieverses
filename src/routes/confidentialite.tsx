import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/mv/LegalPage";
import { SITE } from "@/lib/site-config";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({ meta: [{ title: "Politique de confidentialité — MovieVerse" }, { name: "description", content: "Comment MovieVerse traite vos données, les cookies et les annonces Google AdSense." }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage title="Politique de confidentialité" updated="3 octobre 2026">
      <p>MovieVerse est un catalogue gratuit de films, d'animés et de séries. Cette page explique quelles données sont utilisées, pourquoi, et comment garder le contrôle.</p>
      <h2>Données de votre compte</h2>
      <p>À l'inscription, nous enregistrons votre adresse email et, si vous les renseignez, votre pseudo, téléphone, pays, région, ville, date de naissance, genre, photo et bio. Ces informations ne sont <strong>jamais vendues</strong>. Votre email, votre téléphone et votre localisation ne sont jamais montrés aux autres membres. Seul un profil que vous rendez public affiche pseudo, photo, bio et trophées.</p>
      <h2>Données d'usage</h2>
      <ul>
        <li><strong>Sur votre appareil :</strong> favoris, notes, historique, journal de visionnage et réglages (stockage local du navigateur).</li>
        <li><strong>Avec votre compte :</strong> ces données peuvent être synchronisées pour les retrouver sur plusieurs appareils.</li>
        <li><strong>Activité « en direct » :</strong> la fonction « En ce moment sur MovieVerse » est anonyme : seul le titre consulté est partagé, jamais votre identité.</li>
        <li><strong>Statistiques :</strong> le tableau de bord de l'administrateur n'affiche que des chiffres agrégés et anonymisés.</li>
      </ul>
      <h2>Publicité (Google AdSense)</h2>
      <p>Le site affiche des annonces fournies par Google. Google peut utiliser des cookies ou des identifiants pour diffuser et mesurer les annonces. Vous choisissez entre annonces personnalisées et non personnalisées dans la bannière de confidentialité, et vous pouvez changer d'avis à tout moment dans <a href="/donnees">Données & confidentialité</a>. Pour en savoir plus : <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer noopener">comment Google utilise les données</a> et <a href="https://myadcenter.google.com" target="_blank" rel="noreferrer noopener">Mon Ad Center</a>.</p>
      <h2>Services tiers</h2>
      <ul>
        <li>TMDB et AniList (catalogues), Internet Archive (films du domaine public), YouTube (bandes-annonces).</li>
        <li>Supabase (comptes et base de données) et Lovable (hébergement).</li>
        <li>Google Gemini : l'assistant, le résumé des critiques et la reconnaissance d'affiche envoient à Google le titre consulté, vos questions ou l'image que vous importez, pour générer une réponse.</li>
      </ul>
      <h2>Vos droits</h2>
      <p>Vous pouvez à tout moment <strong>exporter</strong> vos données, les <strong>supprimer</strong> de votre appareil, ou demander la suppression de votre compte depuis la page <a href="/donnees">Données & confidentialité</a> ou la page <a href="/contact">Contact</a>. Conformément au RGPD, vous disposez aussi d'un droit d'accès, de rectification, d'opposition et de limitation du traitement.</p>
      <h2>Conservation et sécurité</h2>
      <p>Les données du compte sont conservées tant que le compte existe. Les échanges sont chiffrés (HTTPS), les accès à la base sont restreints par des règles de sécurité par utilisateur, et l'API publique est limitée en débit.</p>
      <h2>Contact</h2>
      <p>{SITE.contactEmail ? <>Écrivez-nous à <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.</> : <>Utilisez la page <a href="/contact">Contact</a>.</>}</p>
    </LegalPage>
  );
}
