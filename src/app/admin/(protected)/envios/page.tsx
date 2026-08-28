import { createServiceRoleClient } from "@/lib/supabase-server";
import SybZonasManager from "@/components/admin/SybZonasManager";
import type { EnvioSybZona } from "@/types";

export default async function EnviosAdminPage() {
  const supabase = await createServiceRoleClient();
  const { data } = await supabase.from("envio_syb_zonas").select("*").order("orden");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-texto">Envío en el día</h1>
        <p className="mt-1 text-sm text-texto-3">
          Zonas y precios del courier local. El checkout ofrece esta opción solo
          cuando la dirección del cliente cae en una zona activa; si no, muestra
          únicamente Correo Argentino.
        </p>
      </div>
      <SybZonasManager zonas={(data as EnvioSybZona[]) || []} />
    </div>
  );
}
