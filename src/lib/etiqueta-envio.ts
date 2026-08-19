import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { Pedido } from "@/types";

/**
 * Etiqueta de envío para mensajería local (CABA y GBA).
 *
 * Sale en 10×15 cm, la medida estándar de etiqueta adhesiva. En una impresora
 * común se imprime centrada en la hoja y se recorta.
 *
 * Se usan las fuentes estándar de PDF (Helvetica) y no una embebida: su
 * codificación WinAnsi cubre acentos y ñ, que es todo lo que hace falta en
 * español, y evita sumar un archivo de fuente al repo.
 */

// 10×15 cm en puntos PDF (1 pt = 1/72"). 1 cm = 28.3465 pt.
const CM = 28.3465;
const ANCHO = 10 * CM;
const ALTO = 15 * CM;
const MARGEN = 0.7 * CM;

const TINTA = rgb(0.06, 0.09, 0.16);
const GRIS = rgb(0.45, 0.45, 0.5);
const LINEA = rgb(0.8, 0.8, 0.84);

/**
 * Datos del remitente. Salen del mismo lugar que los de Correo Argentino.
 *
 * A propósito NO incluye calle ni altura: la etiqueta va pegada a un paquete
 * que circula por manos ajenas, y el domicilio propio no tiene por qué viajar
 * ahí. Con el nombre, la localidad y el teléfono alcanza para que el mensajero
 * sepa de dónde sale y a quién llamar. La única dirección completa en la
 * etiqueta es la del cliente.
 */
export function remitenteDesdeEnv(): { nombre: string; telefono: string; localidad: string } {
  return {
    nombre: process.env.CORREO_REMITENTE_NOMBRE || "Sendero Shop",
    telefono:
      process.env.CORREO_REMITENTE_CELULAR || process.env.CORREO_REMITENTE_TELEFONO || "",
    localidad: process.env.CORREO_REMITENTE_LOCALIDAD || "",
  };
}

/**
 * Parte el texto en líneas que entren en `ancho`.
 *
 * Sin esto una calle larga se salía de la etiqueta: pdf-lib no recorta ni
 * ajusta, dibuja el texto hasta donde llegue.
 */
function envolver(texto: string, font: PDFFont, size: number, ancho: number): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const tentativa = actual ? `${actual} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(tentativa, size) <= ancho) {
      actual = tentativa;
    } else {
      if (actual) lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}

/**
 * Las fuentes estándar solo codifican WinAnsi. Un emoji o un carácter fuera de
 * ese rango hace fallar el `drawText` entero, así que se limpian antes: más
 * vale una etiqueta con un carácter de menos que un 500 al apretar el botón.
 */
function sanear(texto: string): string {
  return (texto || "")
    .normalize("NFC")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .trim();
}

export async function generarEtiquetaPDF(pedido: Pedido): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Etiqueta ${pedido.numero_pedido}`);
  const page = doc.addPage([ANCHO, ALTO]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const normal = await doc.embedFont(StandardFonts.Helvetica);

  const anchoUtil = ANCHO - MARGEN * 2;
  let y = ALTO - MARGEN;

  function texto(
    t: string,
    opts: { size: number; font?: PDFFont; color?: typeof TINTA; gap?: number }
  ) {
    const font = opts.font ?? normal;
    for (const linea of envolver(sanear(t), font, opts.size, anchoUtil)) {
      y -= opts.size;
      page.drawText(linea, {
        x: MARGEN,
        y,
        size: opts.size,
        font,
        color: opts.color ?? TINTA,
      });
      y -= 2;
    }
    y -= opts.gap ?? 0;
  }

  function rotulo(t: string) {
    y -= 9;
    page.drawText(sanear(t).toUpperCase(), {
      x: MARGEN,
      y,
      size: 7,
      font: bold,
      color: GRIS,
    });
    y -= 3;
  }

  function separador(grosor = 0.7) {
    y -= 6;
    page.drawLine({
      start: { x: MARGEN, y },
      end: { x: ANCHO - MARGEN, y },
      thickness: grosor,
      color: LINEA,
    });
    y -= 4;
  }

  // --- Encabezado ---
  page.drawRectangle({ x: 0, y: ALTO - MARGEN - 24, width: ANCHO, height: 34, color: TINTA });
  page.drawText("SENDERO SHOP", {
    x: MARGEN,
    y: ALTO - MARGEN - 14,
    size: 13,
    font: bold,
    color: rgb(1, 1, 1),
  });
  const nro = sanear(pedido.numero_pedido);
  page.drawText(nro, {
    x: ANCHO - MARGEN - bold.widthOfTextAtSize(nro, 11),
    y: ALTO - MARGEN - 13,
    size: 11,
    font: bold,
    color: rgb(0.83, 0.66, 0.33),
  });
  y = ALTO - MARGEN - 34;

  // --- Remitente ---
  const rem = remitenteDesdeEnv();
  rotulo("Remitente");
  texto(rem.nombre, { size: 10, font: bold });
  if (rem.localidad) texto(rem.localidad, { size: 8, color: GRIS });
  if (rem.telefono) texto(`Tel. ${rem.telefono}`, { size: 8, color: GRIS });

  separador(1.2);

  // --- Destinatario ---
  const d = pedido.direccion_envio;
  rotulo("Destinatario");
  texto(pedido.nombre_cliente, { size: 15, font: bold, gap: 2 });

  if (d) {
    // Calle + altura + piso/depto en un renglón.
    const piso = [d.piso && `Piso ${d.piso}`, d.departamento && `Depto ${d.departamento}`]
      .filter(Boolean)
      .join(" ");
    texto([`${d.calle} ${d.numero}`, piso].filter(Boolean).join(" - "), {
      size: 12,
      font: bold,
    });

    rotulo("Entre calles");
    texto(pedido.entre_calles || "—", { size: 11 });

    rotulo("Localidad");
    texto([d.localidad, d.provincia].filter(Boolean).join(", "), { size: 11 });

    rotulo("Código postal");
    texto(d.codigo_postal || "—", { size: 11, font: bold });
  } else {
    rotulo("Entrega");
    texto("Retiro en persona", { size: 12, font: bold });
  }

  // --- Teléfono, destacado: es el dato que usa el mensajero ---
  y -= 8;
  const cajaAlto = 34;
  page.drawRectangle({
    x: MARGEN,
    y: y - cajaAlto,
    width: anchoUtil,
    height: cajaAlto,
    borderColor: TINTA,
    borderWidth: 1.2,
  });
  page.drawText("TELEFONO", {
    x: MARGEN + 8,
    y: y - 13,
    size: 7,
    font: bold,
    color: GRIS,
  });
  page.drawText(sanear(pedido.telefono) || "SIN TELEFONO", {
    x: MARGEN + 8,
    y: y - 28,
    size: 14,
    font: bold,
    color: TINTA,
  });
  y -= cajaAlto;

  // --- Pie ---
  const pie = `${pedido.metodo_envio === "retiro" ? "Retiro" : "Envio"} - ${new Date().toLocaleDateString("es-AR")}`;
  page.drawText(sanear(pie), {
    x: MARGEN,
    y: MARGEN,
    size: 7,
    font: normal,
    color: GRIS,
  });

  return doc.save();
}
