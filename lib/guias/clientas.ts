import type { Guia } from "./tipos";

export const guiaClientas: Guia = {
  slug: "clientas",
  titulo: "Cómo pedir en nuestro catálogo",
  paraQuien: "Para las clientas de Telas La Jalisciense",
  resumen: "Mira los productos desde tu celular y manda tu pedido por WhatsApp.",
  direccion: "catalogo-telas.vercel.app",
  bloques: [
    {
      titulo: "1. Busca lo que necesitas",
      pasos: [
        "Abre la dirección de arriba en tu celular.",
        "Elige [[Mercería]] o [[Telas]]. En mercería, toca una sección como [[Pedrería]] o [[Flores]].",
        "También puedes escribir en el buscador el nombre, el color o el código.",
      ],
      capturas: [
        {
          archivo: "clientas-catalogo.webp",
          alt: "Catálogo en el celular con las secciones y las primeras tarjetas de producto",
          angosta: true,
        },
      ],
    },
    {
      titulo: "2. Velo de cerca",
      pasos: [
        "Toca el producto para abrirlo.",
        "Toca [[Acercar para ver mejor]] para ver el detalle. Pellizca la foto o usa los botones de más y menos, y ciérrala con la X.",
        "Si aparece [[Ver en fondo blanco]], tócalo para verlo sobre blanco. Es solo otra forma de verlo: el producto es el mismo.",
        "Si hay varios colores, elige el tuyo en [[Tonos disponibles]].",
      ],
      capturas: [
        {
          archivo: "clientas-ficha.webp",
          alt: "Ficha de un producto en el celular con la foto y los botones para acercar y ver en fondo blanco",
          angosta: true,
        },
      ],
    },
    {
      titulo: "3. Agrégalo a tu cesta",
      pasos: [
        "Indica cuánto quieres con los botones de más y menos. Algunos productos se venden por pieza, otros por par, por bolsa o por metro.",
        "Toca [[Añadir a la Cesta]]. Puedes seguir viendo y agregar más.",
      ],
      notas: [
        "Si un producto dice que el precio es a consultar, la tienda te lo confirma por WhatsApp.",
      ],
    },
    {
      titulo: "4. Manda tu pedido",
      pasos: [
        "Abre [[Tu Cesta]] y revisa lo que elegiste.",
        "Toca [[Enviar pedido por WhatsApp]]. Se abre un mensaje ya escrito con tu lista: solo envíalo.",
        "La tienda te responde por WhatsApp para confirmar y acordar los detalles.",
      ],
      notas: ["Mandar el mensaje no te compromete a comprar."],
      capturas: [
        {
          archivo: "clientas-cesta.webp",
          alt: "Cesta abierta en el celular con un producto y el botón para enviar el pedido por WhatsApp",
          angosta: true,
        },
      ],
    },
  ],
};
