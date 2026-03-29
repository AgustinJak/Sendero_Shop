import type { Pedido, PedidoItem } from "@/types";
import { formatPrice } from "@/lib/utils";

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
                Sendero Shop — Figuras y accesorios impresos en 3D
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
  datosBancarios?: { cbu?: string; alias?: string }
): {
  subject: string;
  html: string;
} {
  const metodoEnvioLabel =
    pedido.metodo_envio === "retiro"
      ? "Retiro en persona"
      : pedido.metodo_envio === "correo_argentino"
      ? "Correo Argentino"
      : "Andreani";

  const metodoPagoLabel =
    pedido.metodo_pago === "mercadopago"
      ? "MercadoPago"
      : pedido.metodo_pago === "transferencia"
      ? "Transferencia bancaria"
      : "Efectivo";

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
            <a href="https://wa.me/5491125502785?text=${encodeURIComponent(`Hola! Te envío el comprobante del pedido ${pedido.numero_pedido} por ${formatPrice(pedido.total)}`)}"
               style="display:inline-block;padding:10px 24px;background-color:#25D366;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">
              Enviar comprobante por WhatsApp
            </a>
          </p>
        </td>
      </tr>
    </table>`
        : ""
    }

    ${verPedidoButton(pedido.id)}

    <p style="margin:24px 0 0;color:${COLORS.lavanda};font-size:13px;text-align:center;">
      Si tenés alguna duda, escribinos por <a href="https://wa.me/5491125502785" style="color:${COLORS.ambar};text-decoration:none;">WhatsApp</a>
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
export function pagoRecibidoEmail(pedido: Pedido): {
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
      Si tenés alguna duda, escribinos por <a href="https://wa.me/5491125502785" style="color:${COLORS.ambar};text-decoration:none;">WhatsApp</a>
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
export function pedidoEnviadoEmail(pedido: Pedido): {
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

    ${
      pedido.tracking_code
        ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.purpura}22;border:1px solid ${COLORS.purpura}44;border-radius:8px;margin-bottom:16px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 4px;color:${COLORS.lavanda};font-size:12px;">Código de seguimiento</p>
          <p style="margin:0;color:${COLORS.niebla};font-size:16px;font-family:monospace;font-weight:bold;">${pedido.tracking_code}</p>
          ${
            pedido.tracking_url
              ? `<p style="margin:8px 0 0;"><a href="${pedido.tracking_url}" style="color:${COLORS.ambar};font-size:13px;text-decoration:none;">Seguir envío →</a></p>`
              : ""
          }
        </td>
      </tr>
    </table>`
        : ""
    }

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
      Si tenés alguna duda, escribinos por <a href="https://wa.me/5491125502785" style="color:${COLORS.ambar};text-decoration:none;">WhatsApp</a>
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
export function pedidoListoRetiroEmail(pedido: Pedido): {
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
      <a href="https://wa.me/5491125502785?text=${encodeURIComponent(`Hola! Quiero coordinar el retiro del pedido ${pedido.numero_pedido}`)}"
         style="display:inline-block;padding:10px 24px;background-color:#25D366;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">
        Coordinar retiro por WhatsApp
      </a>
    </p>

    ${verPedidoButton(pedido.id)}

    <p style="margin:24px 0 0;color:${COLORS.lavanda};font-size:13px;text-align:center;">
      Si tenés alguna duda, escribinos por <a href="https://wa.me/5491125502785" style="color:${COLORS.ambar};text-decoration:none;">WhatsApp</a>
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
export function pedidoEntregadoEmail(pedido: Pedido): {
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
      Si tenés alguna duda, escribinos por <a href="https://wa.me/5491125502785" style="color:${COLORS.ambar};text-decoration:none;">WhatsApp</a>
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
      Si tenés alguna duda, escribinos por <a href="https://wa.me/5491125502785" style="color:${COLORS.ambar};text-decoration:none;">WhatsApp</a>
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
