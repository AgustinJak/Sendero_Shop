import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { getProductoBySlug } from "@/lib/queries";
import { formatPrice } from "@/lib/utils";
import { getWhatsapp } from "@/lib/site-config";
import ProductDetail from "@/components/productos/ProductDetail";
import ReviewList from "@/components/reviews/ReviewList";
import { createServiceRoleClient } from "@/lib/supabase-server";

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
    `${producto.nombre}${producto.linea ? ` de ${producto.linea}` : ""}, impreso en 3D. ${formatPrice(producto.precio)}. Envío a todo Argentina.`;
  const imagen = producto.imagenes?.filter((i) => i.tipo !== "video").sort((a, b) => a.orden - b.orden)[0];

  return {
    title,
    description,
    openGraph: {
      title: producto.nombre,
      description,
      type: "website",
      url: `https://sendero3d.com/producto/${slug}`,
      images: imagen ? [{ url: imagen.url, alt: producto.nombre }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: producto.nombre,
      description,
      images: imagen ? [imagen.url] : [],
    },
    alternates: {
      canonical: `https://sendero3d.com/producto/${slug}`,
    },
  };
}

export default async function ProductoPage({ params }: Props) {
  const { slug } = await params;
  const producto = await getProducto(slug);

  if (!producto) {
    notFound();
  }

  const whatsapp = await getWhatsapp();

  const imagen = producto.imagenes?.filter((i) => i.tipo !== "video").sort((a, b) => a.orden - b.orden)[0];

  // Fetch approved reviews for JSON-LD aggregateRating
  const supabase = await createServiceRoleClient();
  const { data: reviewsData } = await supabase
    .from("reviews")
    .select("rating")
    .eq("producto_id", producto.id)
    .eq("aprobado", true);

  const reviewCount = reviewsData?.length || 0;
  const avgRating =
    reviewCount > 0
      ? reviewsData!.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0) / reviewCount
      : 0;

  // JSON-LD Structured Data — Product
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: producto.nombre,
    image: producto.imagenes?.filter((i) => i.tipo !== "video").map((i) => i.url) || [],
    description: producto.descripcion?.replace(/<[^>]*>/g, "") || "",
    sku: producto.sku || undefined,
    brand: { "@type": "Brand", name: "Sendero 3D" },
    offers: {
      "@type": "Offer",
      url: `https://sendero3d.com/producto/${producto.slug}`,
      priceCurrency: "ARS",
      price: producto.precio_oferta || producto.precio,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "Sendero Shop" },
    },
    ...(reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avgRating.toFixed(1),
            reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  // JSON-LD — BreadcrumbList
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: "https://sendero3d.com" },
      { "@type": "ListItem", position: 2, name: "Catálogo", item: "https://sendero3d.com/catalogo" },
      ...(producto.categoria
        ? [{
            "@type": "ListItem",
            position: 3,
            name: producto.categoria.nombre,
            item: `https://sendero3d.com/catalogo?categoria=${producto.categoria.slug}`,
          }]
        : []),
      {
        "@type": "ListItem",
        position: producto.categoria ? 4 : 3,
        name: producto.nombre,
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm text-lavanda/75">
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

      <ProductDetail producto={producto} whatsapp={whatsapp} />

      {/* Reviews */}
      <ReviewList productoId={producto.id} />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </div>
  );
}
