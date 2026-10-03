import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { subscribeLive, type LiveEntry } from "@/lib/presence";

export function LiveNow() {
  const [list, setList] = useState<LiveEntry[]>([]);
  useEffect(() => subscribeLive(setList), []);
  if (!list.length) return null;
  const people = list.reduce((s, e) => s + e.count, 0);
  return (
    <section className="mx-auto max-w-[1500px] px-4 pt-16 md:px-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
        <h2 className="text-xl font-bold">En ce moment sur MovieVerse</h2>
        <span className="text-sm text-muted-foreground">· {people} {people > 1 ? "personnes consultent" : "personne consulte"} une fiche (anonyme)</span>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
        {list.map((e) => (
          <Link key={`${e.kind}:${e.id}`} to="/titre/$kind/$id" params={{ kind: e.kind, id: e.id }} className="group relative w-28 shrink-0">
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted ring-1 ring-border transition group-hover:ring-primary/60">
              {e.poster && <img src={e.poster} alt={e.title} loading="lazy" className="h-full w-full object-cover" />}
              <span className="absolute right-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">👀 {e.count}</span>
            </div>
            <p className="mt-1 line-clamp-1 text-xs font-semibold">{e.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
