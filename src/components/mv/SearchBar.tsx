import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Search, Star, X } from "lucide-react";
import { CATEGORIES, searchAll } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export function SearchBar() {
  const { settings } = useStore();
  const [q, setQ] = useState("");
  const [deb, setDeb] = useState("");
  const [open, setOpen] = useState(false);
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
  const { data, isFetching } = useQuery({
    queryKey: ["search", deb, settings.lang],
    queryFn: () => searchAll(deb, settings.lang),
    enabled: deb.length >= 2,
    staleTime: 60_000,
  });
  return (
    <div ref={box} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-2 transition focus-within:border-primary focus-within:bg-background">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Films, animés, séries…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {q && (
          <button aria-label="Effacer" onClick={() => setQ("")}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
      {open && deb.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-2xl animate-rise">
          {isFetching && !data && <p className="p-4 text-sm text-muted-foreground">Recherche…</p>}
          {data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">Aucun résultat</p>}
          {data?.map((i) => (
            <Link
              key={`${i.kind}${i.id}`}
              to="/titre/$kind/$id"
              params={{ kind: i.kind, id: i.id }}
              onClick={() => {
                setOpen(false);
                setQ("");
              }}
              className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-accent"
            >
              <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                {i.poster && <img src={i.poster} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{i.title}</p>
                <p className="text-xs text-muted-foreground">
                  {CATEGORIES[i.kind].label} · {i.date?.slice(0, 4) ?? "—"}
                </p>
              </div>
              {i.rating != null && (
                <span className="flex items-center gap-1 text-xs"><Star className="h-3 w-3 fill-gold text-gold" />{i.rating.toFixed(1)}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
