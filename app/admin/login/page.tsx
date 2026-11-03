import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Warning, LockSimple } from "@/components/ui/iconos";
import { getSesionAdmin } from "@/lib/admin-auth";
import { login } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { NoAutorizado } from "@/components/admin/NoAutorizado";

export const metadata: Metadata = {
  title: "Entrar — Admin Telas La Jalisciense",
  robots: { index: false, follow: false },
};

const CLASE_INPUT =
  "h-12 rounded border border-line bg-surface-container-lowest px-4 text-base font-normal text-ink-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Solo se redirige a quien PUEDE entrar al panel. Con sesión pero sin
  // permiso se queda aquí viendo por qué: el panel lo mandaría de vuelta.
  const { user, autorizado } = await getSesionAdmin();
  if (user && autorizado) redirect("/admin");
  if (user) return <NoAutorizado email={user.email ?? ""} />;

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16 sm:py-24">
      <div className="rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-lg bg-amber/10 text-amber">
            <LockSimple className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-ink-display">Administración</h1>
            <p className="text-base text-ink-soft">Solo personal de la tienda.</p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-peligro/30 bg-peligro-suave p-3 text-base text-peligro"
          >
            <Warning className="mt-0.5 size-5 shrink-0" />
            Correo o contraseña incorrectos.
          </div>
        )}

        <form action={login} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-base font-semibold text-ink-display">
            Correo
            <input type="email" name="email" required autoComplete="email" className={CLASE_INPUT} />
          </label>
          <label className="flex flex-col gap-1.5 text-base font-semibold text-ink-display">
            Contraseña
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className={CLASE_INPUT}
            />
          </label>
          <SubmitButton label="Entrar" pendingLabel="Entrando…" />
        </form>
      </div>
    </main>
  );
}
