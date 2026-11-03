import { ShieldWarning, SignOut } from "@/components/ui/iconos";
import { logout } from "@/app/admin/actions";

/**
 * Sesión válida pero correo fuera de `ADMIN_EMAILS`. Vive en el login (no en
 * el panel): `exigirAdmin` manda aquí a quien no tiene permiso, y el login
 * solo redirige al panel a quien SÍ lo tiene — así nunca hay bucle.
 */
export function NoAutorizado({ email }: { email: string }) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-xl bg-amber/10 text-amber">
        <ShieldWarning className="size-7" />
      </span>
      <h1 className="text-2xl font-bold text-ink-display">Cuenta sin permisos</h1>
      <p className="mt-2 text-base text-ink-soft">
        La cuenta <strong className="break-all font-semibold text-ink-display">{email}</strong> no
        está en la lista de administradores. Pide a quien administra el catálogo que la agregue.
      </p>
      <form action={logout} className="mt-6">
        <button
          type="submit"
          className="inline-flex min-h-12 items-center gap-2 rounded border border-line bg-surface px-5 text-base font-semibold text-ink-display shadow-sm transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
        >
          <SignOut className="size-5" />
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
