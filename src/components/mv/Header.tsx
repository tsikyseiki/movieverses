import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CATEGORIES, type Kind } from "@/lib/catalog";
import { SearchBar } from "./SearchBar";
import { MainMenu } from "./MainMenu";
import { ThemeToggle } from "./ThemeToggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, CircleHelp } from "lucide-react";
import { useRole } from "@/lib/roles";
import { SettingsSheet } from "./SettingsSheet";
import { Notifications } from "./Notifications";
import { cn } from "@/lib/utils";
import { AccountButton, InstallButton } from "./AccountButton";

const MORE: { to: string; label: string; hint: string }[] = [
  { to: "/ce-soir", label: "Que regarder ce soir ?", hint: "4 questions, 3 idées" },
  { to: "/calendrier", label: "Calendrier des sorties", hint: "Films et épisodes d'animés" },
  { to: "/comparer", label: "Comparer deux titres", hint: "Côte à côte" },
  { to: "/classiques", label: "Classiques du domaine public", hint: "Films complets gratuits" },
  { to: "/journal", label: "Journal & trophées", hint: "Vos statistiques" },
  { to: "/communaute", label: "Avis & discussions", hint: "La communauté" },
  { to: "/reconnaitre", label: "Reconnaître une affiche", hint: "Par photo, grâce à l'IA" },
  { to: "/bilan", label: "Mon bilan de l'année", hint: "Wrapped" },
  { to: "/listes", label: "Mes listes", hint: "Collections partageables" },
  { to: "/partage", label: "Listes partagées", hint: "À plusieurs, en direct" },
  { to: "/membres", label: "Classement", hint: "Membres les plus actifs" },
  { to: "/developpeurs", label: "API publique", hint: "Pour les développeurs" },
];

function MoreMenu() {
  const { canModerate } = useRole();
  const items = canModerate ? [...MORE, { to: "/moderation", label: "Modération", hint: "Signalements" }] : MORE;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground">
          Découvrir <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        {items.map((m) => (
          <Link key={m.to} to={m.to as "/"} className="block rounded-lg px-3 py-2 hover:bg-accent">
            <p className="text-sm font-medium">{m.label}</p>
            <p className="text-xs text-muted-foreground">{m.hint}</p>
          </Link>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const isHome = useRouterState({ select: (state) => state.location.pathname === "/" });
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <header className={cn("fixed inset-x-0 top-0 z-40 transition-all duration-500", scrolled ? "bg-background/85 shadow-lg backdrop-blur-xl" : "bg-gradient-to-b from-scrim/80 to-transparent")}>
      <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-3 md:px-8">
        <MainMenu />
        <Link to="/" className="font-display text-xl font-extrabold tracking-tight">
          Movie<span className="text-primary">Verse</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {!isHome && (Object.keys(CATEGORIES) as Kind[]).map((k) => (
            <Link key={k} to={CATEGORIES[k].path as "/films"} className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground" activeProps={{ className: "!text-foreground bg-accent" }}>
              {CATEGORIES[k].label}
            </Link>
          ))}
          {isHome && <Link to="/aide" className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"><CircleHelp className="h-4 w-4" /> Aide</Link>}
          <Link to="/sports" className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground" activeProps={{ className: "!text-foreground bg-accent" }}>Sports</Link>
          <Link to="/ma-liste" className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground" activeProps={{ className: "!text-foreground bg-accent" }}>
            Ma liste
          </Link>
          <MoreMenu />
        </nav>
        <div className="ml-auto flex flex-1 items-center justify-end gap-1">
          <div className="hidden flex-1 justify-end sm:flex"><SearchBar /></div>
          <InstallButton />
          <ThemeToggle />
          <Notifications />
          <AccountButton />
          <SettingsSheet />
        </div>
      </div>
      <div className="px-4 pb-3 sm:hidden"><SearchBar /></div>
      <nav className="no-scrollbar flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
        {!isHome && (Object.keys(CATEGORIES) as Kind[]).map((k) => (
          <Link key={k} to={CATEGORIES[k].path as "/films"} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>
            {CATEGORIES[k].label}
          </Link>
        ))}
        {isHome && <Link to="/aide" className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1 text-xs"><CircleHelp className="h-3.5 w-3.5" /> Aide</Link>}
        <Link to="/sports" className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>Sports</Link>
        <Link to="/ma-liste" className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>Ma liste</Link>
        <Link to="/classiques" className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>Classiques</Link>
        <Link to="/journal" className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>Journal</Link>
        <Link to="/ce-soir" className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>Ce soir</Link>
        <Link to="/calendrier" className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>Calendrier</Link>
        <Link to="/comparer" search={{ a: undefined, b: undefined }} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>Comparer</Link>
        <Link to="/communaute" className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>Avis</Link>
        <Link to="/reconnaitre" className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>Affiche</Link>
        <Link to="/listes" className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>Listes</Link>
        <Link to="/partage" className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>Partage</Link>
        <Link to="/membres" className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>Classement</Link>
      </nav>
    </header>
  );
}
