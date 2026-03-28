import { createServiceRoleClient } from "@/lib/supabase-server";

const SITE_URL = "https://sendero3d.com";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export async function GET() {
  const supabase = await createServiceRoleClient();

  const { data: productos } = await supabase
    .from("productos")
    .select(
      `
      id, nombre, slug, descripcion, precio, precio_oferta,
      sku, anime, personaje, tamano, peso_gr, stock_tipo,
      categoria:categorias(nombre),
      imagenes:producto_imagenes(url, orden)
    `
    )
    .eq("activo", true)
    .order("created_at", { ascending: false });

  const items = (productos || [])
    .map((p) => {
      const imagenes = (p.imagenes as { url: string; orden: number }[] || []).sort(
        (a, b) => a.orden - b.orden
      );
      if (imagenes.length === 0) return null;

      const precio = p.precio_oferta || p.precio;
      const descripcion = p.descripcion
        ? stripHtml(p.descripcion).slice(0, 5000)
        : p.nombre;
      const categoria = p.categoria as unknown as { nombre: string } | null;

      const additionalImages = imagenes
        .slice(1, 11)
        .map(
          (img) =>
            `      <g:additional_image_link>${escapeXml(img.url)}</g:additional_image_link>`
        )
        .join("\n");

      return `    <item>
      <g:id>${escapeXml(p.sku || p.id)}</g:id>
      <g:title>${escapeXml(p.nombre)}</g:title>
      <g:description>${escapeXml(descripcion)}</g:description>
      <g:link>${SITE_URL}/producto/${escapeXml(p.slug)}</g:link>
      <g:image_link>${escapeXml(imagenes[0].url)}</g:image_link>
${additionalImages ? additionalImages + "\n" : ""}      <g:availability>in_stock</g:availability>
      <g:price>${precio.toFixed(2)} ARS</g:price>${
        p.precio_oferta
          ? `\n      <g:sale_price>${p.precio_oferta.toFixed(2)} ARS</g:sale_price>`
          : ""
      }
      <g:brand>Sendero 3D</g:brand>
      <g:condition>new</g:condition>${
        categoria
          ? `\n      <g:product_type>${escapeXml(categoria.nombre)}</g:product_type>`
          : ""
      }${
        p.anime
          ? `\n      <g:custom_label_0>${escapeXml(p.anime)}</g:custom_label_0>`
          : ""
      }${
        p.personaje
          ? `\n      <g:custom_label_1>${escapeXml(p.personaje)}</g:custom_label_1>`
          : ""
      }${
        p.tamano
          ? `\n      <g:custom_label_2>${escapeXml(p.tamano)}</g:custom_label_2>`
          : ""
      }${
        p.peso_gr
          ? `\n      <g:shipping_weight>${p.peso_gr} g</g:shipping_weight>`
          : ""
      }
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
    })
    .filter(Boolean);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Sendero Shop — Figuras y Accesorios 3D</title>
    <link>${SITE_URL}</link>
    <description>Figuras, katanas y accesorios impresos en 3D inspirados en anime, cine y videojuegos.</description>
${items.join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
