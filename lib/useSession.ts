import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { useSessionContext } from "@supabase/auth-helpers-react";

export function useSession() {
  const { session } = useSessionContext();
  return { session };
}
