import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, MessageSquare, MessagesSquare, ShieldCheck, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/lib/auth";
import { fetchVisits } from "@/lib/community";
import { cloud } from "@/lib/cloud";
import { aiDiagnostics } from "@/lib/ai.functions";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Tableau de bord admin — MovieVerse" },
      { name: "description", content: "Statistiques agrégées et anonymisées de MovieVerse." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type Row = { country: string | null; gender: string | null; birth_date: string | null; created_at: string };
const MIN_GROUP = 3; // sous ce seuil, un groupe est fusionné dans « Autres » pour ne désigner personne

const ageOf = (d: string | null) => {
  if (!d) return null;
  const b = new Date(d), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
};

function group(values: (string | null)[], top = 8) {
  const m = new Map<string, number>();
  for (const v of values) { const k = v?.trim() || "Non renseigné"; m.set(k, (m.get(k) ?? 0) + 1); }
  let others = 0;
  const rows: [string, number][] = [];
  for (const [k, n] of [...m.entries()].sort((a, b) => b[1] - a[1])) {
    if (n < MIN_GROUP || rows.length >= top) others += n; else rows.push([k, n]);
  }
  if (others) rows.push(["Autres", others]);
  return rows;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 font-display text-3xl font-extrabold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function Bars({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  const total = rows.reduce((s, r) => s + r[1], 0) || 1;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Pas encore de données.</p>}
        {rows.map(([k, n]) => (
          <div key={k}>
            <div className="flex justify-between text-sm"><span>{k}</span><span className="tabular-nums text-muted-foreground">{n} · {Math.round((n / total) * 100)} %</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RolesCard() {
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<{ id: string; display_name: string | null; email: string | null; mod: boolean } | null | undefined>(undefined);
  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await cloud.from("profiles").select("id,display_name,email").ilike("email", email.trim()).maybeSingle();
    if (error || !data) { setFound(null); return; }
    const r = await cloud.from("user_roles").select("role").eq("user_id", data.id).eq("role", "moderator");
    setFound({ ...data, mod: (r.data?.length ?? 0) > 0 });
  };
  const toggle = async () => {
    if (!found) return;
    const r = found.mod
      ? await cloud.from("user_roles").delete().eq("user_id", found.id).eq("role", "moderator")
      : await cloud.from("user_roles").insert({ user_id: found.id, role: "moderator" });
    if (r.error) { toast.error("Impossible de modifier ce rôle (base de données à mettre à jour ?)."); return; }
    setFound({ ...found, mod: !found.mod });
    toast.success(found.mod ? "Rôle modérateur retiré." : "Rôle modérateur accordé.");
  };
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">Rôles : nommer un modérateur</h2>
      <p className="mt-1 text-xs text-muted-foreground">Recherche par adresse email exacte. Les modérateurs peuvent signaler, masquer et supprimer des avis ; aucune liste de membres n'est affichée.</p>
      <form onSubmit={search} className="mt-3 flex gap-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@exemple.com" aria-label="Email du membre" className="h-10 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm" />
        <button className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Chercher</button>
      </form>
      {found === null && <p className="mt-3 text-sm text-muted-foreground">Aucun membre avec cet email.</p>}
      {found && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 text-sm">
          <span className="min-w-0 truncate"><strong>{found.display_name ?? "Membre"}</strong> · {found.mod ? "modérateur" : "utilisateur"}</span>
          <button onClick={toggle} className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">{found.mod ? "Retirer" : "Nommer modérateur"}</button>
        </div>
      )}
    </div>
  );
}

function FeedbackCard() {
  const { data } = useQuery({
    queryKey: ["admin-feedback"], retry: false, networkMode: "online",
    queryFn: async () => ((await cloud.from("feedback").select("id,type,message,created_at").order("created_at", { ascending: false }).limit(20)).data ?? []) as { id: string; type: string; message: string; created_at: string }[],
  });
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">Retours des membres</h2>
      <p className="mt-1 text-xs text-muted-foreground">Messages envoyés depuis « Contact » (les 20 derniers, sans identité).</p>
      <div className="mt-3 space-y-2">
        {data?.length === 0 && <p className="text-sm text-muted-foreground">Aucun retour pour l'instant.</p>}
        {data?.map((f) => (
          <div key={f.id} className="rounded-xl bg-muted/50 p-3 text-sm">
            <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{f.type}</span> · {new Date(f.created_at).toLocaleDateString("fr-FR")}</p>
            <p className="mt-1 whitespace-pre-line">{f.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

type DiagResult = Awaited<ReturnType<typeof aiDiagnostics>>;

function AiDiagnosticCard() {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<DiagResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [usage, setUsage] = useState<{ key_name: string; ok_count: number; quota_count: number; error_count: number }[]>([]);
  const run = async () => {
    setBusy(true);
    setFailed(false);
    try {
      setRes(await aiDiagnostics());
      const day = new Date().toISOString().slice(0, 10);
      const u = await cloud.from("gemini_key_usage").select("key_name,ok_count,quota_count,error_count").eq("day", day).order("key_name");
      setUsage((u.data ?? []) as typeof usage);
    } catch { setFailed(true); } finally { setBusy(false); }
  };
  const cell = (r: { ok: boolean; ms: number; status: string }) => (
    <span className={r.ok ? "text-green-500" : "text-destructive"}>{r.ok ? `${(r.ms / 1000).toFixed(1)} s` : r.status.slice(0, 60)}</span>
  );
  const fastest = res && res.ok ? [...res.rows].filter((r) => r.plain.ok).sort((a, b) => a.plain.ms - b.plain.ms)[0] : null;
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">Diagnostic de l'IA (Gemini)</h2>
      <p className="mt-1 text-xs text-muted-foreground">Teste avec les clés enregistrées dans les secrets : temps de réponse de chaque modèle, avec et sans recherche Google. Aucune clé n'est affichée.</p>
      <button onClick={run} disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {busy ? "Test en cours (jusqu'à 40 s)…" : "Lancer le diagnostic"}
      </button>
      {failed && <p className="mt-3 text-sm text-destructive">Le diagnostic n'a pas pu s'exécuter. Réessayez.</p>}
      {res && !res.ok && <p className="mt-3 text-sm text-destructive">{res.error === "forbidden" ? "Réservé à l'administrateur." : "Aucune clé Gemini n'est enregistrée dans les secrets."}</p>}
      {res && res.ok && (
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Clés détectées</p>
            {res.keys.map((k) => (
              <div key={k.name} className="flex justify-between gap-3 border-b border-border py-1.5 last:border-0">
                <code className="text-xs">{k.name}</code>
                {k.configured ? cell(k) : <span className="text-muted-foreground">non configurée</span>}
              </div>
            ))}
          </div>
          {usage.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Utilisation aujourd'hui (UTC)</p>
              {usage.map((u) => (
                <div key={u.key_name} className="flex justify-between gap-3 border-b border-border py-1.5 text-xs last:border-0">
                  <code>{u.key_name}</code>
                  <span><span className="text-green-500">{u.ok_count} ok</span> · <span className={u.quota_count ? "text-destructive" : ""}>{u.quota_count} quota</span> · {u.error_count} erreur</span>
                </div>
              ))}
            </div>
          )}
          <div className="overflow-x-auto">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Modèles (modèle actuel : {res.current})</p>
            <table className="w-full min-w-[420px] text-left">
              <thead className="text-xs text-muted-foreground"><tr><th className="py-1 pr-3 font-medium">Modèle</th><th className="py-1 pr-3 font-medium">Sans recherche</th><th className="py-1 font-medium">Avec recherche</th></tr></thead>
              <tbody>
                {res.rows.map((r) => (
                  <tr key={r.model} className="border-t border-border">
                    <td className="py-1.5 pr-3 font-mono text-xs">{r.model}</td>
                    <td className="py-1.5 pr-3">{cell(r.plain)}</td>
                    <td className="py-1.5">{cell(r.search)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Réflexion du modèle : {res.thinking === "level" ? "niveau bas (rapide)" : res.thinking === "budget" ? "budget zéro (rapide)" : "réglage non accepté par le modèle"}.</p>
          {fastest && fastest.model !== res.current && <p className="rounded-xl bg-primary/10 p-3 text-xs">Le plus rapide ici : <strong>{fastest.model}</strong>. Pour l'utiliser : Cloud, Secrets, secret <code>GEMINI_MODEL</code> = {fastest.model}.</p>}
        </div>
      )}
    </div>
  );
}

function Admin() {
  const { isAdmin, loading } = useAuthUser();
  const { data = [] } = useQuery({
    queryKey: ["admin-aggregate"], enabled: isAdmin, networkMode: "online",
    // On ne rapatrie que des champs non identifiants : ni nom, ni email, ni téléphone.
    queryFn: async () => ((await supabase.from("profiles").select("country,gender,birth_date,created_at")).data ?? []) as Row[],
  });
  const extra = useQuery({
    queryKey: ["admin-extra"], enabled: isAdmin, networkMode: "online",
    queryFn: async () => {
      const [posts, comments, visits] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("post_comments").select("id", { count: "exact", head: true }),
        fetchVisits().catch(() => null),
      ]);
      return { posts: posts.count ?? 0, comments: comments.count ?? 0, visits };
    },
  });
  if (loading) return <div className="pt-40 text-center text-muted-foreground">Chargement…</div>;
  if (!isAdmin) return <div className="pt-40 text-center text-muted-foreground">Accès réservé à l'administrateur.</div>;

  const now = Date.now();
  const days = (d: number) => data.filter((p) => now - +new Date(p.created_at) < d * 864e5).length;
  const brackets: [string, (a: number) => boolean][] = [
    ["Moins de 18 ans", (a) => a < 18], ["18–24 ans", (a) => a >= 18 && a <= 24], ["25–34 ans", (a) => a >= 25 && a <= 34],
    ["35–44 ans", (a) => a >= 35 && a <= 44], ["45 ans et plus", (a) => a >= 45],
  ];
  const ages = data.map((p) => ageOf(p.birth_date));
  const ageRows: [string, number][] = brackets.map(([l, f]) => [l, ages.filter((a): a is number => a != null && f(a)).length] as [string, number]).filter((r) => r[1] > 0);
  const unknownAge = ages.filter((a) => a == null).length;
  if (unknownAge) ageRows.push(["Non renseigné", unknownAge]);
  const weeks: [string, number][] = Array.from({ length: 8 }, (_, i) => {
    const end = now - i * 7 * 864e5, start = end - 7 * 864e5;
    return [i === 0 ? "Cette semaine" : `Il y a ${i} sem.`, data.filter((p) => +new Date(p.created_at) > start && +new Date(p.created_at) <= end).length] as [string, number];
  }).reverse();

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-36 md:px-8 lg:pt-28">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary"><ShieldCheck className="h-4 w-4" /> Administrateur</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold">Tableau de bord</h1>
      <p className="mt-2 text-sm text-muted-foreground">Statistiques agrégées et anonymisées : aucune donnée individuelle n'est affichée, et les groupes de moins de {MIN_GROUP} personnes sont fusionnés.</p>
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Stat icon={Users} label="Membres" value={String(data.length)} />
        <Stat icon={UserPlus} label="Nouveaux (7 jours)" value={String(days(7))} />
        <Stat icon={Eye} label="Visites" value={extra.data?.visits != null ? extra.data.visits.toLocaleString("fr-FR") : "—"} />
        <Stat icon={MessagesSquare} label="Avis publiés" value={String(extra.data?.posts ?? "—")} />
        <Stat icon={MessageSquare} label="Commentaires" value={String(extra.data?.comments ?? "—")} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Bars title="Inscriptions par semaine" rows={weeks} />
        <Bars title="Pays" rows={group(data.map((p) => p.country))} />
        <Bars title="Tranches d'âge" rows={ageRows} />
        <Bars title="Genre" rows={group(data.map((p) => p.gender), 5)} />
      </div>
      <button
        onClick={() => {
          const rows: string[][] = [["section", "libelle", "nombre"], ...weeks.map((r) => ["inscriptions", ...r.map(String)]), ...group(data.map((p) => p.country)).map((r) => ["pays", ...r.map(String)]), ...ageRows.map((r) => ["age", ...r.map(String)]), ...group(data.map((p) => p.gender), 5).map((r) => ["genre", ...r.map(String)])];
          const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
          const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
          const a = document.createElement("a");
          a.href = url; a.download = `movieverse-stats-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        }}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted"
      >
        <Download className="h-4 w-4" /> Exporter les statistiques (CSV anonymisé)
      </button>
      <AiDiagnosticCard />
      <RolesCard />
      <FeedbackCard />
    </div>
  );
}
