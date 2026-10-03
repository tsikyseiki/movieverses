import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CATEGORIES, searchAll } from "@/lib/catalog";
import { useStore } from "@/lib/store";

const PAGES = [
  ["/", "Accueil"], ["/films", "Films"], ["/manga", "Animés manga"], ["/occidental", "Animés occidentaux"], ["/sports", "Sports en direct"],
  ["/recherche", "Recherche avancée"], ["/ce-soir", "Que regarder ce soir ?"], ["/calendrier", "Calendrier des sorties"], ["/comparer", "Comparer deux titres"],
  ["/reconnaitre", "Reconnaître une affiche"], ["/classiques", "Classiques du domaine public"], ["/ma-liste", "Ma liste"], ["/listes", "Mes listes"],
  ["/partage", "Listes partagées"], ["/journal", "Journal & trophées"], ["/bilan", "Mon bilan de l'année"], ["/communaute", "Avis & discussions"],
  ["/membres", "Classement des membres"], ["/profil", "Mon profil"], ["/donnees", "Données & confidentialité"], ["/developpeurs", "API publique"],
  ["/statut", "État du système"], ["/contact", "Contact & suggestions"],
] as const;

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Palette de commandes : Ctrl/Cmd + K, ou « Recherche rapide » dans le menu. */
export function CommandPalette() {
  const nav = useNavigate();
  const { settings } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [deb, setDeb] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } };
    const onEvt = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mv:palette", onEvt);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mv:palette", onEvt); };
  }, []);
  useEffect(() => { const t = setTimeout(() => setDeb(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const res = useQuery({ queryKey: ["palette", deb, settings.lang], queryFn: () => searchAll(deb, settings.lang), enabled: open && deb.length >= 2, staleTime: 60_000 });
  const pages = PAGES.filter(([, l]) => !q || norm(l).includes(norm(q))).slice(0, q ? 8 : 10);
  const done = () => { setOpen(false); setQ(""); };

  return (
    <CommandDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <CommandInput value={q} onValueChange={setQ} placeholder="Aller à une page ou chercher un titre…" />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        {pages.length > 0 && (
          <CommandGroup heading="Pages">
            {pages.map(([to, label]) => <CommandItem key={to} value={`page-${to}`} onSelect={() => { done(); nav({ to: to as "/" }); }}>{label}</CommandItem>)}
          </CommandGroup>
        )}
        {res.data && res.data.length > 0 && (
          <CommandGroup heading="Titres">
            {res.data.slice(0, 6).map((i) => (
              <CommandItem key={`${i.kind}${i.id}`} value={`t-${i.kind}-${i.id}`} onSelect={() => { done(); nav({ to: "/titre/$kind/$id", params: { kind: i.kind, id: i.id } }); }}>
                <span className="truncate">{i.title}</span>
                <span className="ml-auto pl-3 text-xs text-muted-foreground">{CATEGORIES[i.kind].label} · {i.date?.slice(0, 4) ?? "—"}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
