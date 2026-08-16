import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { formatPrice, whatsappLink } from "@/lib/utils";
import { getWhatsapp } from "@/lib/site-config";
import { resolveTrackingUrl } from "@/lib/correo-argentino";
import type { Pedido, PedidoItem } from "@/types";
import OrderTimeline from "@/components/pedido/OrderTimeline";
import CancelOrderButton from "@/components/pedido/CancelOrderButton";
import MercadoPagoButton from "@/components/pedido/MercadoPagoButton";

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

  const whatsapp = await getWhatsapp();

  const p = pedido as Pedido & { items: PedidoItem[] };

  // Load product slugs for review links
  const productSlugs: Record<string, string> = {};
  if (p.estado === "entregado" && p.items?.length) {
    const productIds = p.items.map((i) => i.producto_id);
    const { data: productos } = await supabase
      .from("productos")
      .select("id, slug")
      .in("id", productIds);
    productos?.forEach((prod: { id: string; slug: string }) => {
      productSlugs[prod.id] = prod.slug;
    });
  }

  // Load bank config for transfers
  const { data: config } = await supabase.from("configuracion").select("*");
  const cfg: Record<string, string> = {};
  config?.forEach((c: { key: string; value: string }) => { cfg[c.key] = c.value; });

  const esTransferencia = p.metodo_pago === "transferencia";
  const puedeCancelar = p.estado === "pendiente_pago" || p.estado === "pago_confirmado";

  const tipoEnvioLabel = p.tipo_envio === "domicilio" ? "A domicilio" : p.tipo_envio === "sucursal" ? "A sucursal" : null;
  const metodoEnvioLabel =
    p.metodo_envio === "retiro"
      ? "Retiro en persona"
      : `${p.metodo_envio === "correo_argentino" ? "Correo Argentino" : "Andreani"}${tipoEnvioLabel ? ` — ${tipoEnvioLabel}` : ""}`;

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
        <p className="text-lavanda/75 mt-1 text-sm">
          Creado el {new Date(p.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Timeline */}
      <div className="bg-navy-deep rounded-xl border border-lavanda/10 p-6">
        <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider mb-4">
          Estado del pedido
        </h2>
        <OrderTimeline estado={p.estado} metodoEnvio={p.metodo_envio} metodoPago={p.metodo_pago} tieneSena={p.tiene_sena} />
      </div>

      {/* MercadoPago payment block.
          Se oculta si el pedido tiene seña: en ese caso MP cobra solo el
          anticipo, no el total, y el CTA vive en el bloque de seña de abajo.
          Mostrar los dos dejaba dos botones de pago con montos distintos. */}
      {p.metodo_pago === "mercadopago" && p.estado === "pendiente_pago" && !p.tiene_sena && (
        <div className="bg-[#009ee3]/10 border border-[#009ee3]/20 rounded-xl p-6 space-y-3">
          <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider">
            Completá tu pago
          </h2>
          <p className="text-sm text-lavanda-light">
            Tu pedido está reservado. Hacé clic en el botón para pagar con MercadoPago.
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-lavanda/75">Monto a pagar</span>
            <span className="text-[#009ee3] font-bold text-lg">{formatPrice(p.total)}</span>
          </div>
          <MercadoPagoButton pedidoId={p.id} />
        </div>
      )}

      {/* Transfer payment block — mismo motivo que arriba para el guard de seña. */}
      {esTransferencia && p.estado === "pendiente_pago" && !p.tiene_sena && (
        <div className="bg-ambar/10 border border-ambar/20 rounded-xl p-6 space-y-3">
          <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-ambar-light uppercase tracking-wider">
            Datos para transferencia
          </h2>
          <p className="text-sm text-lavanda-light">
            Transferí el monto exacto y envianos el comprobante por WhatsApp con tu número de pedido.
          </p>
          {cfg.cbu && (
            <div className="flex justify-between text-sm">
              <span className="text-lavanda/75">CBU</span>
              <span className="text-niebla font-mono">{cfg.cbu}</span>
            </div>
          )}
          {cfg.alias && (
            <div className="flex justify-between text-sm">
              <span className="text-lavanda/75">Alias</span>
              <span className="text-niebla font-mono">{cfg.alias}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-lavanda/75">Monto</span>
            <span className="text-ambar font-bold text-lg">{formatPrice(p.total)}</span>
          </div>
          <p className="text-xs text-lavanda/75">
            Tenés 48 horas para enviar el comprobante. Después el pedido se cancela automáticamente.
          </p>
          <a
            href={whatsappLink(whatsapp, `Hola! Te envío el comprobante del pedido ${p.numero_pedido} por ${formatPrice(p.total)}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            Enviar comprobante por WhatsApp
          </a>
        </div>
      )}

      {/* Tracking info */}
      {p.tracking_code && (() => {
        const trackingUrl = resolveTrackingUrl({
          tracking_url: p.tracking_url,
          metodo_envio: p.metodo_envio,
        });
        const esCorreoArg =
          !p.tracking_url && p.metodo_envio === "correo_argentino";
        return (
          <div className="bg-purpura/10 border border-purpura/20 rounded-xl p-6 space-y-2">
            <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider">
              Seguimiento de envío
            </h2>
            <p className="text-niebla font-mono text-lg font-bold">{p.tracking_code}</p>
            {trackingUrl && (
              <>
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-ambar text-sm hover:underline"
                >
                  {esCorreoArg ? "Consultar estado en Correo Argentino →" : "Seguir envío →"}
                </a>
                {esCorreoArg && (
                  <p className="text-xs text-lavanda/60 mt-1">
                    Copiá el código de arriba y pegalo en el formulario de Correo Argentino.
                  </p>
                )}
              </>
            )}
          </div>
        );
      })()}

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
                <span className="text-lavanda/75 ml-1">x{item.cantidad}</span>
                {item.opciones_seleccionadas?.length > 0 && (
                  <p className="text-xs text-lavanda/75">
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
            <span className="text-lavanda/75">Subtotal</span>
            <span className="text-lavanda-light">{formatPrice(p.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-lavanda/75">Envío ({metodoEnvioLabel})</span>
            <span className="text-lavanda-light">{p.costo_envio === 0 ? "Gratis" : formatPrice(p.costo_envio)}</span>
          </div>
          {p.recargo_mp > 0 && (
            <div className="flex justify-between">
              <span className="text-lavanda/75">Recargo MP</span>
              <span className="text-ambar">{formatPrice(p.recargo_mp)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-lavanda/10">
            <span className="text-niebla">Total</span>
            <span className="text-ambar">{formatPrice(p.total)}</span>
          </div>
        </div>

        {/* Sucursal de retiro */}
        {p.sucursal_correo_nombre && (
          <div className="border-t border-lavanda/10 pt-3 space-y-1 text-sm">
            <p className="text-lavanda/60 text-xs uppercase tracking-wider">Sucursal de retiro</p>
            <p className="text-lavanda-light">{p.sucursal_correo_nombre}</p>
          </div>
        )}

        {/* Customer info */}
        <div className="border-t border-lavanda/10 pt-3 space-y-1 text-sm">
          <p className="text-lavanda/75">{p.nombre_cliente} · {p.email}</p>
          <p className="text-lavanda/75">Pago: {metodoPagoLabel}</p>
        </div>
      </div>

      {/* Seña / Saldo (solo si el pedido tiene seña) */}
      {p.tiene_sena && p.monto_sena !== null && (() => {
        const saldo = Number(p.total) - Number(p.monto_sena);
        const senaPagada = p.sena_pagada;
        const todoPagado = senaPagada && p.saldo_pagado;
        return (
          <div
            className={`rounded-xl p-6 space-y-4 border ${
              todoPagado
                ? "bg-emerald-400/10 border-emerald-400/30"
                : senaPagada
                ? "bg-emerald-400/5 border-emerald-400/20"
                : "bg-purpura/10 border-purpura/30"
            }`}
          >
            {/* Header dinámico según el estado */}
            {todoPagado ? (
              <div className="text-center space-y-1">
                <p className="text-2xl">✅</p>
                <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-emerald-400 uppercase tracking-wider">
                  Pedido pagado en su totalidad
                </h2>
                <p className="text-xs text-lavanda/60">
                  Seña + saldo confirmados.
                </p>
              </div>
            ) : senaPagada ? (
              <div className="space-y-1">
                <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-emerald-400 uppercase tracking-wider">
                  ✓ Seña abonada · Resto a pagar al recibir
                </h2>
                <p className="text-xs text-lavanda/70">
                  Tu anticipo fue confirmado{p.sena_pagada_at ? ` el ${new Date(p.sena_pagada_at).toLocaleDateString("es-AR")}` : ""}.
                  El saldo se cobra al recibir/retirar el pedido.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider">
                  Pago en 2 partes
                </h2>
                <p className="text-xs text-lavanda/70">
                  Pagás una seña ahora y el saldo al recibir el pedido.
                </p>
              </div>
            )}

            {/* Cuando seña ya está pagada, destacamos el saldo restante con énfasis */}
            {senaPagada && !p.saldo_pagado && (
              <div className="bg-navy-deep rounded-lg p-4 text-center space-y-1">
                <p className="text-xs text-lavanda/60 uppercase tracking-wider">Resto a pagar al recibir</p>
                <p className="text-2xl font-bold text-ambar">{formatPrice(saldo)}</p>
              </div>
            )}

            {/* Desglose */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-lavanda-light">💰 Seña</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <p className={`text-base font-medium ${senaPagada ? "text-lavanda" : "text-ambar font-bold"}`}>
                    {formatPrice(Number(p.monto_sena))}
                  </p>
                  {senaPagada ? (
                    <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                      ✓ Pagada
                    </span>
                  ) : (
                    <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                      Pendiente
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-lavanda/10">
                <div>
                  <p className="text-sm text-lavanda-light">📦 Saldo al recibir/retirar</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <p className={`text-base font-medium ${p.saldo_pagado ? "text-lavanda" : "text-niebla font-bold"}`}>
                    {formatPrice(saldo)}
                  </p>
                  {p.saldo_pagado && (
                    <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                      ✓ Pagado
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cómo pagar la seña — se elige acá y no en el checkout, así el
                cliente puede cambiar de idea sin rehacer el pedido. */}
            {!senaPagada && p.estado === "pendiente_pago" && (
              <div className="space-y-3 pt-2 border-t border-lavanda/10">
                <p className="text-xs text-lavanda/75">
                  Pagá la seña por MercadoPago o por transferencia. Apenas se
                  acredite, tu pedido pasa a producción.
                </p>

                <MercadoPagoButton pedidoId={p.id} />

                {(cfg.cbu || cfg.alias) && (
                  <div className="bg-navy-deep rounded-lg p-4 space-y-2">
                    <p className="text-xs text-ambar-light font-semibold uppercase tracking-wider">
                      O transferí {formatPrice(Number(p.monto_sena))}
                    </p>
                    {cfg.cbu && (
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="text-lavanda/75">CBU</span>
                        <span className="text-niebla font-mono break-all">{cfg.cbu}</span>
                      </div>
                    )}
                    {cfg.alias && (
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="text-lavanda/75">Alias</span>
                        <span className="text-niebla font-mono break-all">{cfg.alias}</span>
                      </div>
                    )}
                    <p className="text-xs text-lavanda/60">
                      Mandanos el comprobante por WhatsApp con tu número de
                      pedido ({p.numero_pedido}) y lo confirmamos a mano.
                    </p>
                  </div>
                )}

                <p className="text-xs text-lavanda/50">
                  Si la seña no se paga en 48 horas, el pedido se cancela solo.
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Review CTA — solo para pedidos entregados */}
      {p.estado === "entregado" && p.items && p.items.length > 0 && (
        <div className="bg-purpura/10 border border-purpura/20 rounded-xl p-6 text-center space-y-3">
          <div className="text-2xl">⭐</div>
          <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider">
            ¿Qué te pareció tu compra?
          </h2>
          <p className="text-sm text-lavanda-light">
            Tu opinión nos ayuda a mejorar y ayuda a otros compradores. Dejá una reseña en los productos que recibiste.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {p.items.map((item) => {
              const slug = productSlugs[item.producto_id];
              if (!slug) return null;
              return (
                <Link
                  key={item.id}
                  href={`/producto/${slug}`}
                  className="px-4 py-2 bg-purpura/20 hover:bg-purpura/30 text-purpura text-sm font-medium rounded-lg transition-colors"
                >
                  Reseñar &quot;{item.nombre_producto}&quot;
                </Link>
              );
            })}
          </div>
        </div>
      )}

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
            <CancelOrderButton pedidoId={p.id} email={p.email} />
          </div>
        )}

        <p className="text-xs text-lavanda/75">
          Te enviamos un resumen a <span className="text-lavanda/75">{p.email}</span>.
          Si no lo ves, revisá tu carpeta de spam.
        </p>
        <p className="text-xs text-lavanda/75">
          ¿Dudas? Escribinos por{" "}
          <a href={whatsappLink(whatsapp, `Hola, tengo una consulta sobre el pedido ${p.numero_pedido}`)} className="text-ambar hover:underline" target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
}
