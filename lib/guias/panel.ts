import type { Guia } from "./tipos";

export const guiaPanel: Guia = {
  slug: "panel",
  titulo: "Guía del panel de la tienda",
  paraQuien: "Para Cynthia y quien administre el catálogo",
  resumen:
    "Dar de alta productos, cambiar precios y fotos, llevar las existencias y decidir los fondos blancos.",
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
        "[[Fondos de foto]]: decide qué fotos salen con fondo blanco.",
        "[[Revisión]]: la pantalla de corrección rápida desde el celular.",
        "[[Guías de uso]]: estas guías, listas para imprimir.",
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
        "Usa [[Mover antes]] y [[Mover después]] para cambiar el orden. Con [[Mover…]] pasas una foto a otro color o a otro producto sin volver a subirla.",
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
      titulo: "Fondos blancos",
      intro:
        "El fondo blanco se ve en la cuadrícula del catálogo. Al abrir un producto, la foto sale original y la clienta puede elegir verla en blanco. Tu foto no cambia: encima se le pone una capa que se puede quitar.",
      pasos: [
        "Toca [[Fondos de foto]]. Cada tarjeta muestra la foto original y cómo queda con fondo blanco. Las más dudosas salen primero.",
        "Si una foto no te convence, toca [[Apagar en esta foto]]. Ese producto se sigue viendo con su foto original.",
        "Cuando estés conforme, toca [[Prender fondo blanco]] y confirma. Lo ven todas las clientas al momento.",
        "Para volver atrás, toca [[Apagar fondo blanco]]. No se pierde nada.",
      ],
      notas: [
        "Las fotos nuevas llegan apagadas. Búscalas en [[Nuevas sin revisar]] y toca [[Prender en esta foto]].",
        "Las fotos con fondo claro y los productos muy oscuros no llevan fondo blanco.",
        "La pedrería plateada se ve más oscura sobre blanco, y en el tul y las bolsitas queda oscuro lo que se ve a través.",
      ],
      capturas: [
        {
          archivo: "admin-fondos.webp",
          alt: "Pantalla Fondos de foto con el interruptor general y tarjetas de antes y después",
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
