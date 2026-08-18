import type { Pedido, PedidoItem } from "@/types";
import { formatPrice } from "@/lib/utils";
import { resolveTrackingUrl } from "@/lib/correo-argentino";

// ==========================================
// Shared styles
// ==========================================
const COLORS = {
  navy: "#1C2541",
  navyDeep: "#0F1729",
  lavanda: "#8B85B2",
  niebla: "#E8E6F0",
  purpura: "#6C63A0",
  ambar: "#D4A853",
};

const SITE_URL = "https://sendero3d.com";

function pedidoLink(pedidoId: string): string {
  return `${SITE_URL}/pedido/${pedidoId}`;
}

function verPedidoButton(pedidoId: string): string {
  return `
    <p style="margin:20px 0 0;text-align:center;">
      <a href="${pedidoLink(pedidoId)}"
         style="display:inline-block;padding:10px 24px;background-color:${COLORS.purpura};color:${COLORS.niebla};text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">
        Ver mi pedido
      </a>
    </p>`;
}

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:${COLORS.navyDeep};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.navyDeep};padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${COLORS.navy};border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid ${COLORS.lavanda}22;">
              <h1 style="margin:0;font-size:20px;color:${COLORS.niebla};font-family:Georgia,serif;letter-spacing:2px;">SENDERO SHOP</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid ${COLORS.lavanda}22;text-align:center;">
              <p style="margin:0;font-size:12px;color:${COLORS.lavanda};">
                Sendero Shop — Figuras y accesorios de colección
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:${COLORS.lavanda}88;">
                Villa Crespo, CABA, Argentina
              </p>
              <p style="margin:8px 0 0;font-size:10px;color:${COLORS.lavanda}66;">
                Si este email llegó a spam, marcalo como "No es spam" para recibir futuras actualizaciones.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function itemsTable(items: PedidoItem[]): string {
  const rows = items
    .map(
      (item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid ${COLORS.lavanda}11;color:${COLORS.niebla};font-size:14px;">
        <strong>${item.nombre_producto}</strong>
        ${
          item.opciones_seleccionadas?.length
            ? `<br><span style="font-size:12px;color:${COLORS.lavanda};">${item.opciones_seleccionadas
                .map((o) => `${o.grupo_nombre}: ${o.opcion_valor}`)
                .join(" · ")}</span>`
            : ""
        }
      </td>
      <td style="padding:8px 0;border-bottom:1px solid ${COLORS.lavanda}11;color:${COLORS.lavanda};font-size:13px;text-align:center;">
        x${item.cantidad}
      </td>
      <td style="padding:8px 0;border-bottom:1px solid ${COLORS.lavanda}11;color:${COLORS.niebla};font-size:14px;text-align:right;">
        ${formatPrice(item.subtotal)}
      </td>
    </tr>`
    )
    .join("");

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    ${rows}
  </table>`;
}

function totalsBlock(pedido: Pedido): string {
  let html = `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
    <tr>
      <td style="padding:4px 0;color:${COLORS.lavanda};font-size:13px;">Subtotal</td>
      <td style="padding:4px 0;color:${COLORS.niebla};font-size:13px;text-align:right;">${formatPrice(pedido.subtotal)}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;color:${COLORS.lavanda};font-size:13px;">Envío</td>
      <td style="padding:4px 0;color:${COLORS.niebla};font-size:13px;text-align:right;">${pedido.costo_envio === 0 ? "Gratis" : formatPrice(pedido.costo_envio)}</td>
    </tr>`;

  if (pedido.recargo_mp > 0) {
    html += `
    <tr>
      <td style="padding:4px 0;color:${COLORS.lavanda};font-size:13px;">Recargo MercadoPago</td>
      <td style="padding:4px 0;color:${COLORS.ambar};font-size:13px;text-align:right;">${formatPrice(pedido.recargo_mp)}</td>
    </tr>`;
  }

  html += `
    <tr>
      <td style="padding:8px 0 0;color:${COLORS.niebla};font-size:16px;font-weight:bold;border-top:1px solid ${COLORS.lavanda}22;">Total</td>
      <td style="padding:8px 0 0;color:${COLORS.ambar};font-size:16px;font-weight:bold;text-align:right;border-top:1px solid ${COLORS.lavanda}22;">${formatPrice(pedido.total)}</td>
    </tr>
  </table>`;

  return html;
}

// ==========================================
// Email: Pedido confirmado (al cliente)
// ==========================================
export function pedidoConfirmadoEmail(
  pedido: Pedido & { items: PedidoItem[] },
  whatsapp: string,
  datosBancarios?: { cbu?: string; alias?: string }
): {
  subject: string;
  html: string;
} {
  const tipoEnvioSuffix = pedido.tipo_envio ? ` (${pedido.tipo_envio === "domicilio" ? "a domicilio" : "a sucursal"})` : "";
  const metodoEnvioLabel =
    pedido.metodo_envio === "retiro"
      ? "Retiro en persona"
      : `${pedido.metodo_envio === "correo_argentino" ? "Correo Argentino" : "Andreani"}${tipoEnvioSuffix}`;

  const metodoPagoLabel =
    pedido.metodo_pago === "mercadopago"
      ? "MercadoPago"
      : pedido.metodo_pago === "transferencia"
      ? "Transferencia bancaria"
      : "Efectivo";

  // El bloque de efectivo cambia entero cuando hay seña: sin esto decía "tu
  // pedido ya quedó confirmado" y mostraba el total como monto a pagar al
  // retirar, contradiciendo al bloque de seña que está justo arriba pidiendo
  // el anticipo.
  const tieneSena = pedido.tiene_sena && Number(pedido.monto_sena) > 0;

  const content = `
    <h2 style="margin:0 0 8px;color:${COLORS.niebla};font-size:18px;">¡Recibimos tu pedido!</h2>
    <p style="margin:0 0 20px;color:${COLORS.lavanda};font-size:14px;">
      Hola <strong style="color:${COLORS.niebla};">${pedido.nombre_cliente}</strong>, tu pedido fue registrado correctamente.
    </p>

    <!-- Número de pedido -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.navyDeep};border-radius:8px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px;text-align:center;">
          <p style="margin:0;color:${COLORS.lavanda};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Número de pedido</p>
          <p style="margin:4px 0 0;color:${COLORS.ambar};font-size:24px;font-weight:bold;font-family:monospace;">${pedido.numero_pedido}</p>
        </td>
      </tr>
    </table>

    <!-- Productos -->
    <h3 style="margin:0 0 8px;color:${COLORS.niebla};font-size:14px;">Productos</h3>
    ${itemsTable(pedido.items)}
    ${totalsBlock(pedido)}

    <!-- Info -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background-color:${COLORS.navyDeep};border-radius:8px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 4px;color:${COLORS.lavanda};font-size:12px;">Método de envío</p>
          <p style="margin:0 0 12px;color:${COLORS.niebla};font-size:14px;">${metodoEnvioLabel}</p>
          ${pedido.sucursal_correo_nombre ? `
          <p style="margin:0 0 4px;color:${COLORS.lavanda};font-size:12px;">Sucursal de retiro</p>
          <p style="margin:0 0 12px;color:${COLORS.niebla};font-size:14px;">${pedido.sucursal_correo_nombre}</p>
          ` : ""}
          <p style="margin:0 0 4px;color:${COLORS.lavanda};font-size:12px;">Método de pago</p>
          <p style="margin:0;color:${COLORS.niebla};font-size:14px;">${metodoPagoLabel}</p>
        </td>
      </tr>
    </table>

    ${
      pedido.metodo_pago === "transferencia"
        ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background-color:${COLORS.purpura}22;border:1px solid ${COLORS.purpura}44;border-radius:8px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 12px;color:${COLORS.niebla};font-size:14px;font-weight:bold;">Datos para transferencia</p>
          ${datosBancarios?.cbu ? `<p style="margin:0 0 4px;color:${COLORS.lavanda};font-size:12px;">CBU</p><p style="margin:0 0 12px;color:${COLORS.niebla};font-size:14px;font-family:monospace;">${datosBancarios.cbu}</p>` : ""}
          ${datosBancarios?.alias ? `<p style="margin:0 0 4px;color:${COLORS.lavanda};font-size:12px;">Alias</p><p style="margin:0 0 12px;color:${COLORS.niebla};font-size:14px;font-family:monospace;">${datosBancarios.alias}</p>` : ""}
          <p style="margin:0 0 4px;color:${COLORS.lavanda};font-size:12px;">Monto a transferir</p>
          <p style="margin:0 0 12px;color:${COLORS.ambar};font-size:18px;font-weight:bold;">${formatPrice(pedido.total)}</p>
          <p style="margin:0 0 12px;color:${COLORS.lavanda};font-size:13px;">
            Tenés <strong style="color:${COLORS.niebla};">48 horas</strong> para enviar el comprobante. Después el pedido se cancela automáticamente.
          </p>
          <p style="margin:0;text-align:center;">
            <a href="https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola! Te envío el comprobante del pedido ${pedido.numero_pedido} por ${formatPrice(pedido.total)}`)}"
               style="display:inline-block;padding:10px 24px;background-color:#25D366;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">
              Enviar comprobante por WhatsApp
            </a>
          </p>
        </td>
      </tr>
    </table>`
        : ""
    }

    ${
      pedido.tiene_sena && pedido.monto_sena
        ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background-color:${COLORS.purpura}22;border:1px solid ${COLORS.purpura}44;border-radius:8px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 8px;color:${COLORS.niebla};font-size:14px;font-weight:bold;">Pago en 2 partes</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;color:${COLORS.lavanda};font-size:13px;">💰 Seña ${pedido.metodo_pago === "mercadopago" ? "(via MercadoPago)" : pedido.metodo_pago === "efectivo" ? "(MercadoPago o transferencia)" : "(transferencia)"}</td>
              <td style="padding:6px 0;color:${COLORS.ambar};font-size:14px;font-weight:bold;text-align:right;">${formatPrice(Number(pedido.monto_sena))}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;border-top:1px solid ${COLORS.purpura}33;color:${COLORS.lavanda};font-size:13px;">📦 Saldo al recibir/retirar</td>
              <td style="padding:6px 0;border-top:1px solid ${COLORS.purpura}33;color:${COLORS.niebla};font-size:14px;text-align:right;">${formatPrice(Number(pedido.total) - Number(pedido.monto_sena))}</td>
            </tr>
          </table>
          <p style="margin:8px 0 0;color:${COLORS.lavanda};font-size:12px;">
            Solo abonás <strong style="color:${COLORS.niebla};">${formatPrice(Number(pedido.monto_sena))}</strong> ahora. El saldo lo pagás al momento de recibir o retirar el pedido.
          </p>
          ${
            pedido.metodo_pago === "efectivo"
              ? `
          <p style="margin:12px 0 0;padding-top:12px;border-top:1px solid ${COLORS.purpura}33;color:${COLORS.lavanda};font-size:12px;">
            Pagá la seña desde la página de tu pedido con MercadoPago${
              datosBancarios?.cbu || datosBancarios?.alias
                ? `, o transferí a ${datosBancarios.alias ? `<strong style="color:${COLORS.niebla};">${datosBancarios.alias}</strong>` : `<strong style="color:${COLORS.niebla};font-family:monospace;">${datosBancarios.cbu}</strong>`} y mandanos el comprobante por WhatsApp`
                : ""
            }.
            Si no se abona en <strong style="color:${COLORS.niebla};">48 horas</strong>, el pedido se cancela automáticamente.
          </p>
          <p style="margin:12px 0 0;text-align:center;">
            <a href="${pedidoLink(pedido.id)}"
               style="display:inline-block;padding:10px 24px;background-color:${COLORS.ambar};color:${COLORS.navyDeep};text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">
              Pagar la seña
            </a>
          </p>`
              : ""
          }
        </td>
      </tr>
    </table>`
        : ""
    }

    ${
      pedido.metodo_pago === "efectivo"
        ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background-color:${COLORS.purpura}22;border:1px solid ${COLORS.purpura}44;border-radius:8px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 8px;color:${COLORS.niebla};font-size:14px;font-weight:bold;">${
            tieneSena ? "Saldo al retirar" : "Pago en efectivo al retirar"
          }</p>
          <p style="margin:0 0 12px;color:${COLORS.lavanda};font-size:13px;">${
            tieneSena
              ? `Una vez acreditada la seña arrancamos la producción. <strong style="color:${COLORS.niebla};">El saldo lo pagás en efectivo al retirar</strong>.`
              : `Tu pedido ya quedó confirmado y arranca producción. <strong style="color:${COLORS.niebla};">El pago lo hacés al retirarlo en persona</strong>, no antes.`
          }</p>
          <p style="margin:0 0 4px;color:${COLORS.lavanda};font-size:12px;">Monto a pagar al retirar</p>
          <p style="margin:0 0 12px;color:${COLORS.ambar};font-size:18px;font-weight:bold;">${formatPrice(
            tieneSena ? Number(pedido.total) - Number(pedido.monto_sena) : pedido.total
          )}</p>
          <p style="margin:0 0 12px;color:${COLORS.lavanda};font-size:13px;">
            Te avisamos cuando esté listo para que coordinemos el retiro en Villa Crespo.
          </p>
          <p style="margin:0;text-align:center;">
            <a href="https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola! Consulta sobre el pedido ${pedido.numero_pedido}`)}"
               style="display:inline-block;padding:10px 24px;background-color:#25D366;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">
              Consultar por WhatsApp
            </a>
          </p>
        </td>
      </tr>
    </table>`
        : ""
    }

    ${verPedidoButton(pedido.id)}

    <p style="margin:24px 0 0;color:${COLORS.lavanda};font-size:13px;text-align:center;">
      Si tenés alguna duda, escribinos por <a href="https://wa.me/${whatsapp}" style="color:${COLORS.ambar};text-decoration:none;">WhatsApp</a>
    </p>
  `;

  return {
    subject: `Pedido ${pedido.numero_pedido} confirmado — Sendero Shop`,
    html: baseLayout(content),
  };
}

// ==========================================
// Email: Pago recibido (al cliente)
// ==========================================
export function pagoRecibidoEmail(pedido: Pedido, whatsapp: string): {
  subject: string;
  html: string;
} {
  const content = `
    <h2 style="margin:0 0 8px;color:${COLORS.niebla};font-size:18px;">¡Recibimos tu pago!</h2>
    <p style="margin:0 0 20px;color:${COLORS.lavanda};font-size:14px;">
      Hola <strong style="color:${COLORS.niebla};">${pedido.nombre_cliente}</strong>, confirmamos que recibimos el pago de tu pedido.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.navyDeep};border-radius:8px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px;text-align:center;">
          <p style="margin:0;color:${COLORS.lavanda};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Pedido</p>
          <p style="margin:4px 0 0;color:${COLORS.ambar};font-size:24px;font-weight:bold;font-family:monospace;">${pedido.numero_pedido}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:${COLORS.lavanda};font-size:14px;">
      Tu pedido ya está <strong style="color:#4ade80;">en producción</strong>. Te avisaremos cuando esté listo.
    </p>

    ${verPedidoButton(pedido.id)}

    <p style="margin:24px 0 0;color:${COLORS.lavanda};font-size:13px;text-align:center;">
      Si tenés alguna duda, escribinos por <a href="https://wa.me/${whatsapp}" style="color:${COLORS.ambar};text-decoration:none;">WhatsApp</a>
    </p>
  `;

  return {
    subject: `Pago confirmado — Pedido ${pedido.numero_pedido}`,
    html: baseLayout(content),
  };
}

// ==========================================
// Email: Pedido enviado (al cliente)
// ==========================================
export function pedidoEnviadoEmail(pedido: Pedido, whatsapp: string): {
  subject: string;
  html: string;
} {
  const content = `
    <h2 style="margin:0 0 8px;color:${COLORS.niebla};font-size:18px;">¡Tu pedido fue enviado!</h2>
    <p style="margin:0 0 20px;color:${COLORS.lavanda};font-size:14px;">
      Hola <strong style="color:${COLORS.niebla};">${pedido.nombre_cliente}</strong>, tu pedido ya está en camino.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.navyDeep};border-radius:8px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px;text-align:center;">
          <p style="margin:0;color:${COLORS.lavanda};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Pedido</p>
          <p style="margin:4px 0 0;color:${COLORS.ambar};font-size:24px;font-weight:bold;font-family:monospace;">${pedido.numero_pedido}</p>
        </td>
      </tr>
    </table>

    ${(() => {
      if (!pedido.tracking_code) return "";
      const trackingUrl = resolveTrackingUrl({
        tracking_url: pedido.tracking_url,
        metodo_envio: pedido.metodo_envio,
      });
      const esCorreoArg =
        !pedido.tracking_url && pedido.metodo_envio === "correo_argentino";
      return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.purpura}22;border:1px solid ${COLORS.purpura}44;border-radius:8px;margin-bottom:16px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 4px;color:${COLORS.lavanda};font-size:12px;">Código de seguimiento</p>
          <p style="margin:0;color:${COLORS.niebla};font-size:16px;font-family:monospace;font-weight:bold;">${pedido.tracking_code}</p>
          ${
            trackingUrl
              ? `<p style="margin:8px 0 0;"><a href="${trackingUrl}" style="color:${COLORS.ambar};font-size:13px;text-decoration:none;">${
                  esCorreoArg ? "Consultar estado en Correo Argentino →" : "Seguir envío →"
                }</a></p>${
                  esCorreoArg
                    ? `<p style="margin:6px 0 0;color:${COLORS.lavanda}99;font-size:11px;">Copiá el código de arriba y pegalo en el formulario.</p>`
                    : ""
                }`
              : ""
          }
        </td>
      </tr>
    </table>`;
    })()}

    <p style="margin:0;color:${COLORS.lavanda};font-size:14px;">
      ${
        pedido.metodo_envio === "correo_argentino"
          ? "Enviado por Correo Argentino."
          : pedido.metodo_envio === "andreani"
          ? "Enviado por Andreani."
          : ""
      }
    </p>

    ${verPedidoButton(pedido.id)}

    <p style="margin:24px 0 0;color:${COLORS.lavanda};font-size:13px;text-align:center;">
      Si tenés alguna duda, escribinos por <a href="https://wa.me/${whatsapp}" style="color:${COLORS.ambar};text-decoration:none;">WhatsApp</a>
    </p>
  `;

  return {
    subject: `Tu pedido ${pedido.numero_pedido} fue enviado — Sendero Shop`,
    html: baseLayout(content),
  };
}

// ==========================================
// Email: Pedido listo para retirar (al cliente)
// ==========================================
export function pedidoListoRetiroEmail(pedido: Pedido, whatsapp: string): {
  subject: string;
  html: string;
} {
  const content = `
    <h2 style="margin:0 0 8px;color:${COLORS.niebla};font-size:18px;">Tu pedido está listo para retirar</h2>
    <p style="margin:0 0 20px;color:${COLORS.lavanda};font-size:14px;">
      Hola <strong style="color:${COLORS.niebla};">${pedido.nombre_cliente}</strong>, tu pedido ya está listo y te esperamos para que lo retires.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.navyDeep};border-radius:8px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px;text-align:center;">
          <p style="margin:0;color:${COLORS.lavanda};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Pedido</p>
          <p style="margin:4px 0 0;color:${COLORS.ambar};font-size:24px;font-weight:bold;font-family:monospace;">${pedido.numero_pedido}</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.purpura}22;border:1px solid ${COLORS.purpura}44;border-radius:8px;margin-bottom:16px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 4px;color:${COLORS.lavanda};font-size:12px;">Punto de retiro</p>
          <p style="margin:0;color:${COLORS.niebla};font-size:14px;font-weight:bold;">Villa Crespo, CABA</p>
          <p style="margin:8px 0 0;color:${COLORS.lavanda};font-size:13px;">
            Coordiná el horario de retiro por WhatsApp para que te esperemos.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;text-align:center;">
      <a href="https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola! Quiero coordinar el retiro del pedido ${pedido.numero_pedido}`)}"
         style="display:inline-block;padding:10px 24px;background-color:#25D366;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">
        Coordinar retiro por WhatsApp
      </a>
    </p>

    ${verPedidoButton(pedido.id)}

    <p style="margin:24px 0 0;color:${COLORS.lavanda};font-size:13px;text-align:center;">
      Si tenés alguna duda, escribinos por <a href="https://wa.me/${whatsapp}" style="color:${COLORS.ambar};text-decoration:none;">WhatsApp</a>
    </p>
  `;

  return {
    subject: `Tu pedido ${pedido.numero_pedido} está listo para retirar — Sendero Shop`,
    html: baseLayout(content),
  };
}

// ==========================================
// Email: Pedido entregado (al cliente)
// ==========================================
export function pedidoEntregadoEmail(pedido: Pedido, whatsapp: string): {
  subject: string;
  html: string;
} {
  const content = `
    <h2 style="margin:0 0 8px;color:${COLORS.niebla};font-size:18px;">¡Tu pedido fue entregado!</h2>
    <p style="margin:0 0 20px;color:${COLORS.lavanda};font-size:14px;">
      Hola <strong style="color:${COLORS.niebla};">${pedido.nombre_cliente}</strong>, esperamos que disfrutes tu compra.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.navyDeep};border-radius:8px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px;text-align:center;">
          <p style="margin:0;color:${COLORS.lavanda};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Pedido</p>
          <p style="margin:4px 0 0;color:${COLORS.ambar};font-size:24px;font-weight:bold;font-family:monospace;">${pedido.numero_pedido}</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.purpura}22;border:1px solid ${COLORS.purpura}44;border-radius:8px;margin-bottom:16px;">
      <tr>
        <td style="padding:16px;text-align:center;">
          <p style="margin:0 0 8px;color:${COLORS.niebla};font-size:16px;">⭐ ¿Qué te pareció?</p>
          <p style="margin:0 0 12px;color:${COLORS.lavanda};font-size:13px;">
            Tu opinión nos ayuda a mejorar y ayuda a otros compradores.
          </p>
          <a href="${pedidoLink(pedido.id)}"
             style="display:inline-block;padding:10px 24px;background-color:${COLORS.ambar};color:${COLORS.navyDeep};text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">
            Dejá tu reseña
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:${COLORS.lavanda};font-size:14px;text-align:center;">
      ¡Gracias por elegirnos!
    </p>

    <p style="margin:24px 0 0;color:${COLORS.lavanda};font-size:13px;text-align:center;">
      Si tenés alguna duda, escribinos por <a href="https://wa.me/${whatsapp}" style="color:${COLORS.ambar};text-decoration:none;">WhatsApp</a>
    </p>
  `;

  return {
    subject: `¡Pedido ${pedido.numero_pedido} entregado! Dejá tu reseña ⭐`,
    html: baseLayout(content),
  };
}

// ==========================================
// Email: Pedido cancelado (al cliente)
// ==========================================
export function pedidoCanceladoEmail(
  pedido: Pedido,
  whatsapp: string,
  motivo?: string
): { subject: string; html: string } {
  const content = `
    <h2 style="margin:0 0 8px;color:${COLORS.niebla};font-size:18px;">Tu pedido fue cancelado</h2>
    <p style="margin:0 0 20px;color:${COLORS.lavanda};font-size:14px;">
      Hola <strong style="color:${COLORS.niebla};">${pedido.nombre_cliente}</strong>, lamentamos informarte que tu pedido fue cancelado.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.navyDeep};border-radius:8px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px;text-align:center;">
          <p style="margin:0;color:${COLORS.lavanda};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Pedido</p>
          <p style="margin:4px 0 0;color:${COLORS.ambar};font-size:24px;font-weight:bold;font-family:monospace;">${pedido.numero_pedido}</p>
        </td>
      </tr>
    </table>

    ${
      motivo
        ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.purpura}22;border:1px solid ${COLORS.purpura}44;border-radius:8px;margin-bottom:16px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 4px;color:${COLORS.lavanda};font-size:12px;">Motivo</p>
          <p style="margin:0;color:${COLORS.niebla};font-size:14px;">${motivo}</p>
        </td>
      </tr>
    </table>`
        : ""
    }

    <p style="margin:0 0 24px;color:${COLORS.lavanda};font-size:14px;">
      Si fue un error o cambiaste de opinión, podés volver a hacer tu pedido en cualquier momento.
    </p>

    <p style="margin:0;text-align:center;">
      <a href="${SITE_URL}/catalogo"
         style="display:inline-block;padding:12px 28px;background-color:${COLORS.ambar};color:${COLORS.navyDeep};text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">
        Volver a comprar
      </a>
    </p>

    <p style="margin:24px 0 0;color:${COLORS.lavanda};font-size:13px;text-align:center;">
      Si tenés alguna duda, escribinos por <a href="https://wa.me/${whatsapp}" style="color:${COLORS.ambar};text-decoration:none;">WhatsApp</a>
    </p>
  `;

  return {
    subject: `Pedido ${pedido.numero_pedido} cancelado — Sendero Shop`,
    html: baseLayout(content),
  };
}

// ==========================================
// Email: Nuevo pedido (notificación admin)
// ==========================================
export function nuevoPedidoAdminEmail(pedido: Pedido & { items: PedidoItem[] }): {
  subject: string;
  html: string;
} {
  const content = `
    <h2 style="margin:0 0 8px;color:${COLORS.niebla};font-size:18px;">Nuevo pedido recibido</h2>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.navyDeep};border-radius:8px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:${COLORS.lavanda};font-size:12px;">Pedido</td>
              <td style="color:${COLORS.ambar};font-size:16px;font-weight:bold;text-align:right;font-family:monospace;">${pedido.numero_pedido}</td>
            </tr>
            <tr>
              <td style="color:${COLORS.lavanda};font-size:12px;padding-top:8px;">Cliente</td>
              <td style="color:${COLORS.niebla};font-size:14px;text-align:right;padding-top:8px;">${pedido.nombre_cliente}</td>
            </tr>
            <tr>
              <td style="color:${COLORS.lavanda};font-size:12px;padding-top:4px;">Email</td>
              <td style="color:${COLORS.niebla};font-size:14px;text-align:right;padding-top:4px;">${pedido.email}</td>
            </tr>
            <tr>
              <td style="color:${COLORS.lavanda};font-size:12px;padding-top:4px;">Teléfono</td>
              <td style="color:${COLORS.niebla};font-size:14px;text-align:right;padding-top:4px;">${pedido.telefono}</td>
            </tr>
            <tr>
              <td style="color:${COLORS.lavanda};font-size:12px;padding-top:4px;">Envío</td>
              <td style="color:${COLORS.niebla};font-size:14px;text-align:right;padding-top:4px;">${pedido.metodo_envio === "retiro" ? "Retiro en persona" : `${pedido.metodo_envio === "correo_argentino" ? "Correo Argentino" : "Andreani"}${pedido.tipo_envio ? ` (${pedido.tipo_envio === "domicilio" ? "a domicilio" : "a sucursal"})` : ""}`}</td>
            </tr>
            ${pedido.sucursal_correo_nombre ? `<tr>
              <td style="color:${COLORS.lavanda};font-size:12px;padding-top:4px;">Sucursal</td>
              <td style="color:${COLORS.niebla};font-size:13px;text-align:right;padding-top:4px;">${pedido.sucursal_correo_nombre}</td>
            </tr>` : ""}
            <tr>
              <td style="color:${COLORS.lavanda};font-size:12px;padding-top:4px;">Pago</td>
              <td style="color:${COLORS.niebla};font-size:14px;text-align:right;padding-top:4px;">${pedido.metodo_pago === "mercadopago" ? "MercadoPago" : pedido.metodo_pago}</td>
            </tr>
            <tr>
              <td style="color:${COLORS.lavanda};font-size:12px;padding-top:4px;">Total</td>
              <td style="color:${COLORS.ambar};font-size:18px;font-weight:bold;text-align:right;padding-top:4px;">${formatPrice(pedido.total)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${itemsTable(pedido.items)}

    <p style="margin:20px 0 0;text-align:center;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/pedidos/${pedido.id}"
         style="display:inline-block;padding:10px 24px;background-color:${COLORS.purpura};color:${COLORS.niebla};text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">
        Ver pedido en admin
      </a>
    </p>
  `;

  return {
    subject: `Nuevo pedido ${pedido.numero_pedido} — ${formatPrice(pedido.total)}`,
    html: baseLayout(content),
  };
}

// ==========================================
// Email: Pago confirmado (notificación admin)
// ==========================================
export function pagoConfirmadoAdminEmail(pedido: Pedido & { items: PedidoItem[] }): {
  subject: string;
  html: string;
} {
  const content = `
    <h2 style="margin:0 0 8px;color:#4ade80;font-size:18px;">Pago confirmado por MercadoPago</h2>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.navyDeep};border-radius:8px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:${COLORS.lavanda};font-size:12px;">Pedido</td>
              <td style="color:${COLORS.ambar};font-size:16px;font-weight:bold;text-align:right;font-family:monospace;">${pedido.numero_pedido}</td>
            </tr>
            <tr>
              <td style="color:${COLORS.lavanda};font-size:12px;padding-top:8px;">Cliente</td>
              <td style="color:${COLORS.niebla};font-size:14px;text-align:right;padding-top:8px;">${pedido.nombre_cliente}</td>
            </tr>
            <tr>
              <td style="color:${COLORS.lavanda};font-size:12px;padding-top:4px;">Email</td>
              <td style="color:${COLORS.niebla};font-size:14px;text-align:right;padding-top:4px;">${pedido.email}</td>
            </tr>
            <tr>
              <td style="color:${COLORS.lavanda};font-size:12px;padding-top:4px;">Teléfono</td>
              <td style="color:${COLORS.niebla};font-size:14px;text-align:right;padding-top:4px;">${pedido.telefono}</td>
            </tr>
            <tr>
              <td style="color:${COLORS.lavanda};font-size:12px;padding-top:4px;">MP Payment ID</td>
              <td style="color:${COLORS.niebla};font-size:14px;text-align:right;padding-top:4px;">${pedido.mp_payment_id || "—"}</td>
            </tr>
            <tr>
              <td style="color:${COLORS.lavanda};font-size:12px;padding-top:4px;">Total</td>
              <td style="color:#4ade80;font-size:18px;font-weight:bold;text-align:right;padding-top:4px;">${formatPrice(pedido.total)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${itemsTable(pedido.items)}

    <p style="margin:20px 0 0;text-align:center;">
      <a href="${SITE_URL}/admin/pedidos"
         style="display:inline-block;padding:10px 24px;background-color:#4ade80;color:${COLORS.navyDeep};text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">
        Ver pedidos en admin
      </a>
    </p>
  `;

  return {
    subject: `Pago confirmado — Pedido ${pedido.numero_pedido} — ${formatPrice(pedido.total)}`,
    html: baseLayout(content),
  };
}
