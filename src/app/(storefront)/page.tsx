import { getBanners, getProductosDestacados, getCategorias } from "@/lib/queries";
import HeroBanners from "@/components/home/HeroBanners";
import HomeHero from "@/components/home/HomeHero";
import ProductGrid from "@/components/productos/ProductGrid";
import TrackItemList from "@/components/productos/TrackItemList";
import { CategoriesSection, WhatsAppCTA } from "@/components/home/HomeSections";

export default async function Home() {
  const [heroBanners, destacados, categorias] = await Promise.all([
    getBanners("hero"),
    getProductosDestacados(8),
    getCategorias(),
  ]);

  return (
    <>
      {/* Hero: banners dinámicos o hero estático */}
      {heroBanners.length > 0 ? (
        <HeroBanners banners={heroBanners} />
      ) : (
        <HomeHero />
      )}

      {/* Productos Destacados */}
      {destacados.length > 0 && (
        <section className="py-16 px-4 max-w-7xl mx-auto">
          <h2 className="font-[family-name:var(--font-cinzel)] text-2xl sm:text-3xl font-bold text-niebla mb-8 text-center">
            Productos Destacados
          </h2>
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

      {/* Categorías */}
      <CategoriesSection categorias={categorias} />

      {/* CTA WhatsApp */}
      <WhatsAppCTA />
    </>
  );
}
