import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { getProductoBySlug } from "@/lib/queries";
import { formatPrice } from "@/lib/utils";
import ProductDetail from "@/components/productos/ProductDetail";

const getProducto = cache(async (slug: string) => {
  return getProductoBySlug(slug);
});

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const producto = await getProducto(slug);

  if (!producto) {
    return { title: "Producto no encontrado" };
  }

  const title = producto.meta_title || `${producto.nombre} — Sendero Shop`;
  const description =
    producto.meta_description ||
    `${producto.nombre}${producto.anime ? ` de ${producto.anime}` : ""}, impreso en 3D. ${formatPrice(producto.precio)}. Envío a todo Argentina.`;
  const imagen = producto.imagenes?.sort((a, b) => a.orden - b.orden)[0];

  return {
    title,
    description,
    openGraph: {
      title: producto.nombre,
      description,
      type: "website",
      images: imagen ? [imagen.url] : [],
    },
  };
}

export default async function ProductoPage({ params }: Props) {
  const { slug } = await params;
  const producto = await getProducto(slug);

  if (!producto) {
    notFound();
  }

  const imagen = producto.imagenes?.sort((a, b) => a.orden - b.orden)[0];

  // JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: producto.nombre,
    image: producto.imagenes?.map((i) => i.url) || [],
    description: producto.descripcion?.replace(/<[^>]*>/g, "") || "",
    brand: { "@type": "Brand", name: "Sendero 3D" },
    offers: {
      "@type": "Offer",
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/producto/${producto.slug}`,
      priceCurrency: "ARS",
      price: producto.precio_oferta || producto.precio,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm text-lavanda/60">
        <a href="/" className="hover:text-niebla transition-colors">
          Inicio
        </a>
        <span className="mx-2">/</span>
        <a href="/catalogo" className="hover:text-niebla transition-colors">
          Catálogo
        </a>
        {producto.categoria && (
          <>
            <span className="mx-2">/</span>
            <a
              href={`/catalogo?categoria=${producto.categoria.slug}`}
              className="hover:text-niebla transition-colors"
            >
              {producto.categoria.nombre}
            </a>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-lavanda-light">{producto.nombre}</span>
      </nav>

      <ProductDetail producto={producto} />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
