/**
 * Una guía de uso es DATOS, no JSX: así se renderiza igual en pantalla y en papel,
 * y una prueba puede leerla.
 *
 * `[[Guardar cambios]]` marca una etiqueta que la persona ve en pantalla: sale en
 * negritas y `guias.test.ts` exige que exista en el código. Un manual impreso
 * envejece en silencio; así, cambiar un botón sin actualizar la guía rompe las
 * pruebas.
 */
export type Captura = { archivo: string; alt: string; pie?: string; angosta?: boolean };

export type Bloque = {
  titulo: string;
  intro?: string;
  pasos?: string[];
  notas?: string[];
  capturas?: Captura[];
};

export type Guia = {
  slug: string;
  titulo: string;
  paraQuien: string;
  resumen: string;
  direccion?: string;
  bloques: Bloque[];
};
