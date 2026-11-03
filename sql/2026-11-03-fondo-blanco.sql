-- ============================================================================
-- Migración 2026-11-03 — Fondo blanco activable en el catálogo
-- Telas La Jalisciense · Catálogo digital
--
-- Cómo correrla: Supabase Studio → SQL Editor → pegar TODO este archivo → Run.
-- Corre ESTE archivo, no catalogo_telas_supabase.sql completo: re-correr el
-- esquema entero ejecuta el `update variante` de la sección 11.
-- Es idempotente (se puede correr dos veces) y SOLO AGREGA:
--   • tabla `foto_mascara` (una máscara por foto, encendida o apagada)
--   • tabla `ajuste_tienda` (interruptores generales de la tienda)
--   • políticas de lectura pública (RLS) de las dos
-- No hace UPDATE ni DELETE de ninguna fila, y no toca la vista catalogo_telas.
--
-- Comprobar después:
--   select count(*) from foto_mascara;    -- debe dar 0
--   select count(*) from ajuste_tienda;   -- debe dar 0 (sin fila = apagado)
--
-- Es la misma sección 17 de catalogo_telas_supabase.sql.
-- ============================================================================

-- ============================================================================
-- 17. Fondo blanco activable — REQUIERE la 12 (foto.derivados)
--
--     La foto NO se altera: la máscara es un velo blanco con la silueta del
--     producto calada, guardado aparte en `mascaras/` dentro del bucket.
--     Apagarla es no pintar el velo. Por eso vive en tablas propias y no en
--     `foto.derivados`, que `procesarFoto` reemplaza completo en cada pasada.
--
--     Solo AGREGA tablas y políticas. El código funciona antes y después de
--     correrla: sin ellas, el catálogo muestra la foto original.
-- ============================================================================
create table if not exists foto_mascara (
  foto_id            uuid primary key references foto(id) on delete cascade,
  ruta_sm            text not null,            -- ruta DENTRO del bucket `telas`
  ruta_md            text,                     -- null si el tamaño sm basta
  ancho              integer not null,
  alto               integer not null,
  -- Apagada por defecto: una foto nueva no sale con fondo blanco hasta que la
  -- tienda la revise. El backfill enciende las ya subidas con --activar-hasta.
  activa             boolean not null default false,
  nivel_fondo        real not null,            -- brillo hasta donde llega el fondo (0–255)
  pct_fondo          real not null,            -- % de la foto que se volvió fondo
  pct_transicion     real not null,            -- % en transición: alto = revisar primero
  -- Copia exacta de foto.derivados->>'generado_en' al generar. Si la foto se
  -- reprocesa deja de coincidir y se muestra la original: una máscara vieja
  -- sobre un encuadre nuevo taparía el producto.
  fuente_generado_en text not null,
  generado_en        timestamptz not null default now(),
  -- Cuándo la tienda la prendió o apagó a mano. Apagada y sin esto = foto nueva.
  revisada_en        timestamptz
);

-- Sin fila = apagado. Por eso esta migración no inserta nada: el interruptor
-- general nace apagado y la primera escritura es la de la tienda desde /admin.
create table if not exists ajuste_tienda (
  clave          text primary key,
  valor          jsonb not null,
  actualizado_en timestamptz not null default now()
);

-- Lectura pública acotada: el catálogo solo ve máscaras encendidas y solo el
-- ajuste que necesita. Escribe solo service_role, que ignora RLS.
alter table foto_mascara enable row level security;
drop policy if exists "lectura_publica" on foto_mascara;
create policy "lectura_publica" on foto_mascara
  for select to anon, authenticated using (activa);

alter table ajuste_tienda enable row level security;
drop policy if exists "lectura_publica" on ajuste_tienda;
create policy "lectura_publica" on ajuste_tienda
  for select to anon, authenticated using (clave = 'fondo_blanco');

notify pgrst, 'reload schema';
