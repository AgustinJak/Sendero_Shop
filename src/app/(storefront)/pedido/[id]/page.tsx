import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { formatPrice, whatsappLink } from "@/lib/utils";
import type { Pedido, PedidoItem } from "@/types";
import OrderTimeline from "@/components/pedido/OrderTimeline";
import CancelOrderButton from "@/components/pedido/CancelOrderButton";

export const metadata: Metadata = {
  title: "Mi pedido",
  robots: "noindex, nofollow",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PedidoPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServiceRoleClient();

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("*, items:pedido_items(*)")
    .eq("id", id)
    .single();

  if (!pedido) notFound();

  const p = pedido as Pedido & { items: PedidoItem[] };

  // Load bank config for transfers
  const { data: config } = await supabase.from("configuracion").select("*");
  const cfg: Record<string, string> = {};
  config?.forEach((c: { key: string; value: string }) => { cfg[c.key] = c.value; });

  const esTransferencia = p.metodo_pago === "transferencia";
  const puedeCancelar = p.estado === "pendiente_pago" || p.estado === "pago_confirmado";

  const metodoEnvioLabel =
    p.metodo_envio === "retiro"
      ? "Retiro en persona"
      : p.metodo_envio === "correo_argentino"
      ? "Correo Argentino"
      : "Andreani";

  const metodoPagoLabel =
    p.metodo_pago === "mercadopago"
      ? "MercadoPago"
      : p.metodo_pago === "transferencia"
      ? "Transferencia bancaria"
      : "Efectivo";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-cinzel)] text-2xl font-bold text-niebla">
          Pedido {p.numero_pedido}
        </h1>
        <p className="text-lavanda/60 mt-1 text-sm">
          Creado el {new Date(p.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Timeline */}
      <div className="bg-navy-deep rounded-xl border border-lavanda/10 p-6">
        <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider mb-4">
          Estado del pedido
        </h2>
        <OrderTimeline estado={p.estado} />
      </div>

      {/* Transfer payment block */}
      {esTransferencia && p.estado === "pendiente_pago" && (
        <div className="bg-ambar/10 border border-ambar/20 rounded-xl p-6 space-y-3">
          <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-ambar-light uppercase tracking-wider">
            Datos para transferencia
          </h2>
          <p className="text-sm text-lavanda-light">
            Transferí el monto exacto y envianos el comprobante por WhatsApp con tu número de pedido.
          </p>
          {cfg.cbu && (
            <div className="flex justify-between text-sm">
              <span className="text-lavanda/60">CBU</span>
              <span className="text-niebla font-mono">{cfg.cbu}</span>
            </div>
          )}
          {cfg.alias && (
            <div className="flex justify-between text-sm">
              <span className="text-lavanda/60">Alias</span>
              <span className="text-niebla font-mono">{cfg.alias}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-lavanda/60">Monto</span>
            <span className="text-ambar font-bold text-lg">{formatPrice(p.total)}</span>
          </div>
          <p className="text-xs text-lavanda/40">
            Tenés 48 horas para enviar el comprobante. Después el pedido se cancela automáticamente.
          </p>
          <a
            href={whatsappLink(`Hola! Te envío el comprobante del pedido ${p.numero_pedido} por ${formatPrice(p.total)}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            Enviar comprobante por WhatsApp
          </a>
        </div>
      )}

      {/* Tracking info */}
      {p.tracking_code && (
        <div className="bg-purpura/10 border border-purpura/20 rounded-xl p-6 space-y-2">
          <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider">
            Seguimiento de envío
          </h2>
          <p className="text-niebla font-mono text-lg font-bold">{p.tracking_code}</p>
          {p.tracking_url && (
            <a
              href={p.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-ambar text-sm hover:underline"
            >
              Seguir envío →
            </a>
          )}
        </div>
      )}

      {/* Order summary */}
      <div className="bg-navy-deep rounded-xl border border-lavanda/10 p-6 space-y-4">
        <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider">
          Resumen
        </h2>

        <div className="space-y-2">
          {p.items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div>
                <span className="text-lavanda-light">{item.nombre_producto}</span>
                <span className="text-lavanda/40 ml-1">x{item.cantidad}</span>
                {item.opciones_seleccionadas?.length > 0 && (
                  <p className="text-xs text-lavanda/40">
                    {item.opciones_seleccionadas.map((o) => `${o.grupo_nombre}: ${o.opcion_valor}`).join(" · ")}
                  </p>
                )}
              </div>
              <span className="text-niebla">{formatPrice(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-lavanda/10 pt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-lavanda/60">Subtotal</span>
            <span className="text-lavanda-light">{formatPrice(p.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-lavanda/60">Envío ({metodoEnvioLabel})</span>
            <span className="text-lavanda-light">{p.costo_envio === 0 ? "Gratis" : formatPrice(p.costo_envio)}</span>
          </div>
          {p.recargo_mp > 0 && (
            <div className="flex justify-between">
              <span className="text-lavanda/60">Recargo MP</span>
              <span className="text-ambar">{formatPrice(p.recargo_mp)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-lavanda/10">
            <span className="text-niebla">Total</span>
            <span className="text-ambar">{formatPrice(p.total)}</span>
          </div>
        </div>

        {/* Customer info */}
        <div className="border-t border-lavanda/10 pt-3 space-y-1 text-sm">
          <p className="text-lavanda/60">{p.nombre_cliente} · {p.email}</p>
          <p className="text-lavanda/60">Pago: {metodoPagoLabel}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="text-center space-y-4">
        <Link
          href="/catalogo"
          className="inline-block px-8 py-3 bg-purpura hover:bg-purpura/80 text-niebla font-semibold rounded-lg transition-colors"
        >
          Seguir comprando
        </Link>

        {puedeCancelar && (
          <div className="pt-2">
            <CancelOrderButton pedidoId={p.id} />
          </div>
        )}

        <p className="text-xs text-lavanda/40">
          ¿Dudas? Escribinos por{" "}
          <a href={whatsappLink(`Hola, tengo una consulta sobre el pedido ${p.numero_pedido}`)} className="text-ambar hover:underline" target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
}
