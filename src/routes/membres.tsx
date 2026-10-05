import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { cloud, isMissingTable } from "@/lib/cloud";
import { NotReady } from "@/components/mv/NotReady";

export const Route = createFileRoute("/membres")({
  head: () => ({ meta: [{ title: "Classement des membres — MovieVerse" }, { name: "description", content: "Les membres les plus actifs de MovieVerse." }] }),
  component: Members,
});

type Member = { id: string; display_name: string | null; avatar_url: string | null; watched_count: number; trophies_count: number; points: number };

export function Avatar({ m, size = 44 }: { m: { display_name: string | null; avatar_url: string | null }; size?: number }) {
  return m.avatar_url ? (
    <img src={m.avatar_url} alt="" loading="lazy" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />
  ) : (
    <div style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{(m.display_name ?? "?")[0]?.toUpperCase()}</div>
  );
}

function Members() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["leaderboard"], retry: false, staleTime: 60_000, networkMode: "online",
    queryFn: async () => {
      const { data, error } = await cloud.from("public_profiles").select("*").order("points", { ascending: false }).limit(50);
      if (error) throw error;
      return data as Member[];
    },
  });
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-36 lg:pt-28">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary"><Trophy className="h-4 w-4" /> Communauté</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Classement</h1>
      <p className="mt-3 text-sm text-muted-foreground">Les membres les plus actifs (titres vus, notes, trophées). Seuls les profils rendus publics apparaissent ici.</p>
      {error && isMissingTable(error as { code?: string; message?: string }) && <NotReady what="Le classement" />}
      {error && !isMissingTable(error as { code?: string; message?: string }) && <p className="mt-8 text-muted-foreground">Impossible de charger le classement.</p>}
      {isLoading && <div className="mt-8 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />)}</div>}
      {data && data.length === 0 && <p className="mt-10 rounded-2xl border border-border p-8 text-center text-muted-foreground">Aucun profil public pour l'instant. Activez « Profil public » dans votre profil pour apparaître ici.</p>}
      <div className="mt-8 space-y-2">
        {data?.map((m, i) => (
          <Link key={m.id} to="/membre/$id" params={{ id: m.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-primary/60">
            <span className="flex w-8 justify-center">
              {i < 3 ? <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold text-black" style={{ background: ["#f5c542", "#c0c7d1", "#d08a4e"][i] }}>{i + 1}</span> : <span className="text-sm font-bold text-muted-foreground">{i + 1}</span>}
            </span>
            <Avatar m={m} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{m.display_name ?? "Membre"}</p>
              <p className="text-xs text-muted-foreground">{m.watched_count} vus · {m.trophies_count} trophées</p>
            </div>
            <span className="font-bold tabular-nums">{m.points} pts</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
