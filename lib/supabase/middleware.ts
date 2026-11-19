import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refresca la sesión de Supabase en cada request a /admin o /revision y
 * redirige a SU PROPIO login si no hay usuario. Patrón estándar de
 * @supabase/ssr: el middleware es el único lugar donde SIEMPRE se pueden
 * escribir cookies, así que aquí se renueva el token antes de que caduque.
 *
 * Solo corre bajo /admin y /revision (ver matcher en middleware.ts): el
 * catálogo público no paga este costo.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Dos zonas protegidas con logins DISTINTOS (/admin y /revision comparten
  // el mismo backend de Auth, pero cada una redirige a su propia pantalla).
  const esRevision = pathname.startsWith("/revision");
  const esLogin = esRevision ? pathname.startsWith("/revision/login") : pathname.startsWith("/admin/login");

  // Las DOS pantallas de login se saltan el middleware entero: no hay ruta
  // que proteger, y la propia página ya llama a getSesionRevisor() /
  // getSesionAdmin() para rebotar a quien YA entró. Sin cookie, `getUser()`
  // no tocaba la red; lo que esto quita es el viaje duplicado de "ya tengo
  // sesión y abro el login" (middleware + página preguntaban lo mismo) y saca
  // al POST de la server action de login de un middleware sin nada que hacer.
  if (esLogin) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // No usar getSession() aquí: getUser() valida el token contra Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = esRevision ? "/revision/login" : "/admin/login";
    const redireccion = NextResponse.redirect(url);

    // El redirect NO puede tirar lo que Supabase acaba de escribir. Cuando el
    // refresh token ya no existe del lado del servidor (rotado, sesión cerrada
    // en otro dispositivo, proyecto reiniciado), @supabase/ssr responde
    // BORRANDO las cookies de auth, y ese borrado va sobre `supabaseResponse`.
    // Devolver el redirect pelado lo descartaba: la cookie podrida sobrevivía,
    // cada visita reintentaba el refresh (un viaje de red condenado a fallar)
    // y rebotaba al login sin arreglar nada, hasta borrar cookies a mano.
    supabaseResponse.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
    return redireccion;
  }

  return supabaseResponse;
}
