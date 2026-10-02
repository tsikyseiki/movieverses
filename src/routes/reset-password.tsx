import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — MovieVerse" },
      { name: "description", content: "Choisissez un nouveau mot de passe pour votre compte MovieVerse." },
      { property: "og:title", content: "Nouveau mot de passe — MovieVerse" },
      { property: "og:description", content: "Réinitialisation du mot de passe MovieVerse." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { toast.error("8 caractères minimum"); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { toast.error("Lien expiré, recommencez."); return; }
    toast.success("Mot de passe mis à jour.");
    nav({ to: "/profil" });
  };
  return (
    <form onSubmit={save} className="mx-auto max-w-md space-y-4 px-4 pb-16 pt-40">
      <h1 className="font-display text-3xl font-extrabold">Nouveau mot de passe</h1>
      <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nouveau mot de passe" />
      <Button type="submit" className="w-full">Enregistrer</Button>
    </form>
  );
}
