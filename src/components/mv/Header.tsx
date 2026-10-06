import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { SearchBar } from "./SearchBar";
import { MainMenu } from "./MainMenu";
import { ThemeToggle } from "./ThemeToggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
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
  const ref = useRef<HTMLElement>(null);
  const isHome = useRouterState({ select: (state) => state.location.pathname === "/" });
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  // Publie la hauteur réelle de l'en-tête (--mv-header-h) : les barres fixes des pages se collent juste dessous
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--mv-header-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => { ro.disconnect(); document.documentElement.style.removeProperty("--mv-header-h"); };
  }, []);
  return (
    <header ref={ref} className={cn("fixed inset-x-0 top-0 z-40 transition-all duration-500", scrolled ? "bg-background/85 shadow-lg backdrop-blur-xl" : "bg-gradient-to-b from-scrim/80 to-transparent")}>
      <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-3 md:px-8">
        <MainMenu />
        <Link to="/" className="font-display text-xl font-extrabold tracking-tight">
          Movie<span className="text-primary">Verse</span>
        </Link>
        {/* Accueil : aucune option en haut. Ailleurs : accès rapide aux catalogues et à Ma liste (tout le reste est dans le menu) */}
        {!isHome && (
          <nav className="hidden items-center gap-1 lg:flex">
            <Link to="/films" className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground">Catalogues</Link>
            <Link to="/ma-liste" className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground" activeProps={{ className: "!text-foreground bg-accent" }}>Ma liste</Link>
            <MoreMenu />
          </nav>
        )}
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
    </header>
  );
}
