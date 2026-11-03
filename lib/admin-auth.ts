import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAllowedAdminEmail } from "@/lib/admin-allowlist";

/**
 * Autorización del admin: sesión de Supabase Auth + allowlist de correos
 * (ver `lib/admin-allowlist.ts`).
 *
 * La sesión sola NO basta: un proyecto de Supabase permite sign-up público
 * por default, así que cualquiera podría crearse una cuenta. `ADMIN_EMAILS`
 * (variable SOLO de servidor) define quién administra.
 */
export type SesionAdmin = {
  user: User | null;
  autorizado: boolean;
};

/**
 * Con `cache()` el layout del panel y la página piden la sesión UNA vez por
 * request: los dos llaman a `exigirAdmin()` y sin esto serían dos viajes a
 * Supabase Auth en cada navegación.
 */
export const getSesionAdmin = cache(async (): Promise<SesionAdmin> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    user,
    autorizado: isAllowedAdminEmail(user?.email, process.env.ADMIN_EMAILS),
  };
});

/**
 * Puerta de cada pantalla del panel. Se llama en el layout Y en cada página:
 * Next no vuelve a correr el layout en navegaciones parciales y la página se
 * puede pedir sola, así que el layout no protege nada por sí mismo.
 *
 * Sin permiso se manda al login —que sabe mostrar "cuenta sin permisos"—
 * y no a `/admin`: redirigir a una ruta que vuelve a exigir lo mismo es
 * como se arman los bucles de redirección.
 */
export async function exigirAdmin(): Promise<{ user: User; email: string }> {
  const { user, autorizado } = await getSesionAdmin();
  if (!user || !autorizado) redirect("/admin/login");
  return { user, email: user.email ?? "" };
}
