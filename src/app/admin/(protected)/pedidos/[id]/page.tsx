import { createServiceRoleClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import type { Pedido, PedidoItem, EstadoPedido } from "@/types";
import PedidoActions from "@/components/admin/PedidoActions";

interface Props {
  params: Promise<{ id: string }>;
}

const ESTADO_LABELS: Record<EstadoPedido, string> = {
  pendiente_pago: "Pendiente de pago",
  pago_confirmado: "Pago confirmado",
  en_produccion: "En producción",
  impreso: "Impreso",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export default async function PedidoDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServiceRoleClient();

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("*, items:pedido_items(*)")
    .eq("id", id)
    .single();

  if (!pedido) notFound();

  const p = pedido as Pedido & { items: PedidoItem[] };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
            Pedido {p.numero_pedido}
          </h1>
          <p className="text-sm text-lavanda/60">
            {new Date(p.created_at).toLocaleString("es-AR")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <div className="bg-navy rounded-xl border border-lavanda/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-lavanda/10">
              <h2 className="text-sm font-semibold text-niebla">Productos</h2>
            </div>
            <div className="divide-y divide-lavanda/5">
              {p.items?.map((item) => (
                <div key={item.id} className="px-4 py-3 flex justify-between">
                  <div>
                    <p className="text-sm text-lavanda-light">{item.nombre_producto}</p>
                    {item.opciones_seleccionadas?.length > 0 && (
                      <p className="text-xs text-lavanda/40 mt-0.5">
                        {item.opciones_seleccionadas.map((o) => `${o.grupo_nombre}: ${o.opcion_valor}`).join(" · ")}
                      </p>
                    )}
                    <p className="text-xs text-lavanda/40">
                      {formatPrice(item.precio_unitario)} x {item.cantidad}
                    </p>
                  </div>
                  <span className="text-sm text-niebla font-medium">{formatPrice(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-lavanda/10 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-lavanda/60">Subtotal</span>
                <span className="text-lavanda-light">{formatPrice(p.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-lavanda/60">
                  Envío ({p.metodo_envio === "retiro" ? "Retiro" : p.metodo_envio === "correo_argentino" ? "Correo Argentino" : "Andreani"})
                </span>
                <span className="text-lavanda-light">{p.costo_envio === 0 ? "Gratis" : formatPrice(p.costo_envio)}</span>
              </div>
              {p.recargo_mp > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-lavanda/60">Recargo MP</span>
                  <span className="text-ambar">{formatPrice(p.recargo_mp)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-lavanda/10">
                <span className="text-niebla">Total</span>
                <span className="text-ambar">{formatPrice(p.total)}</span>
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-niebla">Cliente</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-lavanda/60">Nombre</span>
                <p className="text-lavanda-light">{p.nombre_cliente}</p>
              </div>
              <div>
                <span className="text-lavanda/60">DNI</span>
                <p className="text-lavanda-light">{p.dni}</p>
              </div>
              <div>
                <span className="text-lavanda/60">Email</span>
                <p className="text-lavanda-light">{p.email}</p>
              </div>
              <div>
                <span className="text-lavanda/60">Teléfono</span>
                <p className="text-lavanda-light">{p.telefono}</p>
              </div>
            </div>
          </div>

          {/* Dirección */}
          {p.direccion_envio && (
            <div className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-2">
              <h2 className="text-sm font-semibold text-niebla">Dirección de envío</h2>
              <p className="text-sm text-lavanda-light">
                {p.direccion_envio.calle} {p.direccion_envio.numero}
                {p.direccion_envio.piso && `, Piso ${p.direccion_envio.piso}`}
                {p.direccion_envio.departamento && ` Depto ${p.direccion_envio.departamento}`}
              </p>
              <p className="text-sm text-lavanda/60">
                {p.direccion_envio.localidad}, {p.direccion_envio.provincia} - CP {p.direccion_envio.codigo_postal}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-4">
          <PedidoActions pedido={p} />
        </div>
      </div>
    </div>
  );
}
