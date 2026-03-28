import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { formatPrice, whatsappLink } from "@/lib/utils";
import type { Pedido, PedidoItem } from "@/types";

export const metadata: Metadata = {
  title: "Pedido confirmado",
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

  // Cargar config para datos bancarios
  const { data: config } = await supabase.from("configuracion").select("*");
  const cfg: Record<string, string> = {};
  config?.forEach((c: { key: string; value: string }) => { cfg[c.key] = c.value; });

  const esTransferencia = p.metodo_pago === "transferencia";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-green-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="font-[family-name:var(--font-cinzel)] text-2xl font-bold text-niebla">
          Pedido registrado
        </h1>
        <p className="text-lavanda/60 mt-2">
          Tu pedido <span className="text-ambar font-bold">{p.numero_pedido}</span> fue creado correctamente
        </p>
      </div>

      {/* Datos bancarios si es transferencia */}
      {esTransferencia && (
        <div className="bg-ambar/10 border border-ambar/20 rounded-xl p-6 mb-6 space-y-3">
          <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-ambar-light uppercase tracking-wider">
            Datos para transferencia
          </h2>
          <p className="text-sm text-lavanda-light">
            Transferí el monto exacto y envianos el comprobante por WhatsApp.
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

      {/* Resumen del pedido */}
      <div className="bg-navy-deep rounded-xl border border-lavanda/10 p-6 space-y-4">
        <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider">
          Resumen
        </h2>

        {/* Items */}
        <div className="space-y-2">
          {p.items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div>
                <span className="text-lavanda-light">{item.nombre_producto}</span>
                <span className="text-lavanda/40 ml-1">x{item.cantidad}</span>
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
            <span className="text-lavanda/60">Envío ({
              p.metodo_envio === "retiro" ? "Retiro" :
              p.metodo_envio === "correo_argentino" ? "Correo Argentino" : "Andreani"
            })</span>
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

        {/* Info del comprador */}
        <div className="border-t border-lavanda/10 pt-3 space-y-1 text-sm">
          <p className="text-lavanda/60">
            {p.nombre_cliente} · {p.email}
          </p>
          <p className="text-lavanda/60">
            Estado: <span className="text-ambar-light capitalize">{p.estado.replace(/_/g, " ")}</span>
          </p>
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-8 text-center space-y-4">
        <Link
          href="/catalogo"
          className="inline-block px-8 py-3 bg-purpura hover:bg-purpura/80 text-niebla font-semibold rounded-lg transition-colors"
        >
          Seguir comprando
        </Link>
        <p className="text-xs text-lavanda/40">
          Te enviamos un resumen a {p.email}
        </p>
      </div>
    </div>
  );
}
