import type { NextConfig } from "next";

// La URL del proyecto Supabase se usa para autorizar el dominio de Storage
// en next/image. Derivamos el hostname del .env si está disponible.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  experimental: {
    // Las fotos del admin llegan como FormData a server actions; el default
    // de 1 MB se queda corto para fotos de celular.
    serverActions: { bodySizeLimit: "10mb" },
    // Next 15 pone en 0 el staleTime del Router Cache para páginas dinámicas
    // (como "/", que depende de searchParams): cada "volver" dispara un
    // fetch nuevo y de paso enseña el esqueleto corto de loading.tsx, que
    // colapsa el alto de la página justo cuando el navegador intenta
    // restaurar el scroll. Con esto el cache del router reutiliza la página
    // ya renderizada al volver (alineado al revalidate:60 de
    // paginaCatalogoCached en lib/queries.ts) y el scroll se restaura de
    // verdad.
    staleTimes: { dynamic: 120 },
  },
  webpack(config) {
    // components/ui/iconos/ (generado por `pnpm iconos`) es un barrel que SOLO
    // re-exporta. Marcarlo sin efectos deja que webpack lo atraviese y mande a
    // cada página nada más los iconos que importa. Su propio análisis no llega
    // a esa conclusión: cada icono importa react, que es CommonJS y por lo
    // tanto "puede tener efectos", y entonces la portada cargaba los 40 iconos
    // de todo el sitio (los del curador de fotos de /admin incluidos).
    config.module.rules.push({ test: /[\\/]components[\\/]ui[\\/]iconos[\\/]/, sideEffects: false });
    return config;
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
