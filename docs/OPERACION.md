# Operación del catálogo

Manual para operar el catálogo sin depender de una sola persona. Las secciones de
despliegue, migraciones, respaldos, accesos y rotación de llaves se completan al
cerrar la Fase 1.

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
