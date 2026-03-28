import type { MetadataRoute } from "next";
import { createServiceRoleClient } from "@/lib/supabase-server";

const SITE_URL = "https://sendero3d.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServiceRoleClient();

  // Fetch all active products
  const { data: productos } = await supabase
    .from("productos")
    .select("slug, updated_at")
    .eq("activo", true);

  // Fetch all active categories
  const { data: categorias } = await supabase
    .from("categorias")
    .select("slug")
    .eq("activo", true);

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/catalogo`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // Product pages
  const productPages: MetadataRoute.Sitemap = (productos || []).map((p) => ({
    url: `${SITE_URL}/producto/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Category filtered catalog pages
  const categoryPages: MetadataRoute.Sitemap = (categorias || []).map((c) => ({
    url: `${SITE_URL}/catalogo?categoria=${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...productPages, ...categoryPages];
}
