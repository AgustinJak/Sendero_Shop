import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getSiteConfig } from "@/lib/site-config";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import type { EnvioZona } from "@/types";
import type { ZonaSyb } from "@/lib/envio-syb";

export const metadata: Metadata = {
  title: "Checkout",
  robots: "noindex, nofollow",
};

export default async function CheckoutPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: zonas }, { data: zonasSyb }, { data: config }, siteConfig] = await Promise.all([
    supabase.from("envio_zonas").select("*").eq("activo", true),
    supabase.from("envio_syb_zonas").select("*").eq("activo", true).order("orden"),
    supabase.from("configuracion").select("*"),
    getSiteConfig(),
  ]);

  const configuracion: Record<string, string> = {};
  config?.forEach((c: { key: string; value: string }) => {
    configuracion[c.key] = c.value;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="display display-seccion text-texto mb-8">
        Checkout
      </h1>
      <CheckoutForm
        zonas={(zonas as EnvioZona[]) || []}
        configuracion={configuracion}
        envioGratisDesde={siteConfig.envio_gratis_desde}
        senaEfectivoPct={siteConfig.sena_efectivo_porcentaje}
        zonasSyb={(zonasSyb as ZonaSyb[]) || []}
      />
    </div>
  );
}
