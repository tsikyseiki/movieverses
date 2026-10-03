import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Connection, Item } from "@/lib/catalog";

const GROUPS = {
  director: { label: "Même réalisateur·rice / créateur·rice", color: "#f59e0b" },
  studio: { label: "Même studio", color: "#38bdf8" },
  franchise: { label: "Même saga", color: "#a78bfa" },
  univers: { label: "Univers partagé", color: "#34d399" },
  similaire: { label: "Dans le même esprit", color: "#f472b6" },
} as const;

const W = 800;
const H = 580;
const CX = W / 2;
const CY = H / 2;

export function Constellation({ center, connections }: { center: Pick<Item, "kind" | "id" | "title" | "poster">; connections: Connection[] }) {
  const [active, setActive] = useState<string | null>(null);
  const nodes = useMemo(() => {
    const groups = (Object.keys(GROUPS) as (keyof typeof GROUPS)[]).filter((g) => connections.some((c) => c.group === g));
    const sector = (2 * Math.PI) / Math.max(groups.length, 1);
    const out: { c: Connection; x: number; y: number; key: string }[] = [];
    groups.forEach((g, gi) => {
      const list = connections.filter((c) => c.group === g);
      list.forEach((c, j) => {
        const angle = -Math.PI / 2 + gi * sector + ((j + 0.5) * sector) / list.length;
        const r = j % 2 === 0 ? 165 : 235;
        out.push({ c, x: CX + Math.cos(angle) * r * 1.25, y: CY + Math.sin(angle) * r, key: `${c.item.kind}:${c.item.id}` });
      });
    });
    return out;
  }, [connections]);
  const sel = nodes.find((n) => n.key === active);
  const used = (Object.keys(GROUPS) as (keyof typeof GROUPS)[]).filter((g) => connections.some((c) => c.group === g));

  return (
    <div className="rounded-3xl border border-border bg-card p-3 sm:p-5">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Constellation de titres liés">
        <defs>
          <clipPath id="clip-center"><circle cx={CX} cy={CY} r={48} /></clipPath>
          {nodes.map((n, i) => <clipPath key={n.key} id={`clip-${i}`}><circle cx={n.x} cy={n.y} r={30} /></clipPath>)}
        </defs>
        {nodes.map((n) => (
          <line key={`l-${n.key}`} x1={CX} y1={CY} x2={n.x} y2={n.y} stroke={GROUPS[n.c.group].color} strokeOpacity={active === n.key ? 0.9 : 0.35} strokeWidth={active === n.key ? 2.5 : 1.2} />
        ))}
        {center.poster && <image href={center.poster} x={CX - 48} y={CY - 48} width={96} height={96} clipPath="url(#clip-center)" preserveAspectRatio="xMidYMid slice" />}
        <circle cx={CX} cy={CY} r={48} fill="none" stroke="currentColor" strokeOpacity={0.6} strokeWidth={3} />
        {nodes.map((n, i) => (
          <g key={n.key} className="cursor-pointer" onClick={() => setActive(n.key)} role="button" aria-label={n.c.item.title}>
            <circle cx={n.x} cy={n.y} r={34} fill={GROUPS[n.c.group].color} fillOpacity={active === n.key ? 0.45 : 0.18} />
            {n.c.item.poster && <image href={n.c.item.poster} x={n.x - 30} y={n.y - 30} width={60} height={60} clipPath={`url(#clip-${i})`} preserveAspectRatio="xMidYMid slice" />}
            <circle cx={n.x} cy={n.y} r={30} fill="none" stroke={GROUPS[n.c.group].color} strokeWidth={active === n.key ? 4 : 2} />
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs text-muted-foreground">
        {used.map((g) => (
          <span key={g} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GROUPS[g].color }} />{GROUPS[g].label}</span>
        ))}
      </div>
      <div className="mt-3 min-h-14 rounded-2xl bg-muted/50 p-3 text-sm">
        {sel ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{sel.c.item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{GROUPS[sel.c.group].label} · {sel.c.label}</p>
            </div>
            <Link to="/titre/$kind/$id" params={{ kind: sel.c.item.kind, id: sel.c.item.id }} className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Ouvrir la fiche</Link>
          </div>
        ) : (
          <p className="text-muted-foreground">Touchez un titre de la constellation pour voir pourquoi il est lié.</p>
        )}
      </div>
    </div>
  );
}
