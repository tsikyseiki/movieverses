import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity, BarChart3, CalendarDays, CircleHelp, Clapperboard, Code2, Database, FileText, Film, Home, Info, Landmark, ListPlus, LogOut, Mail, Medal,
  Menu, MessagesSquare, MonitorPlay, Moon, NotebookPen, ScanSearch, Scale, Search, ShieldAlert, ShieldCheck, SlidersHorizontal, Sparkles, Sun, Trophy, Tv, UserRound, Users, Heart,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/lib/auth";
import { useRole } from "@/lib/roles";
import { useStore } from "@/lib/store";
import { useIsDark } from "./ThemeToggle";

type Item = { to: string; label: string; hint?: string; icon: LucideIcon };
type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  { title: "Explorer", items: [
    { to: "/", label: "Accueil", icon: Home },
    { to: "/films", label: "Films", icon: Film },
    { to: "/manga", label: "Animés manga", icon: Clapperboard },
    { to: "/occidental", label: "Animés occidentaux", icon: Tv },
    { to: "/series", label: "Séries", icon: MonitorPlay },
    { to: "/sports", label: "Sports en direct", icon: Trophy },
    { to: "/classiques", label: "Classiques du domaine public", hint: "Films complets gratuits", icon: Landmark },
  ] },
  { title: "Outils", items: [
    { to: "/recherche", label: "Recherche avancée", hint: "Filtres, tri, recherches enregistrées", icon: SlidersHorizontal },
    { to: "/ce-soir", label: "Que regarder ce soir ?", icon: Sparkles },
    { to: "/calendrier", label: "Calendrier des sorties", icon: CalendarDays },
    { to: "/comparer", label: "Comparer deux titres", icon: Scale },
    { to: "/reconnaitre", label: "Reconnaître une affiche", hint: "Par photo, grâce à l'IA", icon: ScanSearch },
  ] },
  { title: "Ma bibliothèque", items: [
    { to: "/ma-liste", label: "Ma liste", icon: Heart },
    { to: "/listes", label: "Mes listes", hint: "Collections partageables", icon: ListPlus },
    { to: "/partage", label: "Listes partagées", hint: "À plusieurs, en direct", icon: Users },
    { to: "/journal", label: "Journal & trophées", icon: NotebookPen },
    { to: "/bilan", label: "Mon bilan de l'année", icon: BarChart3 },
  ] },
  { title: "Communauté", items: [
    { to: "/communaute", label: "Avis & discussions", icon: MessagesSquare },
    { to: "/membres", label: "Classement des membres", icon: Medal },
  ] },
  { title: "Mon compte", items: [
    { to: "/profil", label: "Mon profil", icon: UserRound },
    { to: "/donnees", label: "Données & confidentialité", hint: "Export, suppression, annonces", icon: Database },
  ] },
  { title: "Pro & aide", items: [
    { to: "/aide", label: "Aide & mode d'emploi", hint: "Toutes les fonctions expliquées", icon: CircleHelp },
    { to: "/developpeurs", label: "API publique", hint: "Documentation et limites", icon: Code2 },
    { to: "/statut", label: "État du système", icon: Activity },
    { to: "/contact", label: "Contact & suggestions", icon: Mail },
    { to: "/a-propos", label: "À propos", icon: Info },
    { to: "/confidentialite", label: "Confidentialité", icon: FileText },
    { to: "/conditions", label: "Conditions d'utilisation", icon: FileText },
  ] },
];

export function MainMenu() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const { user } = useAuthUser();
  const { isAdmin, canModerate } = useRole();
  const { setSettings } = useStore();
  const isDark = useIsDark();
  const close = () => setOpen(false);
  const staff: Item[] = [
    ...(isAdmin ? [{ to: "/admin", label: "Tableau de bord admin", hint: "Statistiques anonymisées, rôles", icon: ShieldCheck }] : []),
    ...(canModerate ? [{ to: "/moderation", label: "Modération", hint: "Signalements d'avis", icon: ShieldAlert }] : []),
  ];
  const sections = staff.length ? [...SECTIONS, { title: "Administration", items: staff }] : SECTIONS;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button aria-label="Ouvrir le menu" className="rounded-full p-2 transition hover:bg-accent"><Menu className="h-5 w-5" /></button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full overflow-y-auto p-0 sm:max-w-sm">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="flex items-center gap-2 font-display text-2xl"><img src="/movieverse-logo.png" alt="" className="h-9 w-9 rounded-lg object-cover" />Movie<span className="text-primary">Verse</span></SheetTitle>
          {user?.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
        </SheetHeader>
        <div className="grid grid-cols-2 gap-2 p-4">
          <button onClick={() => { close(); window.dispatchEvent(new Event("mv:palette")); }} className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm font-medium hover:bg-accent"><Search className="h-4 w-4 text-primary" /> Recherche rapide</button>
          <button onClick={() => setSettings({ theme: isDark ? "light" : "dark" })} className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm font-medium hover:bg-accent">
            {isDark ? <Sun className="h-4 w-4 text-primary" /> : <Moon className="h-4 w-4 text-primary" />} {isDark ? "Mode clair" : "Mode sombre"}
          </button>
        </div>
        <nav className="px-2 pb-6">
          {sections.map((s) => (
            <div key={s.title} className="mb-3">
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{s.title}</p>
              {s.items.map((i) => (
                <Link key={i.to} to={i.to as "/"} onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-accent" activeProps={{ className: "bg-accent" }} activeOptions={{ exact: i.to === "/" }}>
                  <i.icon className="h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0"><span className="block text-sm font-medium">{i.label}</span>{i.hint && <span className="block truncate text-xs text-muted-foreground">{i.hint}</span>}</span>
                </Link>
              ))}
            </div>
          ))}
          <button
            onClick={async () => { close(); await supabase.auth.signOut(); nav({ to: "/auth", replace: true }); }}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" /> Se déconnecter
          </button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
