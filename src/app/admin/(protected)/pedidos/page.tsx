import { createServiceRoleClient } from "@/lib/supabase-server";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import type { EstadoPedido, MetodoPago } from "@/types";
import PedidoFilters from "@/components/admin/PedidoFilters";
import { getEstadoLabel } from "@/lib/estado-labels";

const ESTADO_COLORS: Record<EstadoPedido, string> = {
  pendiente_pago: "text-yellow-400 bg-yellow-400/10",
  pago_confirmado: "text-green-400 bg-green-400/10",
  en_produccion: "text-blue-400 bg-blue-400/10",
  impreso: "text-purple-400 bg-purple-400/10",
  enviado: "text-cyan-400 bg-cyan-400/10",
  esperando_retiro: "text-orange-400 bg-orange-400/10",
  entregado: "text-emerald-400 bg-emerald-400/10",
  cancelado: "text-red-400 bg-red-400/10",
};

interface Props {
  searchParams: Promise<{ estado?: string; buscar?: string }>;
}

export default async function PedidosPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createServiceRoleClient();

  let query = supabase
    .from("pedidos")
    .select("id, numero_pedido, nombre_cliente, email, estado, metodo_pago, metodo_envio, total, created_at")
    .order("created_at", { ascending: false });

  if (params.estado) {
    query = query.eq("estado", params.estado);
  }

  if (params.buscar) {
    query = query.or(
      `numero_pedido.ilike.%${params.buscar}%,nombre_cliente.ilike.%${params.buscar}%,email.ilike.%${params.buscar}%`
    );
  }

  const { data: pedidos } = await query;

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
        Pedidos
      </h1>

      <PedidoFilters currentEstado={params.estado} currentBuscar={params.buscar} />

      <div className="bg-navy rounded-xl border border-lavanda/10 overflow-hidden">
        {pedidos && pedidos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-lavanda/10 text-lavanda/60 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Pedido</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Pago</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lavanda/5">
                {pedidos.map((p) => (
                  <tr key={p.id} className="hover:bg-lavanda/5 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/pedidos/${p.id}`} className="text-ambar hover:text-ambar-light font-mono">
                        {p.numero_pedido}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-lavanda-light">{p.nombre_cliente}</div>
                      <div className="text-lavanda/40 text-xs">{p.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[p.estado as EstadoPedido]}`}>
                        {getEstadoLabel(p.estado as EstadoPedido, p.metodo_pago as MetodoPago)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-lavanda-light capitalize">
                      {p.metodo_pago === "mercadopago" ? "MercadoPago" : p.metodo_pago}
                    </td>
                    <td className="px-4 py-3 text-right text-niebla font-medium">
                      {formatPrice(p.total)}
                    </td>
                    <td className="px-4 py-3 text-right text-lavanda/60">
                      {new Date(p.created_at).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-8 text-center text-lavanda/40">No se encontraron pedidos</p>
        )}
      </div>
    </div>
  );
}
