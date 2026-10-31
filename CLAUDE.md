# Telas La Jalisciense — Catálogo digital

Catálogo web (capa de presentación de un esquema Supabase) para una tienda de telas al
menudeo en Fresnillo. También alimenta un agente de ventas por WhatsApp. Dos perfiles de
uso: cliente final que navega, y vendedor en tablet que arma cotizaciones.

## Stack
- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Supabase**: `@supabase/supabase-js` + `@supabase/ssr`
  - cliente `anon` → lectura pública (Server Components)
  - `service_role` → SOLO en server actions / route handlers (`lib/supabase/admin.ts`). NUNCA en el cliente.
- **next/image** para imágenes. Tipografía: **Hanken Grotesk** en TODA la jerarquía
  (pesos 400/600/700), como manda el design system de Stitch "Artisanal Modernity"
  (`design-system/stitch/`). Los tokens `--font-display`/`--font-body`/`--font-serif`
  se conservan por historia y todos apuntan a ella — no reintroducir Bodoni/Inter.
- **lucide-react** para iconos. Sin librerías de UI pesadas: componentes propios.

## Comandos (gestor: **pnpm**)
- `pnpm dev` — servidor de desarrollo
- `pnpm build` / `pnpm start` — producción
- `pnpm preparar --in=<carpeta>` — RAW de cámara (.ARW…) → JPEG recortado al producto
  (`sips` + `lib/images/recorte.ts`; macOS-only, el original no se toca). Correr ANTES de
  la ingesta cuando las fotos vengan en RAW o sin encuadrar.
  `--exposicion=2` sube la exposición al 200% (default 1 = sin cambio); las tomas de
  mercería sobre fondo negro vienen subexpuestas y sin esto el color no se distingue.
  Medido sobre el lote: solo 0,6% de los pixeles llega al techo, así que a 200% no se
  queman las altas luces — el brillo especular de la pedrería se conserva.
  Escala los tres canales RGB por igual, que es lo único que aclara SIN mover el tono
  (matiz y saturación HSV son razones entre canales). NO usar `modulate({brightness})`:
  desatura entre 19% y 36% y el rosa se va a malva gris — hay pruebas que lo fijan.
  NO enfoca: el sharpening es del pipeline de derivados, aplicarlo aquí deja halos dobles.
- `pnpm ingest` — genera `catalog-manifest.csv` (revisión manual, NO sube nada).
  Volver a correrlo **fusiona**: lo capturado a mano gana y lo deducido del nombre de
  archivo solo rellena celdas vacías, así reprocesar un lote no borra horas de captura
  (`lib/ingesta/fusion.ts`, con pruebas). Las notas automáticas van marcadas `[auto]`
  para poder tirarlas al regenerar sin tocar las que escribió la tienda.
  `--forzar` regenera desde cero. El sidecar `catalog-manifest.auto.json` recuerda qué
  puso el parser, para poder corregirlo sin pisar lo que capturó la tienda.
- `pnpm etiquetas:bolsitas` — vuelca sobre el CSV el código/cantidad/precio que están
  escritos A MANO en la etiqueta de cada bolsita (se leyeron de la foto, ningún parser
  los saca). Idempotente; los precios van marcados para confirmar.
- `pnpm ingest --upload` — tras aprobar el CSV: sube fotos al bucket y hace upsert idempotente
- `pnpm backfill:derivados` — genera derivados WebP para fotos con `derivados IS NULL`
  (idempotente; acepta `--limit=N`)
- `pnpm admin:crear --email=<correo>` — da de alta un administrador. Un admin son DOS
  cosas y hacen falta las dos: la cuenta de Supabase Auth (sesión) y el correo en
  `ADMIN_EMAILS` (autorización) — la sesión sola no basta porque Supabase permite
  sign-up público. El script hace la primera y te imprime el `ADMIN_EMAILS` completo
  ya armado para la segunda; no puede escribir las variables de Vercel.
  **Simulacro por defecto**: `--aplicar` escribe. La contraseña NO se pasa por
  argumento (quedaría en el historial del shell): la genera con el CSPRNG y la
  muestra UNA vez, sin caracteres ambiguos porque se dicta por teléfono y se
  teclea en tablet. `--listar` dice quién tiene cuenta y si está autorizado;
  `--reset --aplicar` repone la contraseña de una cuenta que ya existe.
- `pnpm respaldo:completo --destino=<carpeta>` — respaldo de producción COMPLETO y solo
  lectura: las 11 tablas en JSON (paginadas con `order`), cuentas de admin/revisor, la vista
  en `catalogo.csv` y copia de todo el bucket `telas`, con verificación al final. Correrlo
  antes de cualquier `--aplicar` y guardarlo FUERA del worktree (`…/Respaldos/<fecha>-<motivo>`).
  `pnpm respaldo` (6 tablas a un JSON) sigue existiendo para los scripts de curaduría.
- `pnpm diagnostico:precios [--respaldo=<carpeta>]` — SOLO LECTURA: compara `variante` contra
  el `datos/variante.json` de un respaldo y lista precios/SKU que pasaron de tener valor a
  vacío, más las variantes revisadas sin precio. Nació del bug del editor de /admin que
  escribía `precio: null` al guardar (ver "Parche parcial" en Convenciones).
- `pnpm separar:tiras-tul` — pasa las "Tira de tul bordado…" de la categoría de tela
  `tul-bordado` a `tira-de-tul-bordado` (mercería). Simulacro por defecto; `--aplicar` exige
  `--respaldo=<carpeta>` y deja ahí `deshacer-tiras-tul.json`. Solo toca `tela.categoria_id`.
- `pnpm clasificar` — sobre lo YA SUBIDO: asigna categoría a cada tela según el prefijo
  de su código (`lib/ingesta/categorias.ts`) y le quita a las bolsitas de piedra el
  número de cámara del nombre. **Simulacro por defecto**: `--aplicar` escribe,
  `--forzar` repone categorías ya asignadas (enumera qué reemplaza, porque puede pisar
  lo capturado a mano desde /admin). Idempotente.

## Modelo de datos (ver `catalogo_telas_supabase.sql`)
El catálogo ya no es solo tela: también hay **mercería/avíos** (pedrería, flores, copas,
botones, cinta). Por eso `variante.precio` NO es siempre por metro — `unidad_venta`
(metro/pieza/par/bolsa/rollo/juego) y `piezas_por_unidad` dicen qué se está cobrando.
La vista sigue exponiendo `precio_metro` como **alias deprecado** de `precio`.

**`lib/unidades.ts` es la única fuente de esa vocabulario.** No hardcodear "/m" ni
pasos de 0.5 en ningún lado: la unidad decide el sufijo del precio, el plural del
stepper, el PASO y el MÍNIMO con que se cuenta, y si viene `empacada` (bolsa,
rollo, juego: las únicas donde tiene sentido preguntar `piezas_por_unidad`). La tela se corta a
medios metros; un botón no se parte a la mitad. Está usada en `ProductCard`,
`/tela/[slug]`, `AddToCart`, `CartDrawer`, `lib/whatsapp-message.ts` y los dos
formularios de `/admin`. `unidadDe(null)` cae a **metro** a propósito: es como se
comportaba todo antes de que existiera la columna, así que un dato faltante —o un
carrito ya guardado en localStorage— no le cambia el pedido a nadie.

**Dos catálogos públicos, Mercería y Telas** (`lib/catalogos.ts`): viven en las mismas
tablas y los separa la CATEGORÍA del modelo. `catalogoDeCategoria()` es la única regla —una
lista corta de categorías de tela; lo desconocido o sin categoría va a mercería— y se
aplica al construir el índice del catálogo (`lib/busqueda/indice.ts`), no con un filtro SQL
aparte. La portada (`/`) es `CATALOGO_PORTADA` (hoy mercería: el catálogo es casi todo
avíos); `/merceria` y `/telas` existen siempre. Mercería se recorre por SECCIONES
(`SECCIONES_MERCERIA`: Cristalería, Pedrería, Encajes y tiras, Flores, Costura; URL `?sec=`)
y los chips de categoría salen dentro de la sección. Una categoría nueva de mercería debe
entrar a una sección: `catalogos.test.ts` lo exige para las de la ingesta.

**Un producto en varias secciones** (sección 16 del SQL, `sql/2026-10-31-categorias-extra.sql`):
categoría PRINCIPAL (`tela.categoria_id`) + "también aparece en" (tabla `tela_categoria`, que la
vista expone como `categorias_extra text[]`). El catálogo lo decide SOLO la principal; las extras
del otro catálogo se ignoran (`categoriasExtraPosibles` ni las ofrece) y las del mismo cuentan
para secciones, chips y conteos. La card muestra la principal. Se editan en `/admin/tela/[id]` y
en `/revision/producto/[id]` (`lib/categorias-extra.ts`). Todo tolera que la migración no haya
corrido: el índice lee la vista sin la columna (42703) y las pantallas muestran el aviso
(42P01/PGRST205). Falla CERRADO: si las extras no se pudieron leer no se pintan las casillas
—vacías, guardar borraría las existentes— y el guardado inserta antes de quitar.

`tela` (modelo) → `variante` (SKU/color, con precio/stock/propiedades ópticas) → `foto`
(en bucket Storage `telas`). N:N: `tela↔caso_uso`, `tela↔oportunidad`. Lookups: `color`
(con hex), `categoria`, `acabado`, `caso_uso`, `oportunidad`.
- Usar la **vista `catalogo_telas`** (una fila por variante) para listados/filtros.
- `sku` es UNIQUE pero NULLABLE: hay fotos sin SKU; **nunca inventar SKU**.
- `variante.orden` (sección 11 del SQL) = orden manual de colores; se edita con
  drag & drop en `/admin/tela/[id]` y la vista lo expone como `variante_orden`.
- **Búsqueda en JS, no en SQL** (`lib/busqueda/`): `buscar_telas` no existe en producción.
  `getIndiceCatalogo` (`lib/queries.ts`) lee la vista PAGINADA de mil en mil (`order
  variante_id`, por el tope de filas de PostgREST) y arma un `ModeloIndice` por modelo,
  cacheado 60s con el tag `catalogo`. Sobre él corren el filtrado por modelo, las facetas, la
  búsqueda y las sugerencias. El motor (`motor.ts`) ignora acentos y mayúsculas, compara
  singular/plural por raíz, tolera errores de dedo (Damerau-Levenshtein ≤1 en palabras de 4–6
  letras, ≤2 de 7+) y entiende sinónimos (`sinonimos.ts`, EDITABLE: ahí van las palabras de la
  clientela). Todas las palabras deben coincidir; si nada las tiene todas, relaja a la mayoría y
  lo marca `aproximado`. El SKU exacto va primero. **Con precio real primero**: en cada vista,
  los modelos con precio capturado (en las variantes que se ven) salen antes.
  Las sugerencias del buscador vienen de `GET /api/sugerencias` (combobox ARIA en
  `SearchBar.tsx`); el grid ya no cambia con cada tecla, solo con Enter o al elegir.
- **Categoría desde el código**: la tienda codifica el tipo de producto en las letras del
  código (`HE`=hebilla, `BO`=botones, `JR`=corchetes, `BNK`/`KP`=tira de pedrería,
  `TGL`/`TG`/`G`=galón de ENCAJE —no es pedrería—, `BT`/`CT`/`TC`=cintillo, `D`/`DB`/`MC`=
  aplicación, `PCC`/`I`=piedra suelta, `B`+dígito=fleco). Las reglas viven en
  `lib/ingesta/categorias.ts`, **verificadas abriendo la foto de cada familia**, no
  deducidas del texto. El ORDEN de las reglas importa: cinco familias empiezan con B.

## Storage e imágenes
- Bucket **`telas`** (público). En la BD se guarda la **ruta relativa** dentro del bucket,
  no la URL absoluta. El frontend construye la URL pública con el cliente de Supabase.
- **Pipeline de derivados** (`lib/images/derivados.ts`, sección 12 del SQL): por cada
  original se generan WebP sm/800px, md/1600px, lg/2400px (sRGB forzado, sharpen
  post-resize) bajo el prefijo `derivados/{tamano}/` — el original NUNCA se toca.
  Corre solo: en `/admin` vía `after()` (server action `subirFotos`) y en la ingesta;
  fallos dejan `derivados = null` y los recoge `pnpm backfill:derivados`.
- `foto.derivados` (jsonb) guarda rutas + dimensiones reales; la vista lo expone como
  `foto_principal_derivados`. `TelaImage` usa `<img srcset>` directo al CDN de Supabase
  (sin recompresión de next/image) y cae a `next/image` sobre el original si es null.
  El `lg` también es para el agente de WhatsApp (n8n), que lee Storage directo.
- **Curaduría de encuadre en /admin** (`components/admin/CuradorFotos.tsx`): elegir una
  foto abre un visor a pantalla completa con el marco CUADRADO de la card (zoom con
  rueda/pellizco anclado al cursor, arrastre, giro de 90°, regla de tercios y una
  miniatura en vivo de cómo queda en vitrina). El navegador NO recorta píxeles: manda
  los bytes originales más un rectángulo en FRACCIONES (`lib/images/encuadre.ts`, campo
  `recortes` del form) y el corte lo hace sharp sobre la foto completa
  (`lib/images/aplicar-encuadre.ts`). Un `<canvas>` habría recomprimido, tirado el ICC y
  submuestreado en iOS — inaceptable donde el color ES el producto.
  Detalles que no son negociables: la orientación EXIF va en `sharp(x, {autoOrient:true})`
  y NO en `.rotate()`, porque sharp resetea la rotación si se le llama dos veces y las
  fotos verticales salían acostadas; el FORMATO se conserva (un PNG sin fondo pasado a
  JPEG perdería el alfa); y sin recorte real los bytes suben intactos, sin re-codificar.
  El recorte es DESTRUCTIVO a propósito, igual que `pnpm preparar`: el maestro del bucket
  es el asset horneado, no el negativo.
  La política de encuadre vive sola en `vistaLimitada()`: la ventana **nunca se sale de
  la foto**. `recorte.ts` sí deja desbordar y rellena con el fondo, porque ahí nadie está
  mirando; aquí hay alguien decidiendo y la previsualización promete "así se va a ver".

## Convenciones
- **La descripción no se muestra en el catálogo público**, por decisión de la tienda: ni en
  la ficha, ni en la metadata/vista previa del link, ni en el índice de búsqueda. La columna
  `tela.descripcion` se queda: /admin la edita y el agente de WhatsApp puede usarla.
- Paleta (tokens en `app/globals.css`, que es la ÚNICA fuente): fondo arena
  `#F1EDE2`, superficie crema `#FFF9ED`, tinta de párrafo `#0A0F14`, tinta de
  títulos `#26262B` (`ink-display`), **primario púrpura `#6E4B7A`**
  (hover `#56395F`), **acento mostaza `#7A4E0D`** (hover/apagado `#5C3C0A`),
  borde sutil `#DFD8C7`.
  **El púrpura NUNCA va en texto.** Es color de ACCIÓN: relleno de botón, chip
  activo, anillo de foco, borde del color elegido. Los títulos van en
  `ink-display`. Es decisión de la tienda: cuando el acento era también el color
  de los títulos, la pantalla entera se leía morada y el botón dejaba de destacar.
  El mostaza es INFORMACIÓN destacada: precio, etiqueta de categoría, badges, y
  toda la captura de `/admin`.
  **El púrpura vive bajo el nombre de token `heritage-navy`** (y su hover bajo
  `deep-slate`): nombres legados de cuando era azul marino, conservados a
  propósito porque renombrarlos serían ~235 ediciones mecánicas sin ganancia —
  el significado vive en `globals.css`, no en el nombre. No hay ningún azul en
- **Border-radius del design.md de Stitch "Artisanal Modernity"** (tokens en `globals.css`; es la escala default de Tailwind, Stitch no la personalizó). Base de **4px** (`rounded`) en cards de producto, imágenes, inputs, chips y botones; **8px** (`rounded-lg`) en paneles e imágenes enmarcadas; **12px** (`rounded-xl` y `rounded-2xl`, mismo valor: Stitch no define 2xl) en contenedores destacados y modales; **24px** (`rounded-3xl`) en bottom-sheets; **9999px** (`rounded-full`) exclusivamente en swatches de color circulares y puntos de estado.
- Accesibilidad AA: contraste, focus visible, navegable por teclado, `alt` en imágenes.
- **Móvil para clientela de 40+** (plan UX, Fase 3): nada con significado de menos de 14px
  (`text-sm`; `text-xs` solo para conteos y etiquetas cortas); inputs en `text-base` (16px, o
  iOS hace zoom al enfocarlos); botones y links de al menos 44px (`min-h-[44px]`); nunca
  `text-ink-soft/70` ni `/50` en texto; un botón que en móvil solo muestra icono lleva
  `aria-label`, y el nombre accesible de uno con texto EMPIEZA por ese texto.
- Estado de filtros/búsqueda en la **URL (querystring)** para que sea compartible.
  **Compartir la selección** (`lib/compartir.ts`, `components/CompartirVista.tsx`): el link es
  la ruta del catálogo con sus filtros y sin `ver`; quien lo abre ve pastillas con lo activo
  (cada una con su ✕) y "Ver todo el catálogo". `generateMetadata` de `/`, `/merceria` y
  `/telas` (`lib/metadata-vista.ts`) describe la vista ("Pedrería › Tira de pedrería · Oro") y
  usa como og:image el derivado `lg` del primer modelo. Las comas de las listas van literales en
  el link (`color=oro,plata`).
- No traer todo el catálogo al cliente: paginación/scroll infinito; cachear lecturas en Server Components.

- **Parche parcial en los guardados de /admin**: una acción escribe SOLO las columnas que
  trae el formulario (`lib/admin/campos.ts`, con pruebas). Un campo ausente es "no lo toqué",
  nunca `null`. Las casillas viajan con `<input type="hidden" name="campos_presentes">`
  porque una casilla desmarcada no llega en el FormData. El input del precio se llama
  `precio` (la columna); `precio_metro` es solo el alias de la VISTA.

## Seguridad
- RLS activo: lectura pública (anon SELECT), escritura solo `service_role`.
- Llaves reales nunca al repo. Ver `.env.example`.

## Orden de trabajo (por fases, mostrar antes de avanzar)
1. ✅ Esquema SQL (`catalogo_telas_supabase.sql`)
2. ✅ Scaffolding + conexión lectura + grid mínimo
3. ✅ Script de ingesta (manifest CSV primero)
4. ✅ Filtros + detalle + selector de color. Los filtros son chips de
   `components/CatalogToolbar.tsx` con el estado en la URL (`lib/filtros.ts`): categoría,
   color, acabado y disponibilidad. Las facetas (`getFacetas`) se calculan sobre el
   catálogo COMPLETO y solo se pinta el chip de lo que algún producto tiene, así que
   la barra crece sola conforme la tienda captura más datos. La paginación es POR
   MODELO (`?ver=N`, 48 por tanda): la vista trae una fila por variante pero el grid
   pinta una card por modelo, así que cortar por filas partiría un modelo entre dos
   páginas y la card saldría con la mitad de sus colores. `getCatalogo` va en dos
   pasos —qué modelos cumplen y en qué orden, sobre el índice en memoria (da el total
   honesto), y luego las filas de esa página con `.in(tela_id)` en trozos de 48 para no
   reventar la URL—. Cambiar un filtro o la búsqueda resetea `ver`.
5. ⏳ Cotización + WhatsApp (carrito y envío listos; pulido pendiente)
6. ✅ Admin con Auth (allowlist `ADMIN_EMAILS`, altas con `pnpm admin:crear`):
   lista de productos en `/admin`, editor
   completo de telas/variantes/fotos en `/admin/tela/[id]`, inventario con
   kardex en `/admin/inventario` (tabla `movimiento_inventario`, sección 10 del
   SQL). En `/admin` hay UNA card POR PRODUCTO, no por variante: se agrupa con
   `agruparPorModelo` —el mismo agrupador del grid público— porque un modelo de
   8 colores llenaba ocho tarjetas con el mismo nombre. Cada card muestra
   categoría y CUÁNTAS FOTOS tiene el producto entero (esto último NO sale de la
   vista: colapsa las N fotos en `foto_principal`, así que se cuenta con una
   lectura aparte a `foto`). La card ENTERA abre el editor —stretched link— y
   cada swatch abre ESE color (`#variante-<id>`), elevado en `z-10` para que
   tocar un color en la tablet no dispare el enlace de la card. Se pinta un
   swatch por VARIANTE y no por color único (al revés que `ProductCard`): aquí
   el punto es un destino, y deduplicar dejaría sin enlace a dos SKUs del mismo
   color y sin punto a las variantes sin color. Precio y stock ya NO se capturan
   en la lista —con ocho colores por card no cabía un formulario por color—:
   se editan en el editor, a un toque del swatch.
   La BÚSQUEDA de `/admin` es por PRODUCTO, en dos lecturas (qué telas casan →
   sus filas completas), igual que `getCatalogo` en el público: filtrar filas
   mostraría 1 de 8 swatches y contaría solo las fotos del color que casó.
   El `in(tela_id, …)` viaja en la URL, así que va topado a 48 productos.
   Las dos pantallas que suben fotos (`/admin/tela/[id]` y `/admin/merceria/nueva`)
   usan el curador de encuadre; ver "Storage e imágenes".
   **Reclasificar fotos** (`components/admin/GaleriaFotos.tsx`): el editor
   muestra las fotos de TODOS los colores juntas y deja arrastrarlas de uno a
   otro, a un color nuevo o a otro producto (`MoverFotoModal`, con buscador y
   alta de producto). Existe porque la tienda capturó decenas de variantes con
   varios colores amontonados como fotos extra de una sola (Gema: 18); antes
   corregirlo era borrar y volver a subir, tirando el encuadre ya curado.
   Aquí solo cambia `foto.variante_id`: el objeto del bucket, sus derivados y su
   recorte no se tocan, y la vista recalcula `foto_principal` sola. El arrastre
   es DnD nativo (mismo patrón que `OrdenColores`, sin librerías) y es un
   ATAJO: cada foto trae un botón "Mover…" que abre los mismos destinos, que es
   como se usa en tablet y con teclado.
   **Dos altas, porque la captura es al revés:** `/admin/tela/nueva` crea el
   modelo vacío y los colores se agregan en el editor; `/admin/merceria/nueva`
   captura el avío completo de una sentada (código, categoría, unidad de venta,
   precio, stock y fotos) porque una bolsita es un solo producto. Ahí el CÓDIGO
   manda: su prefijo propone categoría y unidad con `categoriaDeCodigo` —las
   mismas reglas de `pnpm clasificar`— y deja de opinar en cuanto la tienda
   elige categoría a mano.
7. ⏳ Pulido visual, rendimiento, tests (README listo)
