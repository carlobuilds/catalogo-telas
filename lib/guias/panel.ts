import type { Guia } from "./tipos";

export const guiaPanel: Guia = {
  slug: "panel",
  titulo: "Guía del panel de la tienda",
  paraQuien: "Para Cynthia y quien administre el catálogo",
  resumen:
    "Dar de alta productos, cambiar precios y fotos, y llevar las existencias.",
  direccion: "catalogo-telas.vercel.app/admin",
  bloques: [
    {
      titulo: "Entrar y salir",
      pasos: [
        "Escribe la dirección de arriba en el navegador. El catálogo público no tiene un enlace al panel.",
        "Captura tu [[Correo]] y tu [[Contraseña]], y toca [[Entrar]].",
        "Al terminar en una computadora compartida, toca [[Salir]].",
      ],
    },
    {
      titulo: "El menú",
      intro:
        "En computadora está a la izquierda. En tablet y celular está arriba, y se desliza de lado.",
      notas: [
        "[[Artículos]]: todos los productos. Desde aquí se busca y se edita.",
        "[[Nueva mercería]]: alta completa de un avío, de una sentada.",
        "[[Nueva tela]]: crea la tela; sus colores se agregan después.",
        "[[Entradas y salidas]]: lo que llega y lo que sale.",
        "[[Revisión]]: la pantalla de corrección rápida desde el celular.",
        "[[Ver catálogo]]: abre la tienda como la ve una clienta.",
      ],
      capturas: [
        {
          archivo: "admin-articulos.webp",
          alt: "Pantalla Artículos del panel, con el menú a la izquierda y el buscador arriba",
          pie: "Artículos: una tarjeta por producto.",
        },
      ],
    },
    {
      titulo: "Buscar y editar un producto",
      pasos: [
        "En [[Artículos]], escribe el nombre, el color o el código en el buscador.",
        "Toca la tarjeta para abrir el producto. Si tocas el círculo de un color, abre directo ese color.",
        "Cambia lo que necesites. Los datos generales se guardan con [[Guardar datos del producto]], y cada color con su propio botón, [[Guardar este color]].",
      ],
      notas: [
        "Lo que guardas se publica al momento en el catálogo.",
        "[[SKU]] es el código de la etiqueta. Si un producto no lo tiene, déjalo vacío: no lo inventes.",
        "Con el precio vacío, el catálogo dice que es a consultar. No es lo mismo que poner 0.",
        "[[Eliminar variante]] borra ese color y sus fotos, y no se puede deshacer.",
        "[[Para corregir]] deja solo los productos que tienen algo que acomodar. Desaparecen solos en cuanto se corrigen.",
      ],
    },
    {
      titulo: "Acomodar fotos repetidas o de otro tamaño",
      pasos: [
        "En [[Artículos]], toca [[Para corregir]]: quedan solo los productos con algo pendiente.",
        "Abre el producto. El recuadro [[Para corregir en este producto]] dice qué tiene cada color y la nota de revisión, si la hay.",
        "Si una foto está repetida, tócale [[Borrar]].",
        "Si es el mismo artículo en otro tamaño, tócale [[Mover…]], busca el producto de esa medida y toca [[Nuevo color aquí]]. Elige su color y escribe su [[Medida]]. Si el producto no existe, créalo ahí mismo.",
        "Si un color completo, con su código y su precio, quedó en el producto equivocado, usa [[Mover a otro producto…]]. Se lleva todo y no se borra nada.",
        "Al terminar, borra la [[Nota de revisión]] de ese color y toca [[Guardar este color]].",
      ],
      notas: [
        "Otro tamaño es otro producto: en el catálogo, cada producto solo cambia de color.",
        "La pantalla no deja repetir un color dentro del mismo producto: si ya existe, la foto se suma a ese color.",
      ],
    },
    {
      titulo: "Dar de alta mercería",
      pasos: [
        "Toca [[Nueva mercería]].",
        "Captura el [[Código de la etiqueta]]. Con sus letras, la pantalla propone la categoría y la unidad; revísalas.",
        "Completa [[Nombre]], [[Categoría]], [[Unidad de venta]], [[Precio]], [[Stock]] y [[Color]].",
        "En [[Fotos]] elige las fotos y toca [[Encuadrar]] para dejarlas como quieres que se vean.",
        "Toca [[Crear producto]].",
      ],
      capturas: [
        {
          archivo: "admin-nueva-merceria.webp",
          alt: "Formulario Nueva mercería con los campos de código, nombre, categoría, unidad y precio",
        },
      ],
    },
    {
      titulo: "Dar de alta una tela",
      pasos: [
        "Toca [[Nueva tela]], captura el [[Nombre]] y la [[Categoría]], y toca [[Crear tela y agregar variantes]].",
        "En la siguiente pantalla, agrega cada color con [[Agregar color]]: una variante por color.",
        "Sube las fotos de cada color y guarda con [[Guardar este color]].",
      ],
    },
    {
      titulo: "Fotos de un producto",
      pasos: [
        "Abre el producto y busca el color. En [[Agregar fotos]] elige las fotos y toca [[Subir fotos]].",
        "La primera foto de cada color es su portada: es la que sale en el catálogo.",
        "Usa [[Mover antes]] y [[Mover después]] para cambiar el orden. Con [[Mover…]] pasas una foto a otro color o a otro producto sin volver a subirla; si va a un color nuevo, eliges su color y su medida.",
      ],
      capturas: [
        {
          archivo: "admin-editor.webp",
          alt: "Editor de un producto en la parte de sus fotos, con la portada marcada y los botones para moverlas",
        },
      ],
    },
    {
      titulo: "Entradas y salidas",
      pasos: [
        "Toca [[Entradas y salidas]] y elige la variante.",
        "Elige el [[Tipo]]: entrada, salida, merma o ajuste. Captura la [[Cantidad]] y, si quieres, una [[Nota]].",
        "Toca [[Registrar movimiento]]. La existencia del catálogo se actualiza sola.",
      ],
      notas: [
        "En un ajuste, la cantidad es el total que contaste, no la diferencia.",
        "[[Sin conteo]] quiere decir que todavía no se sabe cuánto hay. Se resuelve con un ajuste.",
      ],
      capturas: [
        {
          archivo: "admin-inventario.webp",
          alt: "Pantalla Entradas y salidas con el resumen y el formulario de movimiento",
        },
      ],
    },
    {
      titulo: "Atajos de teclado",
      intro: "Son opcionales y solo sirven en computadora. Todo se puede hacer con los botones.",
      notas: [
        "F2: nueva mercería.",
        "F3: buscar un artículo.",
        "F4: entradas y salidas.",
        "F10 o Ctrl + S: guardar, con el cursor dentro del formulario.",
        "?: ver la lista de atajos.",
        "Enter pasa al siguiente campo en las altas de mercería y en el editor. En Entradas y salidas, Enter registra el movimiento.",
      ],
    },
  ],
};
