import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { ChromeTienda } from "@/components/ChromeTienda";
import { SITE_URL } from "@/lib/sitio";
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
// Los textos solo nombran lo que de verdad está en el catálogo: antes
// prometían "seda y lino", que la tienda no vende en línea.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Telas La Jalisciense — Telas y mercería en Fresnillo",
  description:
    "Catálogo de mercería y telas en Fresnillo: pedrería, encajes, flores, botones, tul y más. Arma tu pedido y mándalo por WhatsApp.",
  openGraph: {
    title: "Telas La Jalisciense — Catálogo",
    description:
      "Mercería y telas en Fresnillo: elige lo que necesitas y manda tu pedido por WhatsApp.",
    siteName: "Telas La Jalisciense",
    url: SITE_URL,
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
      {/* Los laterales cubren las orejas del notch en horizontal, que
          `viewportFit: "cover"` ahora expone. */}
      <body className="flex min-h-screen flex-col bg-sand-bg text-ink-text font-sans antialiased selection:bg-amber/20 selection:text-ink-display pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        <ChromeTienda>{children}</ChromeTienda>
      </body>
    </html>
  );
}

