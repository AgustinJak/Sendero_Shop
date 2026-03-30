import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";

const SITE_URL = "https://sendero3d.com";

export const revalidate = 3600; // cache 1h

export async function GET() {
  const supabase = await createServiceRoleClient();

  const { data: productos } = await supabase
    .from("productos")
    .select(
      `
      id, nombre, slug, descripcion, precio, precio_oferta, sku,
      peso_gr, activo, stock_tipo, tiempo_produccion,
      categoria:categorias(nombre),
      imagenes:producto_imagenes(url, orden, tipo)
    `
    )
    .eq("activo", true)
    .order("created_at", { ascending: false });

  if (!productos) {
    return new NextResponse("Error fetching products", { status: 500 });
  }

  const items = productos
    .map((p) => {
      const images = (p.imagenes as { url: string; orden: number; tipo?: string }[] || [])
        .filter((i) => i.tipo !== "video")
        .sort((a, b) => a.orden - b.orden);
      if (images.length === 0) return null;

      const cat = p.categoria as unknown as { nombre: string } | null;
      const catName = cat?.nombre || "Figuras 3D";
      const salePrice = p.precio_oferta && p.precio_oferta < p.precio ? p.precio_oferta : null;
      const desc = p.descripcion
        .replace(/<[^>]*>/g, "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .slice(0, 5000);
      const title = p.nombre.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      const additionalImages = images
        .slice(1, 10)
        .map((img) => `      <g:additional_image_link>${escapeXml(img.url)}</g:additional_image_link>`)
        .join("\n");

      return `    <item>
      <g:id>${p.id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${desc}</g:description>
      <g:link>${SITE_URL}/producto/${p.slug}</g:link>
      <g:image_link>${escapeXml(images[0].url)}</g:image_link>
${additionalImages}
      <g:availability>${p.stock_tipo === "print-on-demand" ? "preorder" : "in_stock"}</g:availability>
${p.stock_tipo === "print-on-demand" ? `      <g:availability_date>${getAvailabilityDate(p.tiempo_produccion)}</g:availability_date>` : ""}
      <g:price>${p.precio} ARS</g:price>
${salePrice ? `      <g:sale_price>${salePrice} ARS</g:sale_price>` : ""}
      <g:brand>Sendero 3D</g:brand>
      <g:condition>new</g:condition>
      <g:product_type>${escapeXml(catName)}</g:product_type>
${p.sku ? `      <g:mpn>${escapeXml(p.sku)}</g:mpn>` : ""}
${p.peso_gr ? `      <g:shipping_weight>${p.peso_gr} g</g:shipping_weight>` : ""}
      <g:identifier_exists>false</g:identifier_exists>
    </item>`;
    })
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Sendero Shop — Figuras 3D</title>
    <link>${SITE_URL}</link>
    <description>Figuras y accesorios impresos en 3D</description>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function getAvailabilityDate(dias: number): string {
  const date = new Date();
  date.setDate(date.getDate() + (dias || 7));
  return date.toISOString().split("T")[0] + "T00:00-03:00";
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
