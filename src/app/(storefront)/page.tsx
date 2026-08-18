import { getBanners, getProductosDestacados, getCategorias, getColecciones, getUnidadesVendidas } from "@/lib/queries";
import { getWhatsapp, getSiteConfig } from "@/lib/site-config";
import HeroBanners from "@/components/home/HeroBanners";
import HomeHero from "@/components/home/HomeHero";
import ProductGrid from "@/components/productos/ProductGrid";
import TrackItemList from "@/components/productos/TrackItemList";
import { CategoriesSection, CollectionsSection, WhatsAppCTA } from "@/components/home/HomeSections";
import TrustStrip from "@/components/home/TrustStrip";
import SectionHeader from "@/components/ui/SectionHeader";

export default async function Home() {
  const [heroBanners, destacados, categorias, colecciones, whatsapp, unidadesWeb, siteConfig] =
    await Promise.all([
      getBanners("hero"),
      getProductosDestacados(8),
      getCategorias(),
      getColecciones(),
      getWhatsapp(),
      getUnidadesVendidas(),
      getSiteConfig(),
    ]);

  // Lo vendido por la web mas lo vendido por fuera (Meli, ferias).
  const piezasVendidas = unidadesWeb + siteConfig.unidades_vendidas_base;

  return (
    <>
      {/* Hero: banners dinámicos o hero estático */}
      {heroBanners.length > 0 ? (
        <HeroBanners banners={heroBanners} />
      ) : (
        <HomeHero whatsapp={whatsapp} unidadesVendidas={piezasVendidas} />
      )}

      <TrustStrip />

      {/* Productos Destacados */}
      {destacados.length > 0 && (
        <section className="py-16 px-4 max-w-7xl mx-auto">
          <SectionHeader
            volanta="Lo que más sale"
            titulo="Productos destacados"
            bajada="Los modelos que más nos piden, listos para salir del taller."
            href="/catalogo"
          />
          <ProductGrid productos={destacados} />
          <TrackItemList
            listName="Destacados"
            products={destacados.map((p) => ({
              id: p.id,
              name: p.nombre,
              price: p.precio_oferta || p.precio,
            }))}
          />
        </section>
      )}

      {/* Colecciones + Categorías */}
      <CollectionsSection colecciones={colecciones} />
      <CategoriesSection categorias={categorias} />

      {/* CTA WhatsApp */}
      <WhatsAppCTA whatsapp={whatsapp} />
    </>
  );
}
