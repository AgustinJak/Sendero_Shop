import { createServiceRoleClient } from "@/lib/supabase-server";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import type { EstadoPedido } from "@/types";

const ESTADO_LABELS: Record<EstadoPedido, string> = {
  pendiente_pago: "Pendiente de pago",
  pago_confirmado: "Pago confirmado",
  en_produccion: "En producción",
  impreso: "Impreso",
  enviado: "Enviado",
  esperando_retiro: "Esperando retiro",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

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

export default async function AdminDashboard() {
  const supabase = await createServiceRoleClient();

  const [
    { count: totalPedidos },
    { count: pedidosPendientes },
    { data: pedidosRecientes },
    { count: totalProductos },
    { data: ventasData },
  ] = await Promise.all([
    supabase.from("pedidos").select("*", { count: "exact", head: true }),
    supabase.from("pedidos").select("*", { count: "exact", head: true }).eq("estado", "pendiente_pago"),
    supabase
      .from("pedidos")
      .select("id, numero_pedido, nombre_cliente, estado, total, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("productos").select("*", { count: "exact", head: true }).eq("activo", true),
    supabase
      .from("pedidos")
      .select("total")
      .not("estado", "eq", "cancelado"),
  ]);

  const totalVentas = ventasData?.reduce((sum, p) => sum + (p.total || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
        Dashboard
      </h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total pedidos" value={String(totalPedidos || 0)} />
        <StatCard label="Pendientes de pago" value={String(pedidosPendientes || 0)} accent />
        <StatCard label="Productos activos" value={String(totalProductos || 0)} />
        <StatCard label="Ventas totales" value={formatPrice(totalVentas)} />
      </div>

      {/* Recent orders */}
      <div className="bg-navy rounded-xl border border-lavanda/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-lavanda/10 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-niebla">Últimos pedidos</h2>
          <Link href="/admin/pedidos" className="text-xs text-ambar hover:text-ambar-light transition-colors">
            Ver todos →
          </Link>
        </div>
        {pedidosRecientes && pedidosRecientes.length > 0 ? (
          <div className="divide-y divide-lavanda/5">
            {pedidosRecientes.map((pedido) => (
              <Link
                key={pedido.id}
                href={`/admin/pedidos/${pedido.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-lavanda/5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-mono text-ambar">{pedido.numero_pedido}</span>
                  <span className="text-sm text-lavanda-light truncate">{pedido.nombre_cliente}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[pedido.estado as EstadoPedido]}`}>
                    {ESTADO_LABELS[pedido.estado as EstadoPedido]}
                  </span>
                  <span className="text-sm text-niebla font-medium">{formatPrice(pedido.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="p-4 text-sm text-lavanda/40">No hay pedidos todavía</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-navy rounded-xl border border-lavanda/10 p-4">
      <p className="text-xs text-lavanda/60 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? "text-ambar" : "text-niebla"}`}>{value}</p>
    </div>
  );
}
