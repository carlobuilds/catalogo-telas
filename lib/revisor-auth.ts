import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAllowedAdminEmail, isAllowedRevisorEmail } from "@/lib/admin-allowlist";

/**
 * Autorización del revisor: sesión de Supabase Auth + allowlist `REVISOR_EMAILS`
 * (ver `lib/admin-allowlist.ts`). Un admin también puede entrar a /revision —
 * es un superset de permisos — pero /admin sigue siendo 100% admin-only.
 */
export type SesionRevisor = {
  user: User | null;
  autorizado: boolean;
  esAdmin: boolean;
};

/**
 * Memoizada por request con `cache()` de React, igual que `getSesionAdmin`:
 * `getUser()` no es una lectura local, siempre pega a /auth/v1/user, así que
 * la página y la server action que dispara pagan un solo viaje.
 */
export const getSesionRevisor = cache(async (): Promise<SesionRevisor> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const esAdmin = isAllowedAdminEmail(user?.email, process.env.ADMIN_EMAILS);
  const esRevisor = isAllowedRevisorEmail(user?.email, process.env.REVISOR_EMAILS);

  return {
    user,
    autorizado: esAdmin || esRevisor,
    esAdmin,
  };
});
