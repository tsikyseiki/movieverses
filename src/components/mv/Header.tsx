import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CATEGORIES, type Kind } from "@/lib/catalog";
import { SearchBar } from "./SearchBar";
import { SettingsSheet } from "./SettingsSheet";
import { Notifications } from "./Notifications";
import { cn } from "@/lib/utils";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <header className={cn("fixed inset-x-0 top-0 z-40 transition-all duration-500", scrolled ? "bg-background/85 shadow-lg backdrop-blur-xl" : "bg-gradient-to-b from-scrim/80 to-transparent")}>
      <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-3 md:px-8">
        <Link to="/" className="font-display text-xl font-extrabold tracking-tight">
          Movie<span className="text-primary">Verse</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {(Object.keys(CATEGORIES) as Kind[]).map((k) => (
            <Link key={k} to={CATEGORIES[k].path as "/films"} className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground" activeProps={{ className: "!text-foreground bg-accent" }}>
              {CATEGORIES[k].label}
            </Link>
          ))}
          <Link to="/sports" className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground" activeProps={{ className: "!text-foreground bg-accent" }}>Sports</Link>
          <Link to="/ma-liste" className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground" activeProps={{ className: "!text-foreground bg-accent" }}>
            Ma liste
          </Link>
        </nav>
        <div className="ml-auto flex flex-1 items-center justify-end gap-1">
          <div className="hidden flex-1 justify-end sm:flex"><SearchBar /></div>
          <Notifications />
          <SettingsSheet />
        </div>
      </div>
      <div className="px-4 pb-3 sm:hidden"><SearchBar /></div>
      <nav className="no-scrollbar flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
        {(Object.keys(CATEGORIES) as Kind[]).map((k) => (
          <Link key={k} to={CATEGORIES[k].path as "/films"} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>
            {CATEGORIES[k].label}
          </Link>
        ))}
        <Link to="/sports" className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>Sports</Link>
        <Link to="/ma-liste" className="shrink-0 rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}>Ma liste</Link>
      </nav>
    </header>
  );
}
