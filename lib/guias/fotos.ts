import type { Guia } from "./tipos";

export const guiaFotos: Guia = {
  slug: "fotos",
  titulo: "Cómo tomar las fotos",
  paraQuien: "Para quien fotografía la mercancía",
  resumen: "Fotos que muestran bien el producto y que funcionan con el fondo blanco del catálogo.",
  bloques: [
    {
      titulo: "La foto que mejor funciona",
      notas: [
        "Fondo negro liso y limpio, sin polvo ni arrugas.",
        "El producto completo y separado de las orillas. Una tira larga sí puede cruzar la foto.",
        "Luz pareja que deje distinguir el color, sin zonas muy oscuras.",
        "La foto cuadrada o con espacio suficiente para encuadrarla en cuadrado.",
      ],
      capturas: [
        {
          archivo: "fotos-buena.webp",
          alt: "A la izquierda, una aplicación de pedrería sobre fondo negro; a la derecha, la misma foto con fondo blanco",
          pie: "Foto sobre negro limpio y cómo se ve con fondo blanco.",
        },
      ],
    },
    {
      titulo: "Casos especiales",
      notas: [
        "Producto negro o muy oscuro: fotografíalo sobre fondo claro. Sobre negro se pierde.",
        "Telas oscuras y mates, como una flor vino: necesitan más luz. Si sus sombras se confunden con el fondo, la foto no lleva fondo blanco y se ve como la tomaste.",
        "Fondo claro: la foto se ve tal cual, sin fondo blanco, y también es válida.",
        "Cuencos de vidrio y bolsitas: el interior se queda oscuro porque el fondo negro se ve a través de ellos.",
        "Tul y encajes transparentes: se ve el producto, pero lo oscuro que se transparenta se queda.",
      ],
      capturas: [
        {
          archivo: "fotos-oscura.webp",
          alt: "Flor de tela oscura sobre fondo negro, difícil de distinguir",
          pie: "Producto oscuro sobre negro: le falta luz y no lleva fondo blanco.",
          angosta: true,
        },
      ],
    },
    {
      titulo: "Al subir la foto",
      pasos: [
        "En el panel, abre el producto y el color. En [[Agregar fotos]] elige la foto.",
        "Toca [[Encuadrar]] y deja el producto bien centrado. Lo que veas en [[Así se verá]] es lo que saldrá en el catálogo.",
        "Toca [[Subir fotos]].",
        "La primera foto de cada color es la portada: pon primero la que mejor muestre el producto.",
      ],
      notas: ["La foto se publica con su fondo original."],
    },
  ],
};
