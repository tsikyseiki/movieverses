import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bot, CircleHelp, Heart, ListPlus, MessageCircle, ScanSearch,
  Search, Settings, ShieldCheck, Trophy, UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/aide")({
  head: () => ({
    meta: [
      { title: "Aide et mode d’emploi — MovieVerse" },
      { name: "description", content: "Découvrez comment utiliser les catalogues, listes, avis, sports, scans et outils de MovieVerse." },
      { property: "og:title", content: "Aide et mode d’emploi — MovieVerse" },
      { property: "og:description", content: "Le guide complet des fonctions et des rôles sur MovieVerse." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HelpPage,
});

const features = [
  { icon: Search, title: "Trouver un titre", text: "Utilisez la recherche en haut de l’écran ou ouvrez un catalogue. Les genres, l’année et la note permettent ensuite d’affiner les résultats.", to: "/recherche" as const, label: "Ouvrir la recherche" },
  { icon: Heart, title: "Favoris et historique", text: "Touchez le cœur d’une affiche pour la conserver. Les titres consultés rejoignent automatiquement votre historique dans Ma liste.", to: "/ma-liste" as const, label: "Voir ma liste" },
  { icon: ListPlus, title: "Listes à partager", text: "Créez des collections personnelles, invitez d’autres membres et partagez une sélection avec un simple lien.", to: "/listes" as const, label: "Gérer mes listes" },
  { icon: MessageCircle, title: "Avis et discussions", text: "Depuis la fiche d’un titre, publiez une note et un avis. La communauté peut aimer, commenter ou signaler une publication.", to: "/communaute" as const, label: "Voir la communauté" },
  { icon: Bot, title: "Assistant cinéma", text: "Posez vos questions depuis une fiche : explications, recommandations ou détails sur un titre. Précisez si vous souhaitez éviter les spoilers.", to: "/films" as const, label: "Choisir un film" },
  { icon: Trophy, title: "Matchs et sports", text: "Consultez les scores, résultats et prochains matchs par sport. Les chaînes indiquées sont des diffuseurs officiels : MovieVerse n’héberge aucun flux.", to: "/sports" as const, label: "Voir les sports" },
  { icon: ScanSearch, title: "Reconnaître et lire", text: "Envoyez la photo d’une affiche pour l’identifier. Pour les mangas disponibles, ouvrez une fiche puis choisissez un chapitre à lire.", to: "/reconnaitre" as const, label: "Reconnaître une affiche" },
  { icon: Settings, title: "Personnaliser l’expérience", text: "Le bouton des paramètres règle le thème, la taille du texte, le contraste, les animations, le mode famille et la consommation de données.", to: "/profil" as const, label: "Voir mon profil" },
];

const roles = [
  { name: "Membre", icon: UserRound, text: "Explore, crée des listes, publie des avis, commente et personnalise son profil." },
  { name: "Modérateur", icon: ShieldCheck, text: "Peut examiner les signalements et masquer ou supprimer les contenus qui enfreignent les règles." },
  { name: "Administrateur", icon: ShieldCheck, text: "Gère les rôles et consulte les informations nécessaires à l’administration du service." },
];

function HelpPage() {
  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-24 pt-36 md:px-8 lg:pt-32">
      <header className="max-w-3xl">
        <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-primary"><CircleHelp className="h-4 w-4" /> Centre d’aide</span>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">Tout MovieVerse, simplement.</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">Retrouvez le mode d’emploi de chaque fonction et comprenez ce que peut faire chaque rôle.</p>
        <Button asChild size="lg" className="mt-7 h-12 px-6"><Link to="/films">Commencer par les films</Link></Button>
      </header>

      <section className="mt-16 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2" aria-label="Fonctions de MovieVerse">
        {features.map(({ icon: Icon, title, text, to, label }) => (
          <article key={title} className="flex min-h-64 flex-col bg-card p-6 md:p-8">
            <Icon className="h-7 w-7 text-primary" />
            <h2 className="mt-6 text-xl font-bold">{title}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{text}</p>
            <Link to={to} className="mt-auto pt-6 text-sm font-semibold text-primary hover:underline">{label}</Link>
          </article>
        ))}
      </section>

      <section className="mt-20">
        <p className="text-sm font-semibold uppercase text-primary">Rôles et responsabilités</p>
        <h2 className="mt-3 text-3xl font-bold md:text-4xl">Qui peut faire quoi ?</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {roles.map(({ name, icon: Icon, text }) => (
            <article key={name} className="border-l-2 border-primary bg-muted/40 p-6">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-5 text-xl font-bold">{name}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}