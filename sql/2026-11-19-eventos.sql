-- ============================================================================
-- Migración 2026-11-19 — Contador de envíos por WhatsApp
-- Telas La Jalisciense · Catálogo digital
--
-- Cómo correrla: Supabase Studio → SQL Editor → pegar TODO este archivo → Run.
-- Corre ESTE archivo, no catalogo_telas_supabase.sql completo: re-correr el
-- esquema entero ejecuta el `update variante` de la sección 11.
-- Es idempotente (se puede correr dos veces) y SOLO AGREGA:
--   • tabla `evento_catalogo` (un renglón por pedido enviado o link compartido)
--   • su índice por fecha
-- No hace UPDATE ni DELETE de ninguna fila y no toca ninguna otra tabla.
--
-- Comprobar después:
--   select count(*) from evento_catalogo;   -- debe dar 0
--
-- Es la misma sección 18 de catalogo_telas_supabase.sql.
-- ============================================================================

-- ============================================================================
-- 18. Contador de envíos — independiente de las demás secciones
--
--     Cuenta cuántas veces una clienta manda su pedido por WhatsApp o comparte
--     el catálogo, para medir con cifras reales qué hace el catálogo por la
--     tienda. NO guarda datos personales: ni teléfono, ni IP, ni el contenido
--     del carrito. Escribe solo el servidor (`app/api/evento/route.ts`, con la
--     llave service_role, que ignora RLS) y solo en producción.
--
--     El código funciona antes y después de correrla: sin la tabla, el botón de
--     WhatsApp abre igual y el contador simplemente no cuenta.
-- ============================================================================
create table if not exists evento_catalogo (
  id             bigint generated always as identity primary key,
  creado_en      timestamptz not null default now(),
  tipo           text not null
                 check (tipo in ('pedido_whatsapp', 'compartir_catalogo', 'compartir_vista')),
  -- Página desde donde se disparó (sin querystring larga): "/", "/telas", "/tela/…".
  ruta           text check (char_length(ruta) <= 300),
  -- Solo para pedido_whatsapp; los topes cortan basura de un POST falso.
  renglones      integer check (renglones between 0 and 500),
  total_estimado numeric(12, 2) check (total_estimado between 0 and 10000000),
  hay_sin_precio boolean
);

create index if not exists evento_catalogo_creado_en_idx on evento_catalogo (creado_en);

-- RLS activo y SIN políticas: el público no lee ni escribe. Solo service_role.
alter table evento_catalogo enable row level security;

notify pgrst, 'reload schema';
