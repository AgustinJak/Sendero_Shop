import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { ORIGENES, type Origen } from "@/lib/origen";

/**
 * Secciones del dashboard del admin con la analítica propia
 * (función `panel_analitica` de la base, SHOP - Analítica propia).
 *
 * Con pocas ventas por mes, un porcentaje engaña: se muestran cantidades, y
 * los porcentajes solo cuando la base es suficiente.
 */

export interface DatosPanel {
  desde: string;
  hasta: string;
  medicion_desde: string | null;
  hoy: {
    visitantes: number;
    productos_vistos: number;
    carritos: number;
    checkouts: number;
    whatsapp: number;
    pedidos: number;
    pagados: number;
    cobrado: number;
  };
  diario: { dia: string; visitantes: number; pedidos: number; pagados: number }[];
  embudo: {
    visitantes: number;
    vieron_producto: number;
    carrito: number;
    checkout: number;
    pedidos: number;
    pagados: number;
  };
  productos: {
    id: string;
    nombre: string;
    slug: string | null;
    vistas: number;
    carritos: number;
    whatsapp: number;
    unidades: number;
    ingresos: number;
  }[];
  origenes: { origen: string; visitantes: number; pedidos: number; pagados: number; ingresos: number }[];
  campanias: { campania: string; visitantes: number; pedidos: number; pagados: number; ingresos: number }[];
  busquedas: { termino: string; veces: number; resultados: number | null }[];
  dispositivos: Record<string, number>;
  cobranza: { pendientes: number; monto_pendiente: number; creados: number; pagados: number; cobrado: number };
}

const n = (v: number) => v.toLocaleString("es-AR");
const fecha = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};
const nombreOrigen = (o: string) => ORIGENES[o as Origen] ?? o;

/** Porcentaje solo si la base alcanza para que signifique algo. */
function porcentaje(parte: number, total: number, minimo = 20): string | null {
  if (total < minimo) return null;
  return `${Math.round((parte / total) * 100)}%`;
}

function Tarjeta({ titulo, children, className = "" }: { titulo?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-navy rounded-xl border border-lavanda/10 ${className}`}>
      {titulo && (
        <h2 className="px-4 py-3 border-b border-lavanda/10 text-sm font-semibold text-niebla">{titulo}</h2>
      )}
      {children}
    </section>
  );
}

function Numero({ etiqueta, valor, acento, detalle }: { etiqueta: string; valor: string; acento?: boolean; detalle?: string }) {
  return (
    <div className="bg-navy rounded-xl border border-lavanda/10 p-4">
      <p className="text-xs text-lavanda/60 uppercase tracking-wider">{etiqueta}</p>
      <p className={`text-2xl font-bold mt-1 ${acento ? "text-ambar" : "text-niebla"}`}>{valor}</p>
      {detalle && <p className="text-xs text-lavanda/50 mt-1">{detalle}</p>}
    </div>
  );
}

export function SelectorPeriodo({ dias }: { dias: number }) {
  return (
    <div className="flex gap-1 bg-navy rounded-lg border border-lavanda/10 p-1 text-xs">
      {[7, 30, 90].map((d) => (
        <Link
          key={d}
          href={`/admin?p=${d}`}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            d === dias ? "bg-ambar/15 text-ambar font-semibold" : "text-lavanda/70 hover:text-niebla"
          }`}
        >
          {d} días
        </Link>
      ))}
    </div>
  );
}

export function Hoy({ hoy }: { hoy: DatosPanel["hoy"] }) {
  return (
    <div>
      <h2 className="text-xs text-lavanda/60 uppercase tracking-wider mb-2">Hoy</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Numero etiqueta="Visitantes" valor={n(hoy.visitantes)} />
        <Numero etiqueta="Vieron productos" valor={n(hoy.productos_vistos)} />
        <Numero etiqueta="Carritos" valor={n(hoy.carritos)} />
        <Numero etiqueta="WhatsApp" valor={n(hoy.whatsapp)} detalle="clics en el botón" />
        <Numero
          etiqueta="Pedidos"
          valor={n(hoy.pedidos)}
          detalle={`${n(hoy.pagados)} ${hoy.pagados === 1 ? "pagado" : "pagados"}`}
        />
        <Numero etiqueta="Cobrado hoy" valor={formatPrice(hoy.cobrado)} acento />
      </div>
    </div>
  );
}

export function GraficoDiario({ diario }: { diario: DatosPanel["diario"] }) {
  const maximo = Math.max(1, ...diario.map((d) => d.visitantes));
  const total = diario.reduce((s, d) => s + d.visitantes, 0);
  return (
    <Tarjeta titulo="Visitantes por día">
      <div className="p-4">
        {total === 0 ? (
          <p className="text-sm text-lavanda/40">Todavía no hay visitas medidas en este período.</p>
        ) : (
          <>
            <div className="flex items-end gap-px h-32">
              {diario.map((d) => (
                <div
                  key={d.dia}
                  className="flex-1 h-full flex flex-col justify-end"
                  title={`${fecha(d.dia)}: ${d.visitantes} visitantes, ${d.pedidos} pedidos, ${d.pagados} pagados`}
                >
                  <div
                    className="bg-lavanda/40 hover:bg-lavanda/70 rounded-t-sm transition-colors"
                    style={{ height: `${(d.visitantes / maximo) * 100}%`, minHeight: d.visitantes ? 2 : 0 }}
                  />
                </div>
              ))}
            </div>
            {/* Un punto por día con pedidos: el tamaño no importa, el día sí. */}
            <div className="flex gap-px mt-1 h-2">
              {diario.map((d) => (
                <div key={d.dia} className="flex-1 flex justify-center">
                  {d.pedidos > 0 && <span className="w-1.5 h-1.5 rounded-full bg-ambar" />}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-lavanda/50 mt-1">
              <span>{fecha(diario[0].dia)}</span>
              <span>
                máx. {n(maximo)} por día · <span className="text-ambar">●</span> días con pedidos
              </span>
              <span>{fecha(diario[diario.length - 1].dia)}</span>
            </div>
          </>
        )}
      </div>
    </Tarjeta>
  );
}

export function Embudo({ embudo, dispositivos }: { embudo: DatosPanel["embudo"]; dispositivos: DatosPanel["dispositivos"] }) {
  const pasos = [
    { etiqueta: "Entraron a la tienda", valor: embudo.visitantes },
    { etiqueta: "Vieron un producto", valor: embudo.vieron_producto },
    { etiqueta: "Agregaron al carrito", valor: embudo.carrito },
    { etiqueta: "Empezaron el checkout", valor: embudo.checkout },
    { etiqueta: "Hicieron el pedido", valor: embudo.pedidos },
    { etiqueta: "Pagaron", valor: embudo.pagados },
  ];
  const base = Math.max(1, embudo.visitantes, embudo.pedidos, embudo.pagados);
  const totalDisp = Object.values(dispositivos).reduce((s, v) => s + v, 0);
  return (
    <Tarjeta titulo="Embudo">
      <div className="p-4 space-y-2.5">
        {pasos.map((p, i) => {
          const anterior = i > 0 ? pasos[i - 1].valor : 0;
          const pct = i > 0 ? porcentaje(p.valor, anterior, 10) : null;
          return (
            <div key={p.etiqueta}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-lavanda-light">{p.etiqueta}</span>
                <span className="text-niebla font-medium">
                  {n(p.valor)}
                  {pct && <span className="text-lavanda/50 font-normal"> · {pct} del paso anterior</span>}
                </span>
              </div>
              <div className="h-2 bg-lavanda/10 rounded-full overflow-hidden">
                <div className="h-full bg-ambar/70 rounded-full" style={{ width: `${(p.valor / base) * 100}%` }} />
              </div>
            </div>
          );
        })}
        <p className="text-[11px] text-lavanda/50 pt-1">
          Personas por día, sumadas en el período.
          {totalDisp > 0 &&
            ` Desde el celular: ${Math.round(((dispositivos.celular ?? 0) / totalDisp) * 100)}%.`}
        </p>
      </div>
    </Tarjeta>
  );
}

export function Productos({ productos }: { productos: DatosPanel["productos"] }) {
  return (
    <Tarjeta titulo="Productos">
      {productos.length === 0 ? (
        <p className="p-4 text-sm text-lavanda/40">Sin movimiento en este período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-lavanda/60 text-left">
                <th className="px-4 py-2 font-medium">Producto</th>
                <th className="px-2 py-2 font-medium text-right">Lo vieron</th>
                <th className="px-2 py-2 font-medium text-right">Carrito</th>
                <th className="px-2 py-2 font-medium text-right">WhatsApp</th>
                <th className="px-2 py-2 font-medium text-right">Vendidos</th>
                <th className="px-4 py-2 font-medium text-right">Ingresos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lavanda/5">
              {productos.map((p) => {
                const interesSinVenta = p.vistas >= 10 && p.unidades === 0;
                return (
                  <tr key={p.id} className="hover:bg-lavanda/5">
                    <td className="px-4 py-2">
                      {p.slug ? (
                        <Link href={`/producto/${p.slug}`} target="_blank" className="text-lavanda-light hover:text-ambar">
                          {p.nombre}
                        </Link>
                      ) : (
                        <span className="text-lavanda/50">{p.nombre}</span>
                      )}
                      {interesSinVenta && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400">
                          interés sin ventas
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right text-niebla">{n(p.vistas)}</td>
                    <td className="px-2 py-2 text-right text-niebla">{n(p.carritos)}</td>
                    <td className="px-2 py-2 text-right text-niebla">{n(p.whatsapp)}</td>
                    <td className="px-2 py-2 text-right text-niebla">{n(p.unidades)}</td>
                    <td className="px-4 py-2 text-right text-niebla">{formatPrice(p.ingresos)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Tarjeta>
  );
}

function TablaCanales({
  filas,
  columnaNombre,
}: {
  filas: { nombre: string; visitantes: number; pedidos: number; pagados: number; ingresos: number }[];
  columnaNombre: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-lavanda/60 text-left">
            <th className="px-4 py-2 font-medium">{columnaNombre}</th>
            <th className="px-2 py-2 font-medium text-right">Visitantes</th>
            <th className="px-2 py-2 font-medium text-right">Pedidos</th>
            <th className="px-2 py-2 font-medium text-right">Pagados</th>
            <th className="px-4 py-2 font-medium text-right">Ingresos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-lavanda/5">
          {filas.map((f) => (
            <tr key={f.nombre} className="hover:bg-lavanda/5">
              <td className="px-4 py-2 text-lavanda-light">{f.nombre}</td>
              <td className="px-2 py-2 text-right text-niebla">{n(f.visitantes)}</td>
              <td className="px-2 py-2 text-right text-niebla">{n(f.pedidos)}</td>
              <td className="px-2 py-2 text-right text-niebla">{n(f.pagados)}</td>
              <td className="px-4 py-2 text-right text-niebla">{formatPrice(f.ingresos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Origenes({ origenes, campanias }: { origenes: DatosPanel["origenes"]; campanias: DatosPanel["campanias"] }) {
  return (
    <Tarjeta titulo="De dónde llegan">
      {origenes.length === 0 ? (
        <p className="p-4 text-sm text-lavanda/40">Sin datos en este período.</p>
      ) : (
        <TablaCanales
          columnaNombre="Origen"
          filas={origenes.map((o) => ({ ...o, nombre: nombreOrigen(o.origen) }))}
        />
      )}
      {campanias.length > 0 && (
        <div className="border-t border-lavanda/10">
          <p className="px-4 pt-3 text-xs text-lavanda/60 uppercase tracking-wider">Campañas (utm_campaign)</p>
          <TablaCanales columnaNombre="Campaña" filas={campanias.map((c) => ({ ...c, nombre: c.campania }))} />
        </div>
      )}
      <p className="px-4 py-3 text-[11px] text-lavanda/50 border-t border-lavanda/10">
        Para que un anuncio aparezca como anuncio y no como Facebook o Instagram, su link tiene que llevar{" "}
        <code className="text-lavanda-light">?utm_source=meta&amp;utm_medium=paid&amp;utm_campaign=nombre</code>.
      </p>
    </Tarjeta>
  );
}

export function Busquedas({ busquedas }: { busquedas: DatosPanel["busquedas"] }) {
  const sinResultados = busquedas.filter((b) => b.resultados === 0);
  return (
    <Tarjeta titulo="Qué buscan">
      {busquedas.length === 0 ? (
        <p className="p-4 text-sm text-lavanda/40">Nadie usó el buscador en este período.</p>
      ) : (
        <div className="p-4 space-y-4">
          {sinResultados.length > 0 && (
            <div>
              <p className="text-xs text-yellow-400 mb-2">Buscaron y no encontraron nada:</p>
              <div className="flex flex-wrap gap-1.5">
                {sinResultados.map((b) => (
                  <span key={b.termino} className="text-xs px-2 py-1 rounded-full bg-yellow-400/10 text-yellow-400">
                    {b.termino} {b.veces > 1 && `×${b.veces}`}
                  </span>
                ))}
              </div>
            </div>
          )}
          <ul className="space-y-1">
            {busquedas.map((b) => (
              <li key={b.termino} className="flex justify-between text-sm">
                <span className="text-lavanda-light">{b.termino}</span>
                <span className="text-lavanda/60">
                  {n(b.veces)} {b.veces === 1 ? "vez" : "veces"} · {n(b.resultados ?? 0)} resultados
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Tarjeta>
  );
}

export function Cobranza({ cobranza }: { cobranza: DatosPanel["cobranza"] }) {
  const pctPago = porcentaje(cobranza.pagados, cobranza.creados, 10);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Numero
        etiqueta="Por cobrar"
        valor={formatPrice(cobranza.monto_pendiente)}
        acento={cobranza.pendientes > 0}
        detalle={`${n(cobranza.pendientes)} ${cobranza.pendientes === 1 ? "pedido esperando" : "pedidos esperando"} el pago`}
      />
      <Numero
        etiqueta="Pedidos del período"
        valor={`${n(cobranza.pagados)} de ${n(cobranza.creados)}`}
        detalle={pctPago ? `se pagaron (${pctPago})` : "se pagaron"}
      />
      <Numero etiqueta="Cobrado en el período" valor={formatPrice(cobranza.cobrado)} acento />
    </div>
  );
}
