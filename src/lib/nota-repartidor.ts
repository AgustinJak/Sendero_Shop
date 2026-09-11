/**
 * Límites de la nota para el repartidor.
 *
 * Viven en su propio archivo, y no en `lib/etiqueta-zpl.ts` donde se usan para
 * dibujar, porque los formularios que aplican el límite son componentes de
 * cliente: importarlos desde el generador de etiquetas arrastraría `pdf-lib`
 * al bundle del navegador por una constante numérica.
 *
 * `^FB` corta el texto que no entra **sin avisar**: si alguien escribe de más,
 * la etiqueta sale con la nota truncada a la mitad de una palabra y nadie se
 * entera hasta que el repartidor la lee. Por eso el límite se valida en el
 * formulario, en la API y en la base, y no se confía en el recorte de la
 * impresora.
 *
 * 140 sale de la medida real del bloque: 4 líneas de ~35 caracteres a cuerpo
 * 4,5 mm sobre los 87 mm de ancho útil.
 */
export const NOTA_LINEAS = 4;
export const NOTA_MAX_CARACTERES = 140;

/**
 * Largo máximo de "entre calles".
 *
 * No tiene constraint en la base: se recorta para que entre en la línea de
 * dirección de la etiqueta, que son 3 líneas compartidas con calle y piso.
 */
export const ENTRE_CALLES_MAX_CARACTERES = 120;
