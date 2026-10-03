import { supabase } from "@/integrations/supabase/client";

// Accès souple aux tables ajoutées après coup (phase 2) : elles ne figurent pas encore dans les types générés.
type Loose = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  rpc: (fn: string, args?: Record<string, unknown>) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
export const cloud = supabase as unknown as Loose;

/** Vrai si l'erreur signifie « cette table / colonne n'existe pas encore » (SQL de la phase 2 pas appliqué). */
export const isMissingTable = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (["42P01", "42703", "PGRST205", "PGRST204", "PGRST202"].includes(e.code ?? "") || /does not exist|schema cache|could not find/i.test(e.message ?? ""));
