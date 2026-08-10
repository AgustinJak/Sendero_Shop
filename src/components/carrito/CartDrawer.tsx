"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCartContext } from "./CartProvider";
import { formatPrice } from "@/lib/utils";

export default function CartDrawer() {
  const {
    cart,
    isLoaded,
    isDrawerOpen,
    closeDrawer,
    removeItem,
    updateQuantity,
    itemCount,
    tramos,
    envioGratisDesde,
  } = useCartContext();

  const calificaEnvioGratis =
    envioGratisDesde > 0 && cart.subtotal >= envioGratisDesde;
  const faltaParaEnvioGratis = envioGratisDesde - cart.subtotal;

  // Total ahorrado en el pedido por los descuentos por cantidad.
  const ahorroTotal = cart.items.reduce((acc, i) => {
    const lista = i.precio_lista ?? i.precio_unitario;
    return acc + Math.max(0, lista - i.precio_unitario) * i.cantidad;
  }, 0);

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
          />

          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-navy-deep border-l border-lavanda/10 z-[70] flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-lavanda/10">
              <h2 className="font-[family-name:var(--font-cinzel)] text-lg font-bold text-niebla">
                Carrito ({itemCount})
              </h2>
              <button
                onClick={closeDrawer}
                className="text-lavanda-light hover:text-niebla transition-colors"
                aria-label="Cerrar carrito"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {!isLoaded ? (
                <p className="text-lavanda/60 text-center py-8">Cargando...</p>
              ) : cart.items.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-lavanda/5 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 text-lavanda/30">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                  </div>
                  <p className="text-niebla font-medium mb-1">Tu carrito está vacío</p>
                  <p className="text-lavanda/60 text-sm mb-6">Explorá nuestro catálogo y encontrá tu próxima pieza</p>
                  <a
                    href="/catalogo"
                    onClick={closeDrawer}
                    className="inline-block px-6 py-2.5 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-semibold rounded-lg transition-colors"
                  >
                    Ir al catálogo
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div
                      key={`${item.producto_id}-${item.opciones.map(o => o.opcion_id).join("-")}`}
                      className="flex gap-4 bg-navy/50 rounded-lg p-3 border border-lavanda/5"
                    >
                      {/* Imagen */}
                      <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-lavanda/5 relative">
                        {item.imagen_url ? (
                          <Image
                            src={item.imagen_url}
                            alt={item.nombre}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-lavanda/50 text-xs">Sin img</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {item.slug ? (
                          <Link
                            href={`/producto/${item.slug}`}
                            onClick={closeDrawer}
                            className="text-sm font-medium text-niebla hover:text-ambar-light transition-colors line-clamp-1"
                          >
                            {item.nombre}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-niebla line-clamp-1">
                            {item.nombre}
                            {item.mayorista?.esKit && (
                              <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-ambar">
                                kit
                              </span>
                            )}
                          </p>
                        )}

                        {/* Opciones seleccionadas */}
                        {item.opciones.length > 0 && (
                          <p className="text-xs text-lavanda/70 mt-0.5">
                            {item.opciones.map(o => `${o.grupo_nombre}: ${o.opcion_valor}`).join(" · ")}
                          </p>
                        )}

                        {/* Precio — con descuento mayorista si aplica */}
                        {(() => {
                          const lista = item.precio_lista ?? item.precio_unitario;
                          const conDescuento = item.precio_unitario < lista;
                          const pct = conDescuento
                            ? Math.round((1 - item.precio_unitario / lista) * 100)
                            : 0;
                          return (
                            <>
                              <p className="text-sm font-semibold text-ambar mt-1">
                                {formatPrice(item.precio_unitario)}
                                {conDescuento && (
                                  <>
                                    {" "}
                                    <span className="text-xs font-normal text-lavanda/50 line-through">
                                      {formatPrice(lista)}
                                    </span>{" "}
                                    <span className="text-xs font-semibold text-emerald-400">
                                      −{pct}%
                                    </span>
                                  </>
                                )}
                              </p>
                              {conDescuento && (
                                <p className="text-xs text-emerald-400">
                                  Ahorrás {formatPrice(lista - item.precio_unitario)} por
                                  unidad
                                </p>
                              )}
                              {!conDescuento && !item.mayorista?.esKit && (() => {
                                const t = item.mayorista?.tramos?.length
                                  ? item.mayorista.tramos
                                  : tramos;
                                if (!t.length) return null;
                                const primero = t
                                  .slice()
                                  .sort((a, b) => a.min - b.min)[0];
                                return (
                                  <p className="text-xs text-lavanda/60">
                                    Desde {primero.min}u: {primero.pct}% OFF
                                  </p>
                                );
                              })()}
                            </>
                          );
                        })()}

                        {/* Cantidad */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.producto_id, item.opciones, item.cantidad - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded border border-lavanda/20 text-lavanda-light hover:bg-lavanda/10 transition-colors text-sm"
                          >
                            -
                          </button>
                          <span className="text-sm text-niebla w-6 text-center">
                            {item.cantidad}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.producto_id, item.opciones, item.cantidad + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded border border-lavanda/20 text-lavanda-light hover:bg-lavanda/10 transition-colors text-sm"
                          >
                            +
                          </button>

                          <button
                            onClick={() => removeItem(item.producto_id, item.opciones)}
                            className="ml-auto text-lavanda/60 hover:text-red-400 transition-colors"
                            aria-label="Eliminar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.items.length > 0 && (
              <div className="border-t border-lavanda/10 px-6 py-4 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-lavanda-light">Subtotal</span>
                    <span className="text-lg font-bold text-niebla">
                      {formatPrice(cart.subtotal)}
                    </span>
                  </div>
                  {ahorroTotal > 0 && (
                    <div className="flex items-center justify-between text-sm text-emerald-400">
                      <span>Ahorro por cantidad</span>
                      <span className="font-semibold">−{formatPrice(ahorroTotal)}</span>
                    </div>
                  )}
                </div>
                {calificaEnvioGratis ? (
                  <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 text-sm text-emerald-400">
                    <span aria-hidden="true">🎉</span>
                    <span>
                      ¡Tenés <strong className="font-semibold">envío gratis</strong>!
                    </span>
                  </div>
                ) : envioGratisDesde > 0 ? (
                  <p className="text-xs text-lavanda/60">
                    Te faltan{" "}
                    <span className="font-semibold text-ambar">
                      {formatPrice(faltaParaEnvioGratis)}
                    </span>{" "}
                    para el envío gratis
                  </p>
                ) : (
                  <p className="text-xs text-lavanda/60">
                    Envío calculado en el checkout
                  </p>
                )}
                <Link
                  href="/checkout"
                  onClick={closeDrawer}
                  className="block w-full text-center py-3 bg-purpura hover:bg-purpura/80 text-niebla font-semibold rounded-lg transition-colors"
                >
                  Ir al checkout
                </Link>
                <button
                  onClick={closeDrawer}
                  className="block w-full text-center text-sm text-lavanda-light hover:text-niebla transition-colors"
                >
                  Seguir comprando
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
