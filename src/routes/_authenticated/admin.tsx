import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Panel admin — MovieVerse" },
      { name: "description", content: "Administration des membres MovieVerse." },
      { property: "og:title", content: "Panel admin — MovieVerse" },
      { property: "og:description", content: "Liste des membres inscrits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const age = (d: string | null) => {
  if (!d) return "—";
  const b = new Date(d), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
  return String(a);
};

function Admin() {
  const { isAdmin, loading } = useAuthUser();
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"], enabled: isAdmin, networkMode: "online",
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const rows = useMemo(() => data.filter((p) => JSON.stringify(p).toLowerCase().includes(q.toLowerCase())), [data, q]);
  if (loading) return <div className="pt-40 text-center text-muted-foreground">Chargement…</div>;
  if (!isAdmin) return <div className="pt-40 text-center text-muted-foreground">Accès réservé à l'administrateur.</div>;
  const countries = new Set(data.map((p) => p.country).filter(Boolean)).size;
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-20 pt-36 md:px-8 lg:pt-28">
      <h1 className="font-display text-4xl font-extrabold">Panel admin</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Membres inscrits" value={data.length} />
        <Stat label="Pays représentés" value={countries} />
        <Stat label="Inscrits ces 7 jours" value={data.filter((p) => Date.now() - +new Date(p.created_at) < 7 * 864e5).length} />
      </div>
      <Input className="mt-6 max-w-sm" placeholder="Rechercher un membre…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            {["Membre", "Email", "Téléphone", "Pays", "Région", "Ville", "Âge", "Genre", "Inscrit le"].map((h) => <TableHead key={h}>{h}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={9}>Chargement…</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={9} className="text-muted-foreground">Aucun membre.</TableCell></TableRow>}
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="flex items-center gap-2 font-semibold">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <Users className="h-5 w-5 text-muted-foreground" />}
                  {p.display_name ?? "—"}
                </TableCell>
                <TableCell>{p.email ?? "—"}</TableCell>
                <TableCell>{p.phone ?? "—"}</TableCell>
                <TableCell>{p.country ?? "—"}</TableCell>
                <TableCell>{p.region ?? "—"}</TableCell>
                <TableCell>{p.city ?? "—"}</TableCell>
                <TableCell>{age(p.birth_date)}</TableCell>
                <TableCell>{p.gender ?? "—"}</TableCell>
                <TableCell>{new Date(p.created_at).toLocaleDateString("fr-FR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl font-extrabold">{value}</p></div>;
}
