import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, Film, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authCinema from "@/assets/auth-cinema.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — MovieVerse" },
      { name: "description", content: "Connectez-vous ou créez votre compte MovieVerse gratuit." },
      { property: "og:title", content: "Connexion — MovieVerse" },
      { property: "og:description", content: "Créez votre compte MovieVerse gratuit par email ou Google." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(8, "8 caractères minimum").max(72),
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) nav({ to: "/", replace: true }); });
    const { data: sub } = supabase.auth.onAuthStateChange((e) => { if (e === "SIGNED_IN") nav({ to: "/", replace: true }); });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Email de réinitialisation envoyé.");
        return;
      }
      const p = schema.safeParse({ email, password });
      if (!p.success) { toast.error(p.error.issues[0]?.message ?? "Champs invalides"); return; }
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: p.data.email, password: p.data.password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim().slice(0, 40) } },
        });
        if (error) throw error;
        toast.success("Compte créé ! Vérifiez votre boîte mail pour confirmer.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(p.data);
        if (error) throw new Error("Email ou mot de passe incorrect.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally { setBusy(false); }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Connexion Google impossible.");
  };

  return (
    <div className="relative isolate grid min-h-svh overflow-hidden bg-background lg:grid-cols-[minmax(0,1.35fr)_minmax(28rem,0.8fr)]">
      <section className="absolute inset-0 lg:relative" aria-label="L’univers MovieVerse">
        <img
          src={authCinema}
          alt="Salle de cinéma éclairée avant une projection"
          width={1536}
          height={1024}
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/20 lg:bg-gradient-to-r lg:from-background/10 lg:via-background/15 lg:to-background" />
        <div className="absolute inset-x-0 bottom-0 hidden p-12 lg:block xl:p-16">
          <div className="max-w-xl animate-rise">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-primary">Votre cinéma, votre univers</p>
            <h2 className="font-display text-4xl font-extrabold leading-tight xl:text-5xl">
              Toutes les histoires commencent par une première scène.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Films, animés et découvertes réunis dans une expérience personnelle, gratuite et sans publicité intrusive.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 flex min-h-svh items-center px-5 py-8 sm:px-10 lg:bg-background lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-md animate-rise">
          <div className="mb-8 flex items-center gap-3 lg:mb-12">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Film aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-extrabold">
              Movie<span className="text-primary">Verse</span>
            </span>
          </div>

          <div className="mb-7">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {mode === "signup" ? "Bienvenue dans MovieVerse" : mode === "forgot" ? "Récupération du compte" : "Heureux de vous revoir"}
            </p>
            <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">
              {mode === "signup" ? "Créez votre espace cinéma" : mode === "forgot" ? "Réinitialisez votre mot de passe" : "Connectez-vous"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {mode === "signup"
                ? "Retrouvez vos favoris, vos listes et toutes vos découvertes sur chaque appareil."
                : mode === "forgot"
                  ? "Nous vous enverrons un lien sécurisé pour retrouver votre compte."
                  : "Accédez à votre bibliothèque et reprenez là où vous vous êtes arrêté."}
            </p>
          </div>

          {mode !== "forgot" && (
            <>
              <Button variant="outline" size="lg" className="h-12 w-full bg-background/70 backdrop-blur-md lg:bg-background" onClick={google} type="button">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M21.35 12.18c0-.7-.06-1.37-.18-2.02H12v3.82h5.24a4.48 4.48 0 0 1-1.94 2.94v2.48h3.14c1.84-1.69 2.91-4.18 2.91-7.22Z"/><path d="M12 21.7c2.62 0 4.82-.87 6.43-2.35l-3.14-2.48c-.87.58-1.98.93-3.29.93a5.68 5.68 0 0 1-5.33-3.92H3.43v2.56A9.7 9.7 0 0 0 12 21.7Z"/><path d="M6.67 13.88A5.83 5.83 0 0 1 6.37 12c0-.65.11-1.28.3-1.88V7.56H3.43A9.7 9.7 0 0 0 2.3 12c0 1.6.38 3.12 1.13 4.44l3.24-2.56Z"/><path d="M12 6.2c1.43 0 2.71.49 3.72 1.45l2.78-2.79A9.34 9.34 0 0 0 12 2.3a9.7 9.7 0 0 0-8.57 5.26l3.24 2.56A5.68 5.68 0 0 1 12 6.2Z"/></svg>
                Continuer avec Google
              </Button>
              <div className="my-6 flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <span className="h-px flex-1 bg-border" />ou par email<span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-5">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Pseudo</Label>
                <Input id="name" autoComplete="nickname" maxLength={40} placeholder="Votre nom dans MovieVerse" value={name} onChange={(e) => setName(e.target.value)} className="h-12 bg-background/70 px-4 backdrop-blur-md lg:bg-background" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Adresse email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="vous@exemple.fr" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-background/70 px-4 backdrop-blur-md lg:bg-background" />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="pw" className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Mot de passe</Label>
                  {mode === "login" && <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => setMode("forgot")}>Mot de passe oublié ?</Button>}
                </div>
                <div className="relative">
                  <Input id="pw" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="8 caractères minimum" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-background/70 px-4 pr-12 backdrop-blur-md lg:bg-background" />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1.5 top-1.5" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </Button>
                </div>
              </div>
            )}
            <Button type="submit" size="lg" className="group h-12 w-full text-sm font-bold" disabled={busy}>
              {busy ? "Veuillez patienter…" : mode === "signup" ? "Créer mon compte gratuit" : mode === "forgot" ? "Envoyer le lien sécurisé" : "Se connecter"}
              {!busy && <ArrowRight aria-hidden="true" className="transition-transform group-hover:translate-x-1" />}
            </Button>
          </form>

          <div className="mt-7 text-center text-sm text-muted-foreground">
            {mode === "forgot" ? (
              <Button variant="link" className="px-1" onClick={() => setMode("login")}>Retour à la connexion</Button>
            ) : (
              <p>
                {mode === "signup" ? "Vous avez déjà un compte ?" : "Nouveau sur MovieVerse ?"}{" "}
                <Button variant="link" className="h-auto p-0 font-bold" onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
                  {mode === "signup" ? "Se connecter" : "Créer un compte"}
                </Button>
              </p>
            )}
          </div>

          {mode === "signup" && (
            <p className="mt-7 flex items-start gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Inscription gratuite. En continuant, vous acceptez les conditions d’utilisation et la politique de confidentialité.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
