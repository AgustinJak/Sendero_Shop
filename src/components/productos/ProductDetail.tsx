"use client";

import { useState, useMemo, useEffect } from "react";
import type { Producto, VarianteSeleccion } from "@/types";
import { formatPrice, whatsappLink } from "@/lib/utils";
import { trackViewItem } from "@/lib/analytics";
import ProductGallery from "./ProductGallery";
import VariantSelector from "./VariantSelector";
import AddToCartButton from "./AddToCartButton";

interface ProductDetailProps {
  producto: Producto;
}

export default function ProductDetail({ producto }: ProductDetailProps) {
  const [selecciones, setSelecciones] = useState<VarianteSeleccion[]>([]);

  useEffect(() => {
    trackViewItem({
      id: producto.id,
      name: producto.nombre,
      price: producto.precio_oferta || producto.precio,
      category: producto.categoria?.nombre,
      linea: producto.linea,
    });
  }, [producto]);

  const precioFinal = useMemo(() => {
    const adicionales = selecciones.reduce(
      (acc, s) => acc + s.precio_adicional,
      0
    );
    return (producto.precio_oferta || producto.precio) + adicionales;
  }, [producto.precio, producto.precio_oferta, selecciones]);

  const tieneOferta =
    producto.precio_oferta && producto.precio_oferta < producto.precio;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
      {/* Galería */}
      <ProductGallery
        imagenes={producto.imagenes || []}
        nombre={producto.nombre}
      />

      {/* Info */}
      <div className="space-y-6">
        {/* Breadcrumb inline */}
        {producto.linea && (
          <p className="text-sm text-lavanda/75 uppercase tracking-wider">
            {producto.linea}
          </p>
        )}

        <h1 className="font-[family-name:var(--font-cinzel)] text-2xl sm:text-3xl font-bold text-niebla">
          {producto.nombre}
        </h1>

        {/* Precio */}
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-ambar">
            {formatPrice(precioFinal)}
          </span>
          {tieneOferta && (
            <span className="text-lg text-lavanda/70 line-through">
              {formatPrice(producto.precio)}
            </span>
          )}
        </div>

        {/* Variantes */}
        {producto.variante_grupos && producto.variante_grupos.length > 0 && (
          <VariantSelector
            grupos={producto.variante_grupos}
            selecciones={selecciones}
            onChange={setSelecciones}
            precioReglas={producto.precio_reglas}
          />
        )}

        {/* Agregar al carrito */}
        <AddToCartButton
          producto={producto}
          selecciones={selecciones}
          precioFinal={precioFinal}
        />

        {/* WhatsApp */}
        <a
          href={whatsappLink(
            `Hola! Quiero consultar por: ${producto.nombre}`
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm text-lavanda-light hover:text-niebla transition-colors"
        >
          ¿Tenés dudas? Consultanos por WhatsApp
        </a>

        {/* Info adicional */}
        <div className="border-t border-lavanda/10 pt-6 space-y-3">
          {producto.tamano && (
            <InfoRow label="Tamaño" value={producto.tamano} />
          )}
          <InfoRow
            label="Producción"
            value={`${producto.tiempo_produccion} días hábiles`}
          />
          <InfoRow
            label="Tipo"
            value={
              producto.stock_tipo === "print-on-demand"
                ? "Fabricado a pedido"
                : "Stock limitado"
            }
          />
        </div>

        {/* Descripción */}
        {producto.descripcion && (
          <div className="border-t border-lavanda/10 pt-6">
            <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider mb-3">
              Descripción
            </h2>
            <div
              className="text-sm text-lavanda-light leading-relaxed prose-sendero"
              dangerouslySetInnerHTML={{ __html: producto.descripcion }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-lavanda/75">{label}</span>
      <span className="text-lavanda-light">{value}</span>
    </div>
  );
}
