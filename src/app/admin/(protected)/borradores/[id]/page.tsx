import { createServiceRoleClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { calculateSubtotal, calculateDescuento } from "@/lib/borrador";
import type { EstadoBorrador, PedidoBorrador } from "@/types";
import BorradorActions from "@/components/admin/BorradorActions";

const ESTADO_LABELS: Record<EstadoBorrador, string> = {
  pendiente: "Pendiente",
  convertido: "Convertido",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

const ESTADO_COLORS: Record<EstadoBorrador, string> = {
  pendiente: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  convertido: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  expirado: "text-lavanda/60 bg-lavanda/5 border-lavanda/20",
  cancelado: "text-red-400 bg-red-400/10 border-red-400/20",
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sendero3d.com";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BorradorDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServiceRoleClient();

  const { data } = await supabase
    .from("pedidos_borrador")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const b = data as PedidoBorrador;

  const subtotal = calculateSubtotal(b.items);
  const descuento = calculateDescuento(
    subtotal,
    Number(b.descuento_monto),
    Number(b.descuento_porcentaje)
  );
  const totalEstimado = subtotal - descuento;
  const url = `${SITE_URL}/pedido-custom/${b.token}`;

  // Pedido convertido (si existe)
  let pedidoConvertido: { numero_pedido: string; id: string } | null = null;
  if (b.pedido_id) {
    const { data: p } = await supabase
      .from("pedidos")
      .select("id, numero_pedido")
      .eq("id", b.pedido_id)
      .single();
    if (p) pedidoConvertido = p;
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
            Borrador
          </h1>
          <p className="text-sm text-lavanda/60 mt-0.5">
            Creado el {new Date(b.created_at).toLocaleString("es-AR")}
          </p>
        </div>
        <Link
          href="/admin/borradores"
          className="text-sm text-lavanda hover:text-niebla transition-colors"
        >
          ← Volver
        </Link>
      </div>

      {/* Estado */}
      <div className={`inline-block text-sm px-3 py-1 rounded-full border ${ESTADO_COLORS[b.estado]}`}>
        {ESTADO_LABELS[b.estado]}
      </div>

      {/* Info de conversión */}
      {pedidoConvertido && (
        <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-xl p-4">
          <p className="text-sm text-emerald-400 font-medium">
            Cliente completó este borrador →{" "}
            <Link
              href={`/admin/pedidos/${pedidoConvertido.id}`}
              className="underline hover:text-emerald-300"
            >
              Pedido {pedidoConvertido.numero_pedido}
            </Link>
          </p>
        </div>
      )}

      {/* Acciones (URL, copiar, cancelar, regenerar, eliminar) */}
      <BorradorActions borrador={b} url={url} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-navy rounded-xl border border-lavanda/10 p-4">
            <h2 className="text-sm font-semibold text-niebla mb-3">Items</h2>
            <div className="space-y-2">
              {b.items.map((it, idx) => (
                <div key={idx} className="bg-navy-deep rounded-lg p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-lavanda/40 mb-1">
                        {it.producto_id ? (
                          <span className="px-1.5 py-0.5 bg-emerald-400/10 text-emerald-400 rounded text-[10px]">
                            CATÁLOGO {it.sku ? `· ${it.sku}` : ""}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-ambar/10 text-ambar rounded text-[10px]">
                            CUSTOM
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-niebla">{it.nombre}</p>
                      <p className="text-xs text-lavanda/60">
                        {it.cantidad} × {formatPrice(it.precio_unitario)}
                      </p>
                    </div>
                    <p className="text-sm text-niebla font-medium whitespace-nowrap">
                      {formatPrice(it.precio_unitario * it.cantidad)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {b.notas_admin && (
            <section className="bg-navy rounded-xl border border-lavanda/10 p-4">
              <h2 className="text-sm font-semibold text-niebla mb-2">Notas internas</h2>
              <p className="text-sm text-lavanda-light whitespace-pre-wrap">{b.notas_admin}</p>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-niebla">Totales</h2>
            <div className="text-sm space-y-1">
              <div className="flex justify-between text-lavanda">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {descuento > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Descuento</span>
                  <span>−{formatPrice(descuento)}</span>
                </div>
              )}
              <div className="flex justify-between text-niebla font-semibold pt-1 border-t border-lavanda/10">
                <span>Sin envío</span>
                <span className="text-ambar">{formatPrice(totalEstimado)}</span>
              </div>
            </div>
            <p className="text-xs text-lavanda/40 pt-2">
              El envío se calcula al momento que el cliente complete sus datos.
            </p>
          </section>

          <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-niebla">Envío</h2>
            <p className="text-sm text-lavanda-light">
              {b.envio_gratis
                ? "Envío gratis"
                : b.costo_envio_override !== null
                ? `Fijo: ${formatPrice(Number(b.costo_envio_override))}`
                : "Cotización normal"}
            </p>
          </section>

          <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-niebla">Métodos de pago</h2>
            <p className="text-sm text-lavanda-light">
              {b.metodos_pago_permitidos
                ? b.metodos_pago_permitidos.join(", ")
                : "Todos (MP, transferencia, efectivo)"}
            </p>
          </section>

          {(b.paquete_peso_gr || b.paquete_alto_cm) && (
            <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-2">
              <h2 className="text-sm font-semibold text-niebla">Paquete (override)</h2>
              <p className="text-sm text-lavanda-light">
                {b.paquete_peso_gr}g · {b.paquete_alto_cm}×{b.paquete_ancho_cm}×{b.paquete_largo_cm}cm
              </p>
            </section>
          )}

          {b.estado === "pendiente" && (
            <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-2">
              <h2 className="text-sm font-semibold text-niebla">Expira</h2>
              <p className="text-sm text-lavanda-light">
                {new Date(b.expires_at).toLocaleString("es-AR")}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
