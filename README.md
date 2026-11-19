# Telas La Jalisciense — Catálogo digital

Catálogo web de **mercería y telas** para una tienda al menudeo en Fresnillo. Las
clientas eligen productos desde el celular, arman su pedido (por pieza, par, bolsa o
metro) y lo mandan por WhatsApp a la tienda. La tienda lo administra desde un panel
con el flujo de SICAR, y un revisor corrige precios y códigos desde el celular.

- **Producción:** https://catalogo-telas.vercel.app — se publica sola al fusionar a `main`.
- **Operación** (despliegue, migraciones, respaldos, accesos, llaves): [`docs/OPERACION.md`](docs/OPERACION.md).
- **Desarrollo** (convenciones, decisiones y su porqué): [`CLAUDE.md`](CLAUDE.md).

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres +
Storage) · Vercel · pnpm.

---

## Pantallas

| Ruta | Quién | Qué es |
|---|---|---|
| `/` · `/merceria` · `/telas` | Clientas | Los dos catálogos. Mercería se recorre por secciones (Cristalería, Pedrería, Encajes y tiras, Flores, Costura); filtros y búsqueda viven en la URL, así que se comparten |
| `/tela/[slug]` | Clientas | Ficha: fotos, zoom, "Ver en fondo blanco", colores y cantidad |
| `/admin` | Tienda | Panel estilo SICAR: Artículos, Nueva mercería, Nueva tela, Entradas y salidas, Revisión |
| `/revision` | Revisor | Cola de revisión en el celular, con el avance de cierre (listas para entregar, sin precio, sin foto) |
| `/admin/fondos` · `/admin/guias` · `/admin/uso` | Carlo | Fuera del menú a propósito; se entra escribiendo la URL |

## Puesta en marcha (desarrollo)

Requisitos: Node 20.9+, pnpm 10 (la versión exacta está en `packageManager`), y acceso
al proyecto de Supabase.

```bash
pnpm install
cp .env.example .env.local   # llenar las llaves: ver la tabla de variables en docs/OPERACION.md
pnpm dev
```

Sin llaves el sitio no truena: muestra cómo configurarlo. Para probar navegación y
scroll usa el build de producción (`pnpm build && pnpm start`): hay saltos que solo
aparecen ahí.

> Para trabajar sin riesgo, deja en `.env.local` solo las variables `NEXT_PUBLIC_*`:
> sin `SUPABASE_SERVICE_ROLE_KEY` nada puede escribir en la base de producción.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Desarrollo, build y servidor de producción |
| `pnpm lint` · `pnpm test` | ESLint sobre todo el árbol y las pruebas (Vitest). La CI corre ambos más el build en cada PR |
| `pnpm iconos` | Regenera `components/ui/iconos/` tras agregar un icono al generador |
| `pnpm preparar --in=<carpeta>` | RAW de cámara → JPEG recortado al producto (macOS) |
| `pnpm ingest` | Genera `catalog-manifest.csv` para revisar. **No sube nada** |
| `pnpm ingest --validar` | Revisa el CSV con las reglas de la subida, sin escribir |
| `pnpm ingest --upload` | Sube fotos y **solo crea** lo nuevo: lo que ya existe se reporta y no se toca |
| `pnpm backfill:derivados` · `pnpm backfill:mascaras` | Rehacen derivados WebP / máscaras faltantes (las máscaras, en simulacro por defecto) |
| `pnpm respaldo:completo --destino=<carpeta>` | Respaldo completo de producción, solo lectura |
| `pnpm diagnostico:precios` | Solo lectura: precios o códigos que se vaciaron desde un respaldo |
| `pnpm admin:crear --email=<correo>` | Alta de admin o revisor (simulacro por defecto) |
| `pnpm clasificar` | Asigna categoría por el prefijo del código (simulacro por defecto) |

Todo comando que escribe en producción trae **simulacro por defecto** o pide un flag
explícito, y se corre después de un respaldo.

## Modelo de datos (resumen)

```
tela (producto) → variante (color/código: precio, unidad de venta, existencia) → foto (bucket `telas`)
tela ↔ caso_uso · tela ↔ oportunidad · tela ↔ categoría extra
lookups: color (con hex), categoria, acabado, caso_uso, oportunidad
```

- El frontend lee la **vista `catalogo_telas`** (una fila por variante).
- `variante.precio` es por **unidad de venta** (metro, pieza, par, bolsa, rollo, juego).
- `sku` es único pero opcional: nunca se inventa.
- En la base se guarda la **ruta** de cada foto dentro del bucket, no la URL.
- La búsqueda corre en JavaScript sobre un índice cacheado (`lib/busqueda/`).

## Seguridad

- **RLS activo** en todas las tablas: el público solo lee; escribe únicamente el servidor
  con `service_role` (`lib/supabase/admin.ts`, que no puede importarse desde el navegador).
- `/admin` y `/revision` piden sesión **y** que el correo esté en `ADMIN_EMAILS` /
  `REVISOR_EMAILS`: Supabase permite registro público, así que la sesión sola no basta.
- Los guardados de `/admin` son **parches parciales**: un campo que no viene en el
  formulario no se toca, nunca se vacía.
- Las llaves reales nunca van al repo: `.env.local` está en `.gitignore`.
