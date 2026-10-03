import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Camera, CalendarDays, Loader2, LogOut, MapPin, Phone, Shield, Trash2, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cloud, isMissingTable } from "@/lib/cloud";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil — MovieVerse" },
      { name: "description", content: "Gérez votre profil MovieVerse." },
      { property: "og:title", content: "Mon profil — MovieVerse" },
      { property: "og:description", content: "Votre compte MovieVerse." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Profile,
});

type Form = Record<string, string>;

const GENDERS = ["Homme", "Femme", "Autre", "Je préfère ne pas dire"];
const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Recadre l'image en carré 512x512 et la compresse en JPEG (léger et rapide à envoyer)
async function toSquareJpeg(file: File, size = 512): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponible");
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  bmp.close?.();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("conversion impossible"))), "image/jpeg", 0.85),
  );
}

function Section({ icon: Icon, title, hint, children }: { icon: typeof UserRound; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold leading-tight">{title}</h2>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Profile() {
  const { user } = Route.useRouteContext();
  const { isAdmin } = useAuthUser();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profile", user.id],
    networkMode: "online",
    refetchOnWindowFocus: false,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data,
  });

  const [f, setF] = useState<Form>({});
  const loaded = useRef(false);
  useEffect(() => {
    // On remplit le formulaire une seule fois, pour ne jamais effacer ce que vous êtes en train de taper
    if (data && !loaded.current) {
      loaded.current = true;
      setF(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v == null ? "" : String(v)])));
    }
  }, [data]);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Choisissez une image (JPG, PNG ou WebP)."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image trop lourde (10 Mo maximum)."); return; }
    setUploading(true);
    try {
      const blob = await toSquareJpeg(file);
      const path = `${user.id}/avatar.jpg`;
      const up = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (up.error) throw up.error;
      const url = `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      const { error } = await supabase.from("profiles").upsert({ id: user.id, email: user.email ?? null, avatar_url: url, updated_at: new Date().toISOString() });
      if (error) throw error;
      set("avatar_url", url);
      toast.success("Photo de profil mise à jour.");
    } catch (err) {
      console.error(err);
      toast.error("Envoi de la photo impossible pour le moment. Réessayez plus tard.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    setUploading(true);
    try {
      await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);
      const { error } = await supabase.from("profiles").update({ avatar_url: null, updated_at: new Date().toISOString() }).eq("id", user.id);
      if (error) throw error;
      set("avatar_url", "");
      toast.success("Photo supprimée.");
    } catch (err) {
      console.error(err);
      toast.error("Suppression impossible.");
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = (k: string) => (f[k]?.trim() ? f[k]!.trim() : null);
    if ((f["display_name"] ?? "").trim().length < 2) { toast.error("Le pseudo doit contenir au moins 2 caractères."); return; }
    const phone = (f["phone"] ?? "").trim();
    if (phone && !/^[+0-9 ().-]{6,30}$/.test(phone)) { toast.error("Numéro de téléphone invalide."); return; }
    if (f["birth_date"] && new Date(f["birth_date"]) > new Date()) { toast.error("Date de naissance invalide."); return; }
    setSaving(true);
    const row = {
      id: user.id, email: user.email ?? null,
      display_name: n("display_name"), phone: n("phone"), country: n("country"), region: n("region"),
      city: n("city"), gender: n("gender"), avatar_url: n("avatar_url"), bio: n("bio"),
      birth_date: n("birth_date"), updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("profiles").upsert(row);
    setSaving(false);
    if (error) { toast.error("Enregistrement impossible : vérifiez les champs."); return; }
    toast.success("Profil enregistré.");
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
  };

  const togglePublic = async (v: boolean) => {
    const { error } = await cloud.from("profiles").update({ is_public: v }).eq("id", user.id);
    if (error) { toast.error(isMissingTable(error) ? "Bientôt disponible : la base de données doit d'abord être mise à jour." : "Réglage impossible."); return; }
    set("is_public", String(v));
    toast.success(v ? "Votre profil est maintenant public." : "Votre profil est maintenant privé.");
  };

  const logout = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  const genderOptions = f["gender"] && !GENDERS.includes(f["gender"]) ? [...GENDERS, f["gender"]] : GENDERS;
  const since = user.created_at
    ? new Date(user.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : null;
  const shownName = f["display_name"] || user.email?.split("@")[0] || "Membre";

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pb-24 pt-36 lg:pt-28">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="h-28 bg-gradient-to-r from-primary/70 via-primary/25 to-accent/30 sm:h-36" />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative h-24 w-24 shrink-0">
              {f["avatar_url"] ? (
                <img src={f["avatar_url"]} alt="Photo de profil" className="h-24 w-24 rounded-full object-cover ring-4 ring-card" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-4xl font-bold text-primary-foreground ring-4 ring-card">
                  {shownName[0]?.toUpperCase()}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
              <button
                type="button" aria-label="Changer la photo" disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-card"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-2xl font-extrabold sm:text-3xl">{shownName}</h1>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {isAdmin && <span className="rounded-full bg-primary/15 px-2.5 py-0.5 font-semibold text-primary">Administrateur</span>}
                {since && <span>Membre depuis {since}</span>}
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Camera className="h-4 w-4" /> Changer la photo
            </Button>
            {f["avatar_url"] && (
              <Button type="button" size="sm" variant="ghost" disabled={uploading} onClick={removePhoto}>
                <Trash2 className="h-4 w-4" /> Supprimer
              </Button>
            )}
            {isAdmin && (
              <Button asChild size="sm" variant="outline"><Link to="/admin"><Shield className="h-4 w-4" /> Panel admin</Link></Button>
            )}
            <Button type="button" size="sm" variant="ghost" className="sm:ml-auto" onClick={logout}>
              <LogOut className="h-4 w-4" /> Se déconnecter
            </Button>
          </div>
        </div>
      </section>

      <form onSubmit={save} className="space-y-5">
        <Section icon={UserRound} title="Informations personnelles" hint="Votre identité sur MovieVerse">
          <div>
            <Label htmlFor="display_name">Pseudo</Label>
            <Input id="display_name" maxLength={40} value={f["display_name"] ?? ""} onChange={(e) => set("display_name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="gender">Genre</Label>
            <select id="gender" className={SELECT_CLASS} value={f["gender"] ?? ""} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Non précisé</option>
              {genderOptions.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="bd"><CalendarDays className="mr-1 inline h-3.5 w-3.5" />Date de naissance</Label>
            <Input id="bd" type="date" max={new Date().toISOString().slice(0, 10)} value={f["birth_date"] ?? ""} onChange={(e) => set("birth_date", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email ?? ""} readOnly disabled />
          </div>
        </Section>

        <Section icon={Phone} title="Coordonnées" hint="Visible uniquement par vous et l'administrateur">
          <div className="sm:col-span-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" type="tel" inputMode="tel" maxLength={30} placeholder="+261 ..." value={f["phone"] ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </div>
        </Section>

        <Section icon={MapPin} title="Localisation">
          <div>
            <Label htmlFor="country">Pays</Label>
            <Input id="country" maxLength={60} value={f["country"] ?? ""} onChange={(e) => set("country", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="region">Région</Label>
            <Input id="region" maxLength={80} value={f["region"] ?? ""} onChange={(e) => set("region", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="city">Ville</Label>
            <Input id="city" maxLength={80} value={f["city"] ?? ""} onChange={(e) => set("city", e.target.value)} />
          </div>
        </Section>

        <Section icon={UserRound} title="À propos">
          <div className="sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={4} maxLength={500} placeholder="Parlez un peu de vous…" value={f["bio"] ?? ""} onChange={(e) => set("bio", e.target.value)} />
            <p className="mt-1 text-right text-xs text-muted-foreground">{(f["bio"] ?? "").length}/500</p>
          </div>
        </Section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold">Profil public</h2>
              <p className="text-xs text-muted-foreground">Apparaître dans le classement avec votre pseudo, votre photo, votre bio et vos trophées. Votre email, votre téléphone et votre localisation ne sont jamais montrés.</p>
            </div>
            <Switch checked={f["is_public"] === "true"} onCheckedChange={togglePublic} aria-label="Profil public" />
          </div>
        </section>

        <Button type="submit" size="lg" className="w-full" disabled={saving || uploading}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer les modifications
        </Button>
      </form>
    </div>
  );
}
