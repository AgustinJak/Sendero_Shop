import { createServiceRoleClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { MayoristaLista, MayoristaSeccion, MayoristaItem, MayoristaTramo, MayoristaKit } from "@/types";
import { getWhatsapp } from "@/lib/site-config";
import { calcularKit } from "@/lib/mayorista";
import { formatPrice } from "@/lib/utils";
import MayoristaItemCard from "@/components/mayorista/MayoristaItemCard";
import KitsScrollButton from "@/components/mayorista/KitsScrollButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ codigo: string }>;
}): Promise<Metadata> {
  const { codigo } = await params;
  return {
    title: `Lista Mayorista — Sendero 3D`,
    description: `Lista de precios mayorista de Sendero 3D. Código: ${codigo}`,
    robots: "noindex",
  };
}

function formatFecha(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function MayoristaPublicPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const [db, whatsapp] = await Promise.all([
    createServiceRoleClient(),
    getWhatsapp(),
  ]);

  const { data: listaRaw } = await db
    .from("mayorista_listas")
    .select(`
      *,
      secciones:mayorista_secciones(
        *,
        items:mayorista_items(
          *,
          imagenes:mayorista_imagenes(*)
        )
      ),
      kits:mayorista_kits(
        *,
        items:mayorista_kit_items(
          *,
          item:mayorista_items(*, imagenes:mayorista_imagenes(*))
        )
      )
    `)
    .eq("codigo", codigo)
    .eq("activa", true)
    .single();

  if (!listaRaw) notFound();
  const lista = listaRaw as MayoristaLista;

  const secciones: MayoristaSeccion[] = ((lista.secciones ?? []) as MayoristaSeccion[])
    .sort((a, b) => a.orden - b.orden)
    .map((s) => ({
      ...s,
      items: (s.items ?? []).sort((a: MayoristaItem, b: MayoristaItem) => a.orden - b.orden),
    }));

  const totalItems = secciones.reduce((acc, s) => acc + (s.items?.length ?? 0), 0);
  const tramos: MayoristaTramo[] = (lista.descuento_tramos ?? [])
    .filter((t) => t.min > 0 && t.pct > 0)
    .sort((a, b) => a.min - b.min);

  const kits: MayoristaKit[] = ((lista.kits ?? []) as MayoristaKit[])
    .filter((k) => (k.items ?? []).length > 0)
    .sort((a, b) => a.orden - b.orden);

  const waHref = `https://wa.me/${whatsapp}?text=${encodeURIComponent(
    `Hola! Quiero un presupuesto mayorista de la lista "${lista.nombre}".`
  )}`;

  return (
    <div className="min-h-screen bg-[#1C2541]">
      {/* Header */}
      <header className="bg-[#0F1729] border-b border-[#8B85B2]/10">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-[#8B85B2]/50 mb-1">
              Lista de Precios Mayorista
            </p>
            <h1 className="text-[#E8E6F0] text-xl font-bold truncate" style={{ fontFamily: "var(--font-cinzel, serif)" }}>
              Sendero 3D
            </h1>
          </div>
          <div className="text-right text-xs text-[#8B85B2]/40 space-y-0.5 shrink-0">
            <p>{totalItems} productos</p>
            {lista.validez_hasta && <p>Válida hasta {formatFecha(lista.validez_hasta)}</p>}
          </div>
        </div>
      </header>

      {/* Banner B2B: tramos + MOQ + disclaimer */}
      <div className="bg-[#0F1729]/60 border-b border-[#8B85B2]/10">
        <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
          {tramos.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-[#8B85B2]/50 mb-2">
                Llevando más, pagás menos
              </p>
              <div className="flex flex-wrap gap-2">
                {tramos.map((t) => (
                  <span
                    key={t.min}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4A853]/10 border border-[#D4A853]/25"
                  >
                    <span className="text-sm text-[#B8B3D1]">Desde {t.min}u</span>
                    <span className="text-sm font-bold text-[#D4A853]">{t.pct}% OFF</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {kits.length > 0 && <KitsScrollButton />}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {lista.moq != null && (
              <span className="text-[#B8B3D1]">
                Pedido mínimo:{" "}
                <span className="text-[#E8E6F0] font-semibold">{lista.moq} unidades</span>
              </span>
            )}
            <span className="text-[#8B85B2]/50 text-xs">
              Precios mayoristas sujetos a modificación sin previo aviso
              {lista.validez_hasta ? ` · vigentes hasta el ${formatFecha(lista.validez_hasta)}` : ""}.
            </span>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        {secciones.length === 0 && (
          <p className="text-center text-[#8B85B2]/40 py-20">Esta lista está vacía</p>
        )}

        {secciones.map((seccion) => {
          const items = seccion.items ?? [];
          if (items.length === 0) return null;

          return (
            <section key={seccion.id}>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-[#8B85B2]/15" />
                <h2 className="text-[#B8B3D1] text-xs uppercase tracking-widest font-semibold px-2">
                  {seccion.titulo}
                </h2>
                <div className="h-px flex-1 bg-[#8B85B2]/15" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-start">
                {items.map((item: MayoristaItem) => (
                  <MayoristaItemCard key={item.id} item={item} tramos={tramos} />
                ))}
              </div>
            </section>
          );
        })}

        {/* Kits / combos */}
        {kits.length > 0 && (
          <section id="kits" className="scroll-mt-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px flex-1 bg-[#D4A853]/25" />
              <h2 className="text-[#D4A853] text-xs uppercase tracking-widest font-semibold px-2">
                🎁 Kits — armados para revender
              </h2>
              <div className="h-px flex-1 bg-[#D4A853]/25" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kits.map((kit) => {
                const calc = calcularKit(kit, tramos);
                const kitWa = `https://wa.me/${whatsapp}?text=${encodeURIComponent(
                  `Hola! Quiero el kit "${kit.nombre}" de la lista "${lista.nombre}".`
                )}`;
                return (
                  <div
                    key={kit.id}
                    className="rounded-2xl bg-[#0F1729] border border-[#D4A853]/25 p-5 flex flex-col gap-4"
                  >
                    <div>
                      <h3 className="text-[#E8E6F0] text-lg font-bold" style={{ fontFamily: "var(--font-cinzel, serif)" }}>
                        {kit.nombre}
                      </h3>
                      {kit.descripcion && (
                        <p className="text-sm text-[#8B85B2] mt-0.5">{kit.descripcion}</p>
                      )}
                    </div>

                    {/* Contenido del kit */}
                    <div className="space-y-1.5">
                      {calc.lineas.map((l, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-sm">
                          {l.imagenUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={l.imagenUrl}
                              alt={l.titulo}
                              className="w-9 h-9 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-[#1C2541] shrink-0" />
                          )}
                          <span className="text-[#D4A853] font-semibold whitespace-nowrap">
                            {l.cantidad}×
                          </span>
                          <span className="flex-1 min-w-0 text-[#B8B3D1] truncate">{l.titulo}</span>
                          {l.unitario != null ? (
                            <span className="text-xs text-[#8B85B2] whitespace-nowrap">
                              {formatPrice(l.unitario)} c/u
                              {l.pct > 0 && <span className="text-[#D4A853]/60"> (-{l.pct}%)</span>}
                            </span>
                          ) : (
                            <span className="text-xs text-[#8B85B2]/50">a consultar</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Precio */}
                    <div className="mt-auto pt-3 border-t border-[#8B85B2]/10 space-y-1 text-sm">
                      <div className="flex justify-between text-xs text-[#8B85B2]/70">
                        <span>Todo a precio de lista ({calc.totalUnidades}u)</span>
                        <span className="line-through">{formatPrice(calc.subtotalPvp)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-[#B8B3D1]">
                        <span>Con descuento por cantidad</span>
                        <span>{formatPrice(calc.subtotalConTramos)}</span>
                      </div>
                      {calc.descuentoExtraPct > 0 && (
                        <div className="flex justify-between text-xs text-emerald-400">
                          <span>Descuento extra kit (−{calc.descuentoExtraPct}%)</span>
                          <span>−{formatPrice(calc.descuentoExtraMonto)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-baseline pt-1.5">
                        <span className="text-[#E8E6F0] font-semibold">Total del kit</span>
                        <span className="text-xl font-bold text-[#D4A853]">{formatPrice(calc.total)}</span>
                      </div>
                      {calc.ahorroTotal > 0 && (
                        <p className="text-right text-xs text-emerald-400">
                          Ahorrás {formatPrice(calc.ahorroTotal)}
                        </p>
                      )}
                    </div>

                    <a
                      href={kitWa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4A853] hover:bg-[#E0B968] text-[#1C2541] text-sm font-semibold rounded-lg transition-colors"
                    >
                      Quiero este kit
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CTA fuerte */}
        <div className="rounded-2xl bg-gradient-to-br from-[#D4A853]/15 to-[#0F1729] border border-[#D4A853]/25 p-6 sm:p-8 text-center">
          <h2 className="text-[#E8E6F0] text-lg sm:text-xl font-bold" style={{ fontFamily: "var(--font-cinzel, serif)" }}>
            ¿Armamos tu pedido mayorista?
          </h2>
          <p className="mt-2 text-sm text-[#B8B3D1] max-w-md mx-auto">
            Escribinos por WhatsApp con los productos y las cantidades, y te
            pasamos tu presupuesto con el mejor precio por volumen.
          </p>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold rounded-lg transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.528 5.843L.057 23.5l5.799-1.52A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.37l-.36-.214-3.727.977.995-3.636-.235-.374A9.818 9.818 0 1 1 12 21.818z" />
            </svg>
            Pedí tu presupuesto mayorista
          </a>
        </div>

        {/* Confianza B2B */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { t: "Fabricantes directos", d: "Producción propia, sin intermediarios" },
            { t: "MercadoLíder Gold", d: "Reputación verde en Mercado Libre" },
            { t: "Reposición a pedido", d: "Te reponemos según tu demanda" },
            { t: "Envíos a todo el país", d: "Correo Argentino" },
            { t: "Seña para pedidos grandes", d: "Coordinamos anticipo y saldo" },
            { t: "Pagos flexibles", d: "MercadoPago, transferencia y efectivo" },
          ].map((b) => (
            <div key={b.t} className="rounded-xl bg-[#0F1729] border border-[#8B85B2]/10 p-3">
              <p className="text-sm text-[#E8E6F0] font-medium">{b.t}</p>
              <p className="text-xs text-[#8B85B2]/60 mt-0.5">{b.d}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#8B85B2]/10 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between text-xs text-[#8B85B2]/40">
          <p>Sendero 3D — Villa Crespo, Buenos Aires</p>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[#8B85B2] hover:text-[#E8E6F0] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.528 5.843L.057 23.5l5.799-1.52A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.37l-.36-.214-3.727.977.995-3.636-.235-.374A9.818 9.818 0 1 1 12 21.818z" />
            </svg>
            Hacer pedido por WhatsApp
          </a>
        </div>
      </footer>
    </div>
  );
}
