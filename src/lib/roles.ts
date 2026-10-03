import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Rôle du compte connecté : utilisateur / modérateur / admin. */
export function useRole() {
  const { data } = useQuery({
    queryKey: ["my-role"],
    staleTime: 5 * 60_000,
    networkMode: "online",
    queryFn: async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) return { isAdmin: false, isModerator: false };
      const [a, m] = await Promise.all([
        supabase.rpc("has_role", { _user_id: uid, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: uid, _role: "moderator" }),
      ]);
      return { isAdmin: !!a.data, isModerator: !!m.data };
    },
  });
  const isAdmin = data?.isAdmin ?? false;
  const isModerator = data?.isModerator ?? false;
  return { isAdmin, isModerator, canModerate: isAdmin || isModerator };
}

/** Identifiant du compte connecté (ou null). */
export function useMyId() {
  const { data } = useQuery({
    queryKey: ["my-id"],
    staleTime: 10 * 60_000,
    networkMode: "offlineFirst",
    queryFn: async () => (await supabase.auth.getSession()).data.session?.user.id ?? null,
  });
  return data ?? null;
}
