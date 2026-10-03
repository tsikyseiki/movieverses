import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Clock, Search, Star, X } from "lucide-react";
import { CATEGORIES, searchAll, searchPeople } from "@/lib/catalog";
import { useStore } from "@/lib/store";

const RECENT_KEY = "mv:recent-searches";
const readRecent = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
};

export function SearchBar() {
  const { settings } = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [deb, setDeb] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => setDeb(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const h = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { if (open) setRecent(readRecent()); }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", deb, settings.lang],
    queryFn: async () => {
      const [items, people] = await Promise.all([searchAll(deb, settings.lang), searchPeople(deb, settings.lang).catch(() => [])]);
      // Tolérance aux fautes : sans résultat, on relance avec le début du mot
      if (items.length === 0 && people.length === 0 && deb.length >= 4) {
        const approx = deb.slice(0, Math.max(3, Math.ceil(deb.length * 0.7)));
        const items2 = await searchAll(approx, settings.lang).catch(() => []);
        return { items: items2, people: [], approx: items2.length > 0 };
      }
      return { items, people, approx: false };
    },
    enabled: deb.length >= 2,
    staleTime: 60_000,
  });

  const remember = () => {
    if (deb.length < 2) return;
    const next = [deb, ...readRecent().filter((r) => r.toLowerCase() !== deb.toLowerCase())].slice(0, 6);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* stockage indisponible */ }
  };
  const close = () => { remember(); setOpen(false); setQ(""); };
  const first = data?.items[0];

  return (
    <div ref={box} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-2 transition focus-within:border-primary focus-within:bg-background">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          aria-label="Rechercher un titre, un acteur ou un réalisateur"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && first) { close(); nav({ to: "/titre/$kind/$id", params: { kind: first.kind, id: first.id } }); }
          }}
          placeholder="Titre, acteur, réalisateur…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {q && (
          <button aria-label="Effacer" onClick={() => setQ("")}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
      {open && deb.length < 2 && recent.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-border bg-popover p-2 shadow-2xl animate-rise">
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recherches récentes</p>
          {recent.map((r) => (
            <button key={r} onClick={() => setQ(r)} className="flex w-full items-center gap-2 rounded-xl p-2 text-left text-sm hover:bg-accent">
              <Clock className="h-4 w-4 text-muted-foreground" /> {r}
            </button>
          ))}
        </div>
      )}
      {open && deb.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-2xl animate-rise">
          {isFetching && !data && <p className="p-4 text-sm text-muted-foreground">Recherche…</p>}
          {data && data.items.length === 0 && data.people.length === 0 && <p className="p-4 text-sm text-muted-foreground">Aucun résultat</p>}
          {data?.approx && <p className="px-3 py-1 text-xs text-muted-foreground">Résultats approchants pour « {deb} »</p>}
          {data?.people.map((p) => (
            <Link key={`p${p.id}`} to="/personne/$id" params={{ id: p.id }} onClick={close} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-accent">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">{p.photo && <img src={p.photo} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.known || "Personnalité"}</p>
              </div>
            </Link>
          ))}
          {data?.items.map((i) => (
            <Link key={`${i.kind}${i.id}`} to="/titre/$kind/$id" params={{ kind: i.kind, id: i.id }} onClick={close} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-accent">
              <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-muted">{i.poster && <img src={i.poster} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{i.title}</p>
                <p className="text-xs text-muted-foreground">{CATEGORIES[i.kind].label} · {i.date?.slice(0, 4) ?? "—"}</p>
              </div>
              {i.rating != null && <span className="flex items-center gap-1 text-xs"><Star className="h-3 w-3 fill-gold text-gold" />{i.rating.toFixed(1)}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
