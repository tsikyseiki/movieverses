import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil — MovieVerse" },
      { name: "description", content: "Gérez votre profil MovieVerse." },
      { property: "og:title", content: "Mon profil — MovieVerse" },
      { property: "og:description", content: "Votre compte MovieVerse." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

const FIELDS = [
  ["display_name", "Pseudo", 40], ["phone", "Téléphone", 30], ["country", "Pays", 60],
  ["region", "Région", 80], ["city", "Ville", 80], ["gender", "Genre", 30], ["avatar_url", "Photo de profil (lien)", 1000],
] as const;
type Form = Record<string, string>;

function Profile() {
  const { user } = Route.useRouteContext();
  const { isAdmin } = useAuthUser();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profile", user.id], networkMode: "online",
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data,
  });
  const [f, setF] = useState<Form>({});
  useEffect(() => {
    if (data) setF(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v == null ? "" : String(v)])));
  }, [data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = (k: string) => (f[k]?.trim() ? f[k]!.trim() : null);
    const row = {
      id: user.id, email: user.email ?? null,
      display_name: n("display_name"), phone: n("phone"), country: n("country"), region: n("region"),
      city: n("city"), gender: n("gender"), avatar_url: n("avatar_url"), bio: n("bio"),
      birth_date: n("birth_date"), updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("profiles").upsert(row);
    if (error) { toast.error("Enregistrement impossible : vérifiez les champs."); return; }
    toast.success("Profil enregistré.");
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
  };
  const logout = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-36 lg:pt-28">
      <div className="flex flex-wrap items-center gap-4">
        {f["avatar_url"] ? <img src={f["avatar_url"]} alt="" className="h-16 w-16 rounded-full object-cover" /> :
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">{(f["display_name"] || user.email || "?")[0]?.toUpperCase()}</div>}
        <div className="flex-1">
          <h1 className="font-display text-3xl font-extrabold">Mon profil</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        {isAdmin && <Button asChild variant="outline"><Link to="/admin"><Shield className="h-4 w-4" /> Panel admin</Link></Button>}
        <Button variant="ghost" onClick={logout}>Se déconnecter</Button>
      </div>
      <form onSubmit={save} className="mt-8 grid gap-4 rounded-3xl border border-border bg-card p-6 sm:grid-cols-2">
        {FIELDS.map(([k, label, max]) => (
          <div key={k} className={k === "avatar_url" ? "sm:col-span-2" : ""}>
            <Label htmlFor={k}>{label}</Label>
            <Input id={k} maxLength={max} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </div>
        ))}
        <div><Label htmlFor="bd">Date de naissance</Label><Input id="bd" type="date" value={f["birth_date"] ?? ""} onChange={(e) => setF({ ...f, birth_date: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label htmlFor="bio">Bio</Label><Textarea id="bio" maxLength={500} value={f["bio"] ?? ""} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
        <Button type="submit" className="sm:col-span-2">Enregistrer</Button>
      </form>
    </div>
  );
}
