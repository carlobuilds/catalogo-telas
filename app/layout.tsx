import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { CartDrawer } from "@/components/CartDrawer";
import { TutorialModal } from "@/components/tutorial/TutorialModal";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import "./globals.css";

// Tipografía del design system de Stitch "Artisanal Modernity": Hanken Grotesk
// en TODA la jerarquía (display, cuerpo y etiquetas), con los mismos pesos que
// carga Stitch (400/600/700). Los tokens --font-display/--font-body/--font-serif
// de globals.css se conservan y todos apuntan a esta familia.
const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
  weight: ["400", "600", "700"],
});

// Base absoluta de los metadatos. `app/opengraph-image.png` se anuncia como
// URL COMPLETA: los scrapers de WhatsApp y Facebook no resuelven rutas
// relativas, así que sin esto la miniatura del enlace no carga.
// En producción hay que definir NEXT_PUBLIC_SITE_URL con el dominio real.
// Mientras no esté, en Vercel se usa su variable de sistema con el dominio de
// producción (`VERCEL_PROJECT_PRODUCTION_URL`, sin protocolo): sin ella, la
// og:url de cada link compartido decía "localhost:3000" y Facebook/WhatsApp
// la toman como la dirección canónica. En local cae al dev server. Si la
// variable trae basura, `new URL` truena en el build a propósito: es
// preferible a publicar enlaces sin miniatura.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Telas La Jalisciense — Catálogo Textil",
  description:
    "Catálogo de telas finas, encajes y mercería de alta calidad en Fresnillo.",
  openGraph: {
    title: "Telas La Jalisciense — Catálogo",
    description:
      "Explora las telas, elige tus metros y manda tu pedido por WhatsApp. Chifón, tul, seda, lino y encajes en Fresnillo.",
    siteName: "Telas La Jalisciense",
    url: siteUrl,
    locale: "es_MX",
    type: "website",
  },
};

// `viewportFit: "cover"` es lo que hace que `env(safe-area-inset-*)` valga
// algo en iPhone: sin él todas esas variables dan 0 y las barras fijas de abajo
// (MobileBottomNav, la barra de AddToCart, el pie de la cesta) se encimaban con
// el indicador de inicio. Ancho y escala se repiten explícitos porque son el
// default de Next; NO se fija `maximumScale`: hacer zoom es de accesibilidad.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={hankenGrotesk.variable}>
      {/* pb: la MobileBottomNav mide 4rem MÁS su safe-area (`pb-safe`), así
          que el último renglón de cualquier página quedaba debajo de ella en
          un iPhone con indicador de inicio. Los laterales cubren las orejas
          del notch en horizontal, que `viewportFit: "cover"` ahora expone. */}
      <body className="flex min-h-screen flex-col bg-sand-bg text-ink-text font-sans antialiased selection:bg-amber/20 selection:text-ink-display pb-[calc(4rem+env(safe-area-inset-bottom,0px))] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] sm:pb-0">
        {/* Primer elemento enfocable de la página: con teclado o lector de
            pantalla se salta el header sin recorrerlo. Vive fuera de pantalla
            y baja al recibir foco; no usa `sr-only`/`not-sr-only` porque el
            `padding: 0` de este último pelea con el del propio link. */}
        <a
          href="#contenido"
          className="fixed left-3 top-0 z-[70] inline-flex min-h-[44px] -translate-y-full items-center rounded bg-heritage-navy px-4 text-base font-bold text-white transition-transform focus:translate-y-[calc(0.75rem+env(safe-area-inset-top,0px))] focus:shadow-lg"
        >
          Saltar al contenido
        </a>
        <SiteHeader />
        {/* Destino del salto. `tabIndex={-1}` para que reciba el foco sin
            entrar al orden de tabulación; se le quita el contorno en línea
            porque la regla global de `:focus-visible` (fuera de capa) le gana
            a cualquier utilidad, y un recuadro alrededor de la página entera
            no orienta a nadie: el foco sigue con el siguiente Tab. */}
        <div id="contenido" tabIndex={-1} className="flex-1" style={{ outline: "none" }}>
          {children}
        </div>
        <MobileBottomNav />
        <CartDrawer />
        <TutorialModal />
      </body>
    </html>
  );
}

