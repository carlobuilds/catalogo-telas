-- ============================================================================
-- Migración 2026-10-31 — Un producto en varias secciones
-- Telas La Jalisciense · Catálogo digital
--
-- Cómo correrla: Supabase Studio → SQL Editor → pegar TODO este archivo → Run.
-- Es idempotente (se puede correr dos veces) y SOLO AGREGA:
--   • tabla `tela_categoria` (tela ↔ categoría extra) con su índice
--   • política de lectura pública (RLS) igual a la de tela_caso_uso
--   • columna `categorias_extra` (text[]) AL FINAL de la vista catalogo_telas
-- No hace UPDATE ni DELETE de ninguna fila.
--
-- Comprobar después:
--   select categorias_extra from catalogo_telas limit 1;   -- debe dar {}
--
-- Es la misma sección 16 de catalogo_telas_supabase.sql.
-- ============================================================================

-- ============================================================================
-- 16. Un producto en varias secciones ("también aparece en") — REQUIERE la 15
--
--     Un producto tiene UNA categoría principal (`tela.categoria_id`), que es
--     la que decide en qué catálogo vive (Mercería o Telas, lib/catalogos.ts)
--     y la que muestra su tarjeta. `tela_categoria` agrega categorías EXTRA
--     para que también salga en otras secciones: una aplicación de flores en
--     Pedrería y en Flores. El frontend ignora una extra del otro catálogo.
--
--     Solo AGREGA: una tabla nueva, su índice, su política de lectura y una
--     columna al final de la vista. No toca ninguna fila existente. El código
--     funciona antes y después de correrla (sin ella, cada producto queda solo
--     en su categoría principal).
-- ============================================================================
create table if not exists tela_categoria (
  tela_id      uuid not null references tela(id) on delete cascade,
  categoria_id uuid not null references categoria(id) on delete cascade,
  primary key (tela_id, categoria_id)
);

create index if not exists idx_tela_categoria_categoria on tela_categoria(categoria_id);

-- Lectura pública igual que tela_caso_uso / tela_oportunidad (sección 7);
-- escribe solo service_role, que ignora RLS.
alter table tela_categoria enable row level security;
drop policy if exists "lectura_publica" on tela_categoria;
create policy "lectura_publica" on tela_categoria
  for select to anon, authenticated using (true);

create or replace view catalogo_telas as
select
    v.id                       as variante_id,
    t.id                       as tela_id,
    t.slug                     as tela_slug,
    t.nombre                   as tela_nombre,
    t.descripcion              as descripcion,
    cat.nombre                 as categoria,
    cat.slug                   as categoria_slug,
    v.sku                      as sku,
    col.nombre                 as color_nombre,
    col.slug                   as color_slug,
    col.hex                    as color_hex,
    ac.nombre                  as acabado,
    v.precio                   as precio_metro,   -- alias deprecado (ver nota sección 13)
    v.gramaje                  as gramaje,
    v.stock                    as stock,
    v.es_bordado               as es_bordado,
    v.es_brillante             as es_brillante,
    v.es_traslucida            as es_traslucida,
    v.es_tornasol              as es_tornasol,
    (select f.ruta
      from foto f
      where f.variante_id = v.id
      order by f.orden asc, f.created_at asc
      limit 1)                 as foto_principal,
    coalesce((
      select array_agg(cu.slug order by cu.nombre)
        from tela_caso_uso tcu
        join caso_uso cu on cu.id = tcu.caso_uso_id
      where tcu.tela_id = t.id
    ), '{}')                   as casos_uso,
    coalesce((
      select array_agg(o.slug order by o.nombre)
        from tela_oportunidad tox
        join oportunidad o on o.id = tox.oportunidad_id
      where tox.tela_id = t.id
    ), '{}')                   as oportunidades,
    t.created_at               as created_at,
    t.updated_at               as updated_at,
    v.orden                    as variante_orden,
    (select f.derivados
      from foto f
      where f.variante_id = v.id
      order by f.orden asc, f.created_at asc
      limit 1)                 as foto_principal_derivados,
    v.precio                   as precio,
    v.unidad_venta             as unidad_venta,
    v.piezas_por_unidad        as piezas_por_unidad,
    v.medida                   as medida,
    v.revisado_en              as revisado_en,
    v.nota                     as nota,
    -- Sección 16: slugs de las categorías "también aparece en". Va AL FINAL
    -- porque `create or replace view` solo deja agregar columnas ahí.
    coalesce((
      select array_agg(cx.slug order by cx.nombre)
        from tela_categoria tc
        join categoria cx on cx.id = tc.categoria_id
      where tc.tela_id = t.id
    ), '{}')                   as categorias_extra
  from variante v
  join tela t       on t.id = v.tela_id
  left join categoria cat on cat.id = t.categoria_id
  left join color col     on col.id = v.color_id
  left join acabado ac    on ac.id = v.acabado_id;

notify pgrst, 'reload schema';
