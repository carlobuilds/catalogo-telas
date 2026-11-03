import type { Guia } from "./tipos";

export const guiaRevision: Guia = {
  slug: "revision",
  titulo: "Guía de revisión del catálogo",
  paraQuien: "Para quien corrige datos desde el celular",
  resumen: "Revisar producto por producto que el precio, el código y el color sean los correctos.",
  direccion: "catalogo-telas.vercel.app/revision",
  bloques: [
    {
      titulo: "Entrar",
      pasos: [
        "Escribe la dirección de arriba en el celular. Conviene guardarla en favoritos.",
        "Captura el correo y la contraseña que te dio la tienda.",
      ],
      notas: ["Si dice [[Cuenta sin permisos]], pide a la tienda que autorice tu correo."],
    },
    {
      titulo: "Elegir qué revisar",
      pasos: [
        "Arriba está el avance de lo que ya se revisó.",
        "Usa [[Sin revisar]] para ver solo lo pendiente, o [[Todos]] para ver el catálogo completo.",
        "Para buscar algo en particular, escribe la tela, el color o el código y toca [[Buscar]].",
        "Toca un producto para abrirlo.",
      ],
      capturas: [
        {
          archivo: "revision-cola.webp",
          alt: "Cola de revisión en el celular con la barra de avance y el buscador",
          angosta: true,
        },
      ],
    },
    {
      titulo: "Corregir un color",
      intro: "Cada color del producto tiene su propia tarjeta.",
      pasos: [
        "Compara con el producto real. Con [[Ver foto en grande]] ves la foto completa.",
        "Corrige [[SKU]], [[Precio (MXN)]], [[Se vende por]], [[Medida]] y [[Color]].",
        "Si tienes una duda, escríbela en [[Notas (opcional)]] para que la vea la tienda.",
        "Toca [[Guardar cambios]].",
        "Cuando esté bien, prende [[Revisado]] para que salga de la lista de pendientes.",
        "Toca [[Volver a la cola]] para seguir con otro producto.",
      ],
      capturas: [
        {
          archivo: "revision-producto.webp",
          alt: "Tarjeta de revisión de un color con sus campos en el celular",
          angosta: true,
        },
      ],
    },
    {
      titulo: "Tres reglas",
      notas: [
        "Guardar publica al momento: lo que captures lo ven las clientas. [[Revisado]] no publica nada, solo lleva la cuenta.",
        "Nunca inventes un código. Si el producto no tiene SKU, déjalo vacío.",
        "Si no sabes el precio, déjalo vacío: el catálogo dirá que es a consultar. No pongas 0.",
      ],
    },
    {
      titulo: "Si no encuentras el color",
      pasos: [
        "Revisa bien la lista. Un color repetido con otro nombre confunde a las clientas.",
        "Si de verdad no está, toca [[Toca aquí si no encuentras el color del producto]] y agrégalo.",
      ],
    },
  ],
};
