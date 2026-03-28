import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { getColeccionBySlug } from "@/lib/queries";
import ProductGrid from "@/components/productos/ProductGrid";
import TrackItemList from "@/components/productos/TrackItemList";

const getColeccion = cache(async (slug: string) => {
  return getColeccionBySlug(slug);
});

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const coleccion = await getColeccion(slug);

  if (!coleccion) {
    return { title: "Colección no encontrada" };
  }

  const title = coleccion.meta_title || `${coleccion.nombre} — Sendero Shop`;
  const description =
    coleccion.meta_description ||
    coleccion.descripcion ||
    `Colección ${coleccion.nombre}. Figuras y accesorios impresos en 3D. Envío a todo Argentina.`;

  return {
    title,
    description,
    openGraph: {
      title: coleccion.nombre,
      description,
      type: "website",
      url: `https://sendero3d.com/coleccion/${slug}`,
      images: coleccion.imagen_cover
        ? [{ url: coleccion.imagen_cover, alt: coleccion.nombre }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: coleccion.nombre,
      description,
    },
    alternates: {
      canonical: `https://sendero3d.com/coleccion/${slug}`,
    },
  };
}

export default async function ColeccionPage({ params }: Props) {
  const { slug } = await params;
  const coleccion = await getColeccion(slug);

  if (!coleccion) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: coleccion.nombre,
    description: coleccion.descripcion || "",
    url: `https://sendero3d.com/coleccion/${slug}`,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm text-lavanda/60">
        <a href="/" className="hover:text-niebla transition-colors">
          Inicio
        </a>
        <span className="mx-2">/</span>
        <span className="text-lavanda-light">{coleccion.nombre}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-cinzel)] text-2xl sm:text-3xl font-bold text-niebla">
          {coleccion.nombre}
        </h1>
        {coleccion.descripcion && (
          <p className="text-lavanda-light mt-2 max-w-2xl">
            {coleccion.descripcion}
          </p>
        )}
        <p className="text-lavanda/60 text-sm mt-2">
          {coleccion.productos.length}{" "}
          {coleccion.productos.length === 1 ? "producto" : "productos"}
        </p>
      </div>

      {/* Grid */}
      <ProductGrid productos={coleccion.productos} />
      <TrackItemList
        listName={`Colección: ${coleccion.nombre}`}
        products={coleccion.productos.map((p) => ({
          id: p.id,
          name: p.nombre,
          price: p.precio_oferta || p.precio,
        }))}
      />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
