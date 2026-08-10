"use client";

import { useState, useMemo, useEffect } from "react";
import type { Producto, VarianteSeleccion, MayoristaTramo } from "@/types";
import { formatPrice, whatsappLink, PROSE_CLASSES } from "@/lib/utils";
import { trackViewItem } from "@/lib/analytics";
import ProductGallery from "./ProductGallery";
import VariantSelector from "./VariantSelector";
import AddToCartButton from "./AddToCartButton";
import MayoristaCallout from "./MayoristaCallout";
import EnvioProducto from "./EnvioProducto";
import { StarRating, TrustBadges } from "./TrustSignals";

interface ProductDetailProps {
  producto: Producto;
  whatsapp: string;
  reviewCount: number;
  avgRating: number;
  listaMayoristaCodigo?: string | null;
  envioGratisDesde: number;
  tramos?: MayoristaTramo[];
}

export default function ProductDetail({
  producto,
  whatsapp,
  reviewCount,
  avgRating,
  listaMayoristaCodigo,
  envioGratisDesde,
  tramos = [],
}: ProductDetailProps) {
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
      {/* Galería + callout mayorista debajo de las fotos */}
      <div className="space-y-6 self-start">
        <ProductGallery
          imagenes={producto.imagenes || []}
          nombre={producto.nombre}
          selecciones={selecciones}
        />
        {/* Desktop: debajo de las fotos */}
        <div className="hidden md:block">
          <MayoristaCallout
            whatsapp={whatsapp}
            nombreProducto={producto.nombre}
            listaCodigo={listaMayoristaCodigo}
            tramos={tramos}
          />
        </div>
      </div>

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

        {/* Estrellas / reseñas (solo si hay) */}
        <StarRating rating={avgRating} count={reviewCount} />

        {/* Social proof: unidades vendidas — desde la primera unidad */}
        {producto.unidades_vendidas >= 1 && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              {/* Hasta 99 mostramos el número exacto.
                  De 100 en adelante redondeamos a la centena hacia abajo
                  con prefijo "+" (clásico social proof tipo MercadoLibre). */}
              {producto.unidades_vendidas >= 100
                ? `+${Math.floor(producto.unidades_vendidas / 100) * 100}`
                : producto.unidades_vendidas}{" "}
              {producto.unidades_vendidas === 1 ? "vendido" : "vendidos"}
            </span>
          </p>
        )}

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

        {/* Señales de confianza cerca del CTA de compra */}
        <TrustBadges />

        {/* Envío gratis + calculadora de costo de envío */}
        <EnvioProducto
          envioGratisDesde={envioGratisDesde}
          precio={precioFinal}
          paquete={{
            weight: producto.peso_gr ?? undefined,
            height: producto.alto_cm ?? undefined,
            width: producto.ancho_cm ?? undefined,
            length: producto.largo_cm ?? undefined,
          }}
        />

        {/* WhatsApp */}
        <a
          href={whatsappLink(
            whatsapp,
            `Hola! Quiero consultar por: ${producto.nombre}`
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm text-lavanda-light hover:text-niebla transition-colors"
        >
          ¿Tenés dudas? Consultanos por WhatsApp
        </a>

        {/* Mobile: callout mayorista después del CTA de compra */}
        <div className="md:hidden">
          <MayoristaCallout
            whatsapp={whatsapp}
            nombreProducto={producto.nombre}
            listaCodigo={listaMayoristaCodigo}
            tramos={tramos}
          />
        </div>

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
              className={`text-sm text-lavanda-light leading-relaxed ${PROSE_CLASSES}`}
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
