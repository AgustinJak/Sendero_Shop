import type { Pedido } from "@/types";
import { remitenteDesdeEnv } from "@/lib/etiqueta-envio";
import { NOTA_LINEAS } from "@/lib/nota-repartidor";

/**
 * Etiqueta de envío en ZPL, para la impresora térmica.
 *
 * El shop **genera** el ZPL; no imprime. De imprimir se encarga Bodega, que
 * levanta el archivo solo desde Descargas si empieza con `^XA`. No hay API que
 * llamar: alcanza con que el navegador lo baje.
 *
 * La geometría está medida contra el hardware real (HPRT HD700 a 203 dpi, o
 * sea 8 puntos por mm), no sacada de un catálogo. Ver la nota
 * "SHOP - Etiquetas ZPL para la térmica" en el vault.
 *
 * Se diseña para rollo de 10 × 15 cm porque entra en los dos rollos que se
 * usan; una etiqueta de 20 cm no entraría en uno de 15.
 */

const DPI = 203;
const PUNTOS_POR_MM = DPI / 25.4; // 8 puntos por mm

/** Milímetros a puntos ZPL. */
const mm = (v: number): number => Math.round(v * PUNTOS_POR_MM);

/**
 * Ancho del rollo en puntos, declarado exacto.
 *
 * `mm(100)` daría 799 porque 100 mm son 799.2 puntos y redondea a la baja. La
 * diferencia es un punto (0,125 mm) y no cambia nada en la práctica, pero el
 * papel mide 800 y `^PW` es lo que define qué se recorta: conviene que sea el
 * ancho real y no uno arbitrariamente más chico.
 */
const ANCHO_ROLLO = 800;

/**
 * Cuánto se baja el diseño dentro del rollo, en milímetros.
 *
 * En un rollo de 10 × 20 el troquel de arriba ocupa la parte superior, y una
 * etiqueta de 15 cm dibujada desde el borde cae justo ahí. Bajándola queda en
 * la mitad útil y el troquel sale en blanco.
 *
 * **No se implementa con `^LH`.** Bodega reescribe los `^LH` del archivo con
 * su ajuste de subir/bajar — existe para las etiquetas de Mercado Libre — y
 * el corrimiento se topea en el `^LH` más chico. Si acá se declarara
 * `^LH0,400`, un usuario con `-100` configurado vería la etiqueta desplazada.
 * Manteniendo `^LH0,0` y sumando el desplazamiento a cada `^FO`, el diseño
 * queda donde se lo puso pase lo que pase del otro lado.
 *
 * En 0 (rollo de 10 × 15) la etiqueta arranca arriba de todo, como antes.
 */
const DESPLAZAMIENTO_MM_DEFAULT = 50;

/** Alto del rollo en puntos, para chequear que el diseño entre. */
export const ALTO_ROLLO_15 = 1200;
export const ALTO_ROLLO_20 = 1600;

/**
 * Los límites viven en `lib/nota-repartidor.ts`, no acá: los aplican
 * formularios de cliente y este archivo arrastra `pdf-lib`.
 */
export { NOTA_LINEAS, NOTA_MAX_CARACTERES } from "@/lib/nota-repartidor";

/**
 * Limpia un campo antes de componerlo con otros.
 *
 * Los datos reales vienen con espacios de sobra — en la base hay direcciones
 * como `"Comodoro Rivadavia "` y localidades como `"Nuñez "`. Sin esto, al
 * concatenar salían `"Comodoro Rivadavia  1685"` con doble espacio y
 * `"Nuñez , CABA"` con el espacio antes de la coma.
 */
const limpiar = (s: unknown): string => String(s ?? "").replace(/\s+/g, " ").trim();

/**
 * `^` y `~` son los caracteres de control de ZPL: si aparecen en un nombre o
 * una dirección, parten el comando y la etiqueta sale rota o no sale. Se
 * reemplazan por espacio antes de entrar en cualquier `^FD`.
 *
 * Colapsa espacios al final, así que también arregla lo que haya quedado de
 * concatenar campos con sobrantes.
 */
function esc(s: unknown): string {
  return limpiar(String(s ?? "").replace(/[\^~]/g, " "));
}

/** Dirección del destinatario en una línea, con piso y depto si los hay. */
function lineaDireccion(pedido: Pedido): string {
  const d = pedido.direccion_envio;
  if (!d) return "Retiro en persona";

  // Cada parte se limpia ANTES de componer: si no, un campo con espacio al
  // final se lleva puesto el separador del siguiente.
  const piso = [
    limpiar(d.piso) && `Piso ${limpiar(d.piso)}`,
    limpiar(d.departamento) && `Depto ${limpiar(d.departamento)}`,
  ]
    .filter(Boolean)
    .join(" ");

  const calle = [limpiar(d.calle), limpiar(d.numero)].filter(Boolean).join(" ");
  const entre = limpiar(pedido.entre_calles);

  return [calle, piso, entre && `(entre ${entre})`].filter(Boolean).join(" - ");
}

/**
 * Una etiqueta: un `^XA … ^XZ` y nada más.
 *
 * Reglas que vienen de haber impreso de verdad:
 * - `^PW` **recorta** lo que se pase, no lo escala. Se declara 800 (10 cm) y
 *   se dibuja dentro, con margen.
 * - **No se emiten `^MN` ni `^LL`**. `^LL` es para papel continuo y sobre
 *   etiquetas troqueladas pelea con el sensor de gap; `^MN` depende del rollo
 *   que tenga cargado el usuario. Bodega inyecta el que corresponda.
 * - `^LH0,0` deja la etiqueta inmune al ajuste de corrimiento del usuario,
 *   que existe para las etiquetas de Mercado Libre y se topea en el `^LH` más
 *   chico del archivo.
 * - `^CI28` + archivo en UTF-8 para que los acentos sobrevivan.
 */
export function etiquetaZPL(
  pedido: Pedido,
  opciones: { desplazarMm?: number } = {}
): string {
  const rem = remitenteDesdeEnv();
  const d = pedido.direccion_envio;

  const W = ANCHO_ROLLO;
  const H = mm(150);
  const M = mm(4);
  const ancho = W - M * 2;
  const x = M + mm(3);
  const interior = ancho - mm(6);

  // Desplazamiento vertical, sumado a cada coordenada Y. Ver
  // DESPLAZAMIENTO_MM_DEFAULT: a propósito no se usa ^LH.
  const dy = mm(opciones.desplazarMm ?? DESPLAZAMIENTO_MM_DEFAULT);
  /** Y absoluta: milímetros del diseño + el desplazamiento del rollo. */
  const y = (v: number): number => mm(v) + dy;

  const L: string[] = ["^XA", "^CI28", `^PW${W}`, "^LH0,0"];

  // Marco
  L.push(`^FO${M},${y(4)}^GB${ancho},${H - M * 2},2^FS`);

  // Remitente. Sin calle ni altura a propósito: la etiqueta viaja pegada a un
  // paquete que pasa por manos ajenas. Mismo criterio que la versión en PDF.
  L.push(`^FO${x},${y(7)}^A0N,${mm(6)},${mm(6)}^FD${esc(rem.nombre)}^FS`);
  const remLinea = [rem.localidad, rem.telefono && `Tel ${rem.telefono}`]
    .filter(Boolean)
    .join(" - ");
  if (remLinea) {
    L.push(`^FO${x},${y(15)}^A0N,${mm(3.2)},${mm(3.2)}^FB${interior},2,0,L^FD${esc(remLinea)}^FS`);
  }
  L.push(`^FO${M},${y(24)}^GB${ancho},2,2^FS`);

  // Destinatario
  L.push(`^FO${x},${y(27)}^A0N,${mm(3.5)},${mm(3.5)}^FDDESTINATARIO^FS`);
  L.push(
    `^FO${x},${y(33)}^A0N,${mm(6)},${mm(6)}^FB${interior},2,0,L^FD${esc(pedido.nombre_cliente)}^FS`
  );
  L.push(
    `^FO${x},${y(47)}^A0N,${mm(4)},${mm(4)}^FB${interior},3,0,L^FD${esc(lineaDireccion(pedido))}^FS`
  );

  if (d) {
    L.push(`^FO${x},${y(63)}^A0N,${mm(5)},${mm(5)}^FDCP ${esc(d.codigo_postal)}^FS`);
    const loc = [limpiar(d.localidad), limpiar(d.provincia)].filter(Boolean).join(", ");
    L.push(
      `^FO${x + mm(25)},${y(63)}^A0N,${mm(5)},${mm(5)}^FB${interior - mm(25)},2,0,L^FD${esc(loc)}^FS`
    );
  }
  L.push(`^FO${M},${y(78)}^GB${ancho},2,2^FS`);

  // Teléfono destacado: es el dato que usa el mensajero.
  L.push(`^FO${x},${y(81)}^A0N,${mm(3.5)},${mm(3.5)}^FDTELEFONO^FS`);
  L.push(
    `^FO${x},${y(86)}^A0N,${mm(6)},${mm(6)}^FD${esc(pedido.telefono) || "SIN TELEFONO"}^FS`
  );

  // Pedido y método, en una línea.
  //
  // Sin código de barras ni QR: no se escanean, y el número de pedido ya está
  // legible acá. Sacarlos libera unos 4 cm, que es lo que ocupa la nota.
  //
  // Tampoco va el saldo a cobrar. Además de que el cobro es previo, es una
  // combinación imposible: la seña solo existe con pago en efectivo, y el
  // efectivo solo se ofrece con retiro en persona — un pedido que sale con
  // repartidor nunca tiene saldo pendiente.
  const fecha = new Date(pedido.created_at).toLocaleDateString("es-AR");
  const metodo = pedido.metodo_envio === "syb" ? "Moto mensajería" : "Envío";
  L.push(
    `^FO${x},${y(97)}^A0N,${mm(4.5)},${mm(4.5)}^FDPedido ${esc(pedido.numero_pedido)}^FS`
  );
  L.push(
    `^FO${x},${y(104)}^A0N,${mm(3.5)},${mm(3.5)}^FD${esc(metodo)} - ${esc(fecha)}^FS`
  );

  // Nota para el repartidor. Ocupa el espacio que dejaron las barras y el QR.
  //
  // Arranca en 117 y va a cuerpo 4 mm: con 4,5 mm y arrancando en 123, una
  // nota de 4 líneas terminaba a 1 mm del marco. El interlineado real de `^FB`
  // no se puede calcular exacto desde acá, así que conviene el margen.
  const nota = limpiar(pedido.nota_repartidor);
  if (nota) {
    L.push(`^FO${M},${y(108)}^GB${ancho},2,2^FS`);
    L.push(`^FO${x},${y(112)}^A0N,${mm(3.5)},${mm(3.5)}^FDNOTA PARA EL REPARTIDOR^FS`);
    L.push(
      `^FO${x},${y(117)}^A0N,${mm(4)},${mm(4)}^FB${interior},${NOTA_LINEAS},0,L^FD${esc(nota)}^FS`
    );
  }

  L.push("^XZ", "");
  return L.join("\n");
}

/**
 * Varias etiquetas en un archivo: se concatenan.
 *
 * Sin bloques de control `^XA^MCY^XZ` entre medio — Bodega los descarta del
 * conteo igual, pero no hacen falta y solo agregan ruido.
 */
export function etiquetasZPL(
  pedidos: Pedido[],
  opciones: { desplazarMm?: number } = {}
): string {
  // La arrow es necesaria: `map(etiquetaZPL)` le pasaría el índice como
  // segundo argumento y cada etiqueta saldría desplazada un milímetro más que
  // la anterior.
  return pedidos.map((p) => etiquetaZPL(p, opciones)).join("");
}

/** Nombre que se ve en la lista de Bodega y queda en su historial. */
export function nombreArchivoZPL(pedido: Pedido): string {
  return `envio-${pedido.numero_pedido}.zpl`;
}
