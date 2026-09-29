import { createServiceRoleClient } from "@/lib/supabase-server";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import type { EstadoPedido, MetodoPago } from "@/types";
import { getEstadoLabel } from "@/lib/estado-labels";
import {
  Busquedas,
  Cobranza,
  Embudo,
  GraficoDiario,
  Hoy,
  Origenes,
  Productos,
  SelectorPeriodo,
  type DatosPanel,
} from "@/components/admin/PanelAnalitica";

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

const PERIODOS = [7, 30, 90];

/**
 * Dashboard del admin: analítica propia de la tienda (SHOP - Analítica
 * propia). Todos los números salen de la función `panel_analitica` de la
 * base; "Hoy" es siempre el día en curso y el resto, el período elegido.
 */
export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const dias = PERIODOS.includes(Number(p)) ? Number(p) : 30;
  const supabase = await createServiceRoleClient();

  const [{ data: panel, error }, { data: pedidosRecientes }] = await Promise.all([
    supabase.rpc("panel_analitica", { p_dias: dias }),
    supabase
      .from("pedidos")
      .select("id, numero_pedido, nombre_cliente, estado, total, created_at, metodo_pago")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (error) console.error("[dashboard] panel_analitica:", error.message);
  const datos = panel as DatosPanel | null;

  const [a, m, d] = (datos?.medicion_desde ?? "").split("-");
  const medicionReciente = datos?.medicion_desde && datos.medicion_desde > datos.desde;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">Dashboard</h1>
        <SelectorPeriodo dias={dias} />
      </div>

      {!datos ? (
        <p className="text-sm text-red-400">No se pudieron cargar los números. Probá recargar la página.</p>
      ) : (
        <>
          {(!datos.medicion_desde || medicionReciente) && (
            <p className="text-xs text-lavanda/60 bg-lavanda/5 border border-lavanda/10 rounded-lg px-3 py-2">
              {datos.medicion_desde
                ? `Las visitas se miden desde el ${d}/${m}/${a}: antes de esa fecha solo hay datos de pedidos.`
                : "Todavía no hay visitas medidas: los números de visitas aparecen con las primeras visitas a la tienda."}
            </p>
          )}

          <Hoy hoy={datos.hoy} />
          <Cobranza cobranza={datos.cobranza} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <GraficoDiario diario={datos.diario} />
            </div>
            <Embudo embudo={datos.embudo} dispositivos={datos.dispositivos} />
          </div>

          <Productos productos={datos.productos} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Origenes origenes={datos.origenes} campanias={datos.campanias} />
            <Busquedas busquedas={datos.busquedas} />
          </div>
        </>
      )}

      {/* Últimos pedidos */}
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
                    {getEstadoLabel(pedido.estado as EstadoPedido, pedido.metodo_pago as MetodoPago)}
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
