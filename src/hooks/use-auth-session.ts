import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAuthSession() {
  const [user, setUser] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!ativo) return;
      setUser(session?.user ?? null);
      setCarregando(false);
      if (session?.user) void supabase.rpc("touch_nexa_activity").then(() => undefined);
    });

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!ativo) return;
      setUser(error ? null : (data.user ?? null));
      setCarregando(false);
      if (!error && data.user) void supabase.rpc("touch_nexa_activity").then(() => undefined);
    });

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, carregando };
}
