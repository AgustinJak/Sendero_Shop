import { createServiceRoleClient } from "@/lib/supabase-server";
import { formatPrice } from "@/lib/utils";
import { calculateSubtotal, calculateDescuento } from "@/lib/borrador";
import Link from "next/link";
import type { EstadoBorrador, PedidoBorrador } from "@/types";

const ESTADO_LABELS: Record<EstadoBorrador, string> = {
  pendiente: "Pendiente",
  convertido: "Convertido",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

const ESTADO_COLORS: Record<EstadoBorrador, string> = {
  pendiente: "text-yellow-400 bg-yellow-400/10",
  convertido: "text-emerald-400 bg-emerald-400/10",
  expirado: "text-lavanda/60 bg-lavanda/5",
  cancelado: "text-red-400 bg-red-400/10",
};

interface Props {
  searchParams: Promise<{ estado?: string }>;
}

export default async function BorradoresPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createServiceRoleClient();

  let query = supabase
    .from("pedidos_borrador")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.estado) {
    query = query.eq("estado", params.estado);
  }

  const { data: borradores } = await query;

  const filtros: Array<{ value: string; label: string }> = [
    { value: "", label: "Todos" },
    { value: "pendiente", label: "Pendientes" },
    { value: "convertido", label: "Convertidos" },
    { value: "expirado", label: "Expirados" },
    { value: "cancelado", label: "Cancelados" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
          Borradores
        </h1>
        <Link
          href="/admin/borradores/nuevo"
          className="px-4 py-2 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-medium rounded-lg transition-colors"
        >
          + Nuevo borrador
        </Link>
      </div>

      <p className="text-sm text-lavanda/60 max-w-3xl">
        Pedidos custom que generás manualmente para compartir un link al cliente.
        Útil para mayoristas, ofertas personalizadas, o productos que no querés publicar.
      </p>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {filtros.map((f) => {
          const isActive = (params.estado || "") === f.value;
          const href = f.value
            ? `/admin/borradores?estado=${f.value}`
            : "/admin/borradores";
          return (
            <Link
              key={f.value}
              href={href}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                isActive
                  ? "bg-purpura/30 text-ambar"
                  : "bg-lavanda/5 text-lavanda hover:bg-lavanda/10"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="bg-navy rounded-xl border border-lavanda/10 overflow-hidden">
        {borradores && borradores.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-lavanda/10 text-lavanda/60 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Notas</th>
                  <th className="text-left px-4 py-3">Items</th>
                  <th className="text-right px-4 py-3">Total estimado</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-right px-4 py-3">Expira</th>
                  <th className="text-right px-4 py-3">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lavanda/5">
                {(borradores as PedidoBorrador[]).map((b) => {
                  const subtotal = calculateSubtotal(b.items);
                  const descuento = calculateDescuento(
                    subtotal,
                    Number(b.descuento_monto),
                    Number(b.descuento_porcentaje)
                  );
                  const totalEstimado = subtotal - descuento;
                  return (
                    <tr key={b.id} className="hover:bg-lavanda/5 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/borradores/${b.id}`}
                          className="text-ambar hover:text-ambar-light"
                        >
                          {b.notas_admin || <span className="italic text-lavanda/40">sin notas</span>}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-lavanda-light">
                        {b.items.length} item{b.items.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-4 py-3 text-right text-niebla font-medium">
                        {formatPrice(totalEstimado)}
                        <div className="text-xs text-lavanda/40 font-normal">
                          + envío
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[b.estado]}`}>
                          {ESTADO_LABELS[b.estado]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-lavanda/60 text-xs">
                        {b.estado === "pendiente"
                          ? new Date(b.expires_at).toLocaleString("es-AR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-lavanda/60 text-xs">
                        {new Date(b.created_at).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-lavanda/60 text-sm mb-4">
              {params.estado
                ? `No hay borradores en estado "${params.estado}"`
                : "Todavía no hiciste ningún borrador"}
            </p>
            <Link
              href="/admin/borradores/nuevo"
              className="inline-block px-4 py-2 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-medium rounded-lg transition-colors"
            >
              Crear el primero
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
