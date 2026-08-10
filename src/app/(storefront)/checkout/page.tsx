import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getSiteConfig } from "@/lib/site-config";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import type { EnvioZona } from "@/types";

export const metadata: Metadata = {
  title: "Checkout",
  robots: "noindex, nofollow",
};

export default async function CheckoutPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: zonas }, { data: config }, siteConfig] = await Promise.all([
    supabase.from("envio_zonas").select("*").eq("activo", true),
    supabase.from("configuracion").select("*"),
    getSiteConfig(),
  ]);

  const configuracion: Record<string, string> = {};
  config?.forEach((c: { key: string; value: string }) => {
    configuracion[c.key] = c.value;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-[family-name:var(--font-cinzel)] text-2xl sm:text-3xl font-bold text-niebla mb-8">
        Checkout
      </h1>
      <CheckoutForm
        zonas={(zonas as EnvioZona[]) || []}
        configuracion={configuracion}
        envioGratisDesde={siteConfig.envio_gratis_desde}
      />
    </div>
  );
}
