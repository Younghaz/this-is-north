import { useSessionContext } from "@supabase/auth-helpers-react";

export function useSession() {
  const { session } = useSessionContext();
  return { session };
}
