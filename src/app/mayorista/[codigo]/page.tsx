import { createServiceRoleClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { MayoristaSeccion, MayoristaItem } from "@/types";
import { getWhatsapp } from "@/lib/site-config";
import MayoristaItemCard from "@/components/mayorista/MayoristaItemCard";

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

  const { data: lista } = await db
    .from("mayorista_listas")
    .select(`
      *,
      secciones:mayorista_secciones(
        *,
        items:mayorista_items(
          *,
          imagenes:mayorista_imagenes(*)
        )
      )
    `)
    .eq("codigo", codigo)
    .eq("activa", true)
    .single();

  if (!lista) notFound();

  const secciones: MayoristaSeccion[] = ((lista.secciones ?? []) as MayoristaSeccion[])
    .sort((a, b) => a.orden - b.orden)
    .map((s) => ({
      ...s,
      items: (s.items ?? []).sort((a: MayoristaItem, b: MayoristaItem) => a.orden - b.orden),
    }));

  const totalItems = secciones.reduce((acc, s) => acc + (s.items?.length ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#1C2541]">
      {/* Header */}
      <header className="bg-[#0F1729] border-b border-[#8B85B2]/10">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#8B85B2]/50 mb-1">
              Lista de Precios Mayorista
            </p>
            <h1
              className="text-[#E8E6F0] text-xl font-bold"
              style={{ fontFamily: "var(--font-cinzel, serif)" }}
            >
              Sendero 3D
            </h1>
          </div>
          <div className="text-right text-xs text-[#8B85B2]/40 space-y-0.5">
            <p>{totalItems} productos</p>
            <p>{new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}</p>
          </div>
        </div>
      </header>

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
              {/* Separador de sección */}
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-[#8B85B2]/15" />
                <h2
                  className="text-[#B8B3D1] text-xs uppercase tracking-widest font-semibold px-2"
                >
                  {seccion.titulo}
                </h2>
                <div className="h-px flex-1 bg-[#8B85B2]/15" />
              </div>

              {/* Grid de productos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map((item: MayoristaItem) => (
                  <MayoristaItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#8B85B2]/10 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between text-xs text-[#8B85B2]/40">
          <p>Sendero 3D — Villa Crespo, Buenos Aires</p>
          <a
            href={`https://wa.me/${whatsapp}`}
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
