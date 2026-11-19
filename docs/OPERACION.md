# Operación del catálogo

Manual para operar el catálogo sin depender de una sola persona. Las celdas marcadas
**☐ por llenar** las completa quien tiene acceso a la cuenta (no se pueden saber
desde el código).

**Regla de oro:** antes de cualquier cosa que escriba en producción (SQL, un comando
con `--aplicar` o `--upload`), un respaldo completo. Ver [Respaldos](#respaldos).

## 1. Piezas y cuentas

| Pieza | Para qué | Dueño de la cuenta | Plan |
|---|---|---|---|
| **Vercel** — equipo `apicehq`, proyecto `catalogo-telas` | Hospeda el sitio; publica al fusionar a `main` | ☐ por llenar | ☐ por llenar |
| **Supabase** — proyecto del catálogo | Base de datos (Postgres), fotos (bucket `telas`) y cuentas (Auth) | ☐ por llenar | ☐ por llenar |
| **GitHub** — `carlobuilds/catalogo-telas` | Código, PRs y CI | ☐ por llenar | — |
| **Dominio** | Hoy no hay: el sitio vive en `catalogo-telas.vercel.app` | — | — |

> Ojo: puede haber otros proyectos de Supabase en la misma cuenta. Antes de correr SQL,
> confirma que el SQL Editor está abierto en el proyecto del catálogo (el de la URL que
> está en `NEXT_PUBLIC_SUPABASE_URL`).

## 2. Despliegue

- **Producción se publica sola** cuando un PR se fusiona a `main` (integración de
  GitHub con Vercel). No hay que correr nada.
- **Cada PR tiene su vista previa** en Vercel. Está protegida: pide iniciar sesión en
  Vercel, así que la tienda no la puede abrir. Ojo: **la vista previa usa la misma base
  de datos que producción**; lo que se guarde ahí es real.
- **La CI** (`.github/workflows/ci.yml`) corre lint, pruebas y build en cada PR, sin
  llaves. No fusionar con la CI en rojo.
- **Variables `NEXT_PUBLIC_*`**: se hornean en el build. Cambiarlas en Vercel no tiene
  efecto hasta volver a desplegar (Deployments → el último → Redeploy). Las demás
  también se leen al desplegar: después de cambiar cualquier variable, redeploy.
- **Volver a una versión anterior:** Vercel → Deployments → el despliegue bueno →
  "Promote to Production" (o "Instant Rollback"). No toca la base de datos: si el
  problema fue un SQL, hay que corregirlo aparte.

## 3. Variables de entorno

Viven en Vercel (Settings → Environment Variables) y, para trabajar en local, en
`.env.local` (nunca en el repo). Plantilla comentada: `.env.example`.

| Variable | Dónde se usa | Si falta |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Lectura pública del catálogo | El sitio muestra instrucciones de configuración |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor: guardados de /admin y /revision, contador, scripts | No se puede escribir nada (útil en local para trabajar sin riesgo) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número de la tienda, internacional sin `+` | La cesta avisa que falta y no deja enviar |
| `ADMIN_EMAILS` · `REVISOR_EMAILS` | Correos autorizados, separados por comas | Nadie entra a /admin o /revision |
| `NEXT_PUBLIC_SITE_URL` | Dominio propio para los links compartidos | Se usa el de Vercel (`VERCEL_PROJECT_PRODUCTION_URL`) |
| `NEXT_PUBLIC_DEMO_PRICES` | Precios de referencia de demostración | Apagado (así debe estar en producción) |
| `INVENTARIO_UMBRAL_BAJO` | Umbral de "stock bajo" en Entradas y salidas | 10 |

## 4. Base de datos y migraciones

- El esquema completo es `catalogo_telas_supabase.sql`, por secciones. **No volver a
  correrlo entero**: la sección 11 hace un `update variante`.
- Cada cambio de esquema posterior vive en `sql/<fecha>-<tema>.sql`. Se corre **ese
  archivo**: Supabase Studio → SQL Editor → pegar el archivo completo → Run. Todos son
  idempotentes y solo agregan.
- El código tolera las migraciones que falten (muestra un aviso o simplemente no usa
  la función), así que el orden entre fusionar el código y correr el SQL no rompe nada.

| Sección | Qué agrega | Archivo | Corrida en producción |
|---|---|---|---|
| 0–10 | Esquema base, vista, RLS, inventario (kardex) | `catalogo_telas_supabase.sql` | ☐ por llenar |
| 11 | Orden manual de colores | idem | ☐ por llenar |
| 12 | Derivados WebP de las fotos | idem | ☐ por llenar |
| 13 | Mercería: unidad de venta | idem | ☐ por llenar |
| 14–15 | Revisión y notas del revisor | idem | ☐ por llenar |
| 16 | Un producto en varias secciones | `sql/2026-10-31-categorias-extra.sql` | ☐ por confirmar: si al abrir un producto en /admin sale "Falta correr la migración de categorías extra", no se ha corrido |
| 17 | Fondo blanco | `sql/2026-11-03-fondo-blanco.sql` | Sí, 2026-11-03 |
| 18 | Contador de uso | `sql/2026-11-19-eventos.sql` | ☐ por correr |

## 5. Respaldos

- **Cuándo:** antes de cualquier SQL o comando que escriba, antes de un lote grande de
  ingesta, y al menos una vez al mes.
- **Cómo:** `pnpm respaldo:completo --destino="…/Telas La Jalisciense/Respaldos/<fecha>-<motivo>"`.
  Solo lee. Se reanuda si se corta. Necesita la llave `service_role` en `.env.local`.
- **Dónde:** siempre **fuera** del repo y del worktree. Contiene los correos de las
  cuentas de admin y revisor: no se comparte.
- **Qué trae:** cada tabla en JSON, la vista en `catalogo.csv` (se abre en Excel), copia
  completa del bucket, y un `LEEME.txt` con el conteo de filas y el orden de restauración.
- **Restaurar** es manual (no hay script): reinsertar cada `datos/<tabla>.json` con
  upsert por llave primaria en el orden que dice el `LEEME.txt`, y subir `fotos/` al
  bucket. **Nunca se ha probado una restauración completa**: hacerlo una vez en un
  proyecto de prueba antes de necesitarlo de verdad.
- Revisar en el panel de Supabase si el plan contratado incluye respaldos automáticos
  diarios: ☐ por llenar.

## 6. Accesos

**Dar de alta** a un admin o revisor:

1. `pnpm admin:crear --email=<correo>` (simulacro: dice qué haría), luego con
   `--aplicar` (y `--rol=revisor` si es revisor). Imprime la contraseña **una sola
   vez**: dictarla por teléfono, nunca por chat.
2. Agregar el correo a `ADMIN_EMAILS` o `REVISOR_EMAILS` en Vercel. El script imprime
   la línea completa ya armada.
3. Redeploy en Vercel.

**Dar de baja:** quitar el correo de `ADMIN_EMAILS` / `REVISOR_EMAILS` en Vercel y hacer
redeploy (eso ya le cierra la puerta), y después borrar la cuenta en Supabase →
Authentication → Users.

**Olvidó la contraseña:** `pnpm admin:crear --email=<correo> --reset --aplicar`.

`pnpm admin:crear --listar` dice quién tiene cuenta y si está autorizado.

## 7. Rotación de llaves

Cuando alguien con acceso deja el proyecto, o si una llave pudo haberse filtrado:

1. Supabase → Project Settings → API: generar llaves nuevas (la pública y la de servicio).
2. Vercel: actualizar `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`, y redeploy.
3. Actualizar `.env.local` en cada máquina que trabaje con el proyecto.
4. Confirmar que el catálogo carga y que /admin guarda.

La llave pública (`anon`) es pública por diseño: solo permite leer, por RLS. La que
importa es la de servicio.

## 8. Fotos nuevas

**Pocas piezas:** desde el panel, en "Nueva mercería" o "Nueva tela", con el curador de
encuadre. Solo crea; no hay forma de pisar lo existente.

**Un lote:**

1. Fotos en una carpeta. Si vienen en RAW o sin encuadrar: `pnpm preparar --in=<carpeta>`
   (con `--exposicion=2` si son de fondo negro y salen oscuras).
2. `pnpm ingest --dir=<carpeta>` → abrir `catalog-manifest.csv` y capturar nombre,
   categoría, color, precio y unidad. Volver a correrlo no borra lo capturado.
3. `pnpm ingest --validar` hasta que salga limpio.
4. Respaldo completo.
5. `pnpm ingest --upload`: **solo crea**. Lo que ya existía (código, color o archivo) se
   lista como "saltada" y no se toca. `--actualizar` reescribiría lo existente: no usarlo
   sin respaldo y sin estar seguro.
6. Si alguna foto quedó sin derivados: `pnpm backfill:derivados`.
7. Si es un tipo de **tela** nuevo (satín, crepé…), agregar su categoría a la lista de
   telas en `lib/catalogos.ts`; si es mercería, a una sección. Si no, sale en el lugar
   equivocado.

Las fotos nuevas nacen **sin** fondo blanco; se prenden en `/admin/fondos`.

## 9. Contador de uso

Cuenta toques a "Enviar pedido por WhatsApp" y links compartidos, sin datos personales.
Para activarlo, correr `sql/2026-11-19-eventos.sql` (sección 18). Las cifras se ven en
`/admin/uso`, por semana. Solo cuenta en producción: probar en la vista previa no suma.
Cuenta toques al botón, no mensajes enviados.

## 10. Capturas de las guías

Las guías imprimibles (`/admin/guias`) usan capturas de `public/guias/`. Si cambia una
pantalla, se rehace su captura:

- Con Playwright y el Chrome del sistema (`channel: "chrome"`,
  `--force-color-profile=srgb`, `deviceScaleFactor: 2`), y se bajan con sharp a WebP
  calidad 88: celular 620×1240 (vista de 375×750) y panel 1100×773.
- El panel del navegador de la app NO sirve: escala la vista y altera el color.
- Para /admin y /revision la sesión la inicia una persona a mano en una ventana
  visible (nunca se escribe la contraseña en un script), y se bloquea todo lo que no
  sea lectura. **Nunca tocar "Salir"**: cierra la sesión en todos los dispositivos.
- Pendiente: `revision-cola.webp` todavía muestra la barra de avance anterior.

## 11. Límites del plan

El 3 de noviembre de 2026 el bucket pesaba 375 MB (2,564 objetos) sin contar las
máscaras de fondo blanco. Revisar de vez en cuando Supabase → Usage (almacenamiento y
transferencia) contra el límite del plan contratado.

## Historial de scripts borrados

Scripts de curaduría que se corrieron **una sola vez** contra producción
(agosto–octubre 2026) y se borraron del repo al cerrar la Fase 1, para que nadie
los vuelva a correr por error. Siguen en el historial de git: para verlos,
`git show <commit>:scripts/<archivo>`. La columna "commit" es la última versión
del archivo.

| Archivo | Creado | Commit | Qué hizo |
|---|---|---|---|
| `limpiar-duplicados.ts` | 2026-08-18 | `753e28f` | Limpiar duplicados de la resubida WebP |
| `procesar-fotos-crop.ts` | 2026-08-18 | `753e28f` | Procesar y subir las fotos centradas de `0FotosCrop` |
| `etiquetas-bolsitas.ts` | 2026-08-04 | `730c97e` | Volcar al CSV las etiquetas manuscritas de las bolsitas de piedra (lote de agosto) |
| `afinar-catalogo.ts` | 2026-08-20 | `347cb37` | Afinar nombres y limpiar sobrantes |
| `fusionar-modelos.ts` | 2026-08-20 | `347cb37` | Fusionar fichas que son el mismo modelo |
| `partir-modelos.ts` | 2026-08-20 | `347cb37` | Partir fichas que escondían varios modelos |
| `separar-colores.ts` | 2026-08-20 | `347cb37` | Separar colores escondidos y reubicar intrusos |
| `extraer-fichas.ts` | 2026-08-20 | `347cb37` | Extraer a ficha propia lo que quedó sin color |
| `describir.ts` | 2026-08-20 | `996b51f` | Descripciones por familia |
| `fusionar-cierres.ts` | 2026-08-20 | `347cb37` | Fusionar "Cierre" dentro de "Cierre oculto" |
| `renombrar-galon-encaje.ts` | 2026-08-20 | `347cb37` | Nombrar y fusionar "Galón de encaje" |
| `fusionar-mariposas.ts` | 2026-08-20 | `347cb37` | Fusionar "Mariposa de organza" dentro de "Mariposa bordada" |
| `dividir-motivos.ts` | 2026-08-20 | `347cb37` | Separar "Motivos" por figura |
| `limpiar-aplicacion-rosas.ts` | 2026-08-20 | `347cb37` | Sacar los intrusos de "Aplicación de rosas" |
| `agrupar-tira-pedreria.ts` | 2026-08-20 | `347cb37` | Ordenar "Tira de pedrería": intrusos por forma y colores escondidos |
| `nombrar-botones-tul.ts` | 2026-08-20 | `347cb37` | Nombrar botones y tiras de tul bordado |
| `nombrar-merceria.ts` | 2026-08-20 | `996b51f` | Quitar el código del proveedor de los nombres |
| `corregir-vocabulario.ts` | 2026-08-20 | `996b51f` | Corregir vocabulario: tornasol y guipiur |
| `separar-tiras-tul.ts` | 2026-10-30 | `0e441ba` | Pasar las "Tira de tul bordado…" de la categoría de tela a mercería |
| `_tmp-inspeccionar.ts` | 2026-08-21 | `0fe61f5` | Inspección de solo lectura de las variantes y fotos de unos slugs |
