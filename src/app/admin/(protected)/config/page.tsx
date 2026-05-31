import { createServiceRoleClient } from "@/lib/supabase-server";
import ConfigForm from "@/components/admin/ConfigForm";
import OptimizarBucketButton from "@/components/admin/OptimizarBucketButton";

const CONFIG_KEYS = [
  { key: "whatsapp", label: "WhatsApp (con código país)", placeholder: "5491128290007" },
  { key: "cbu", label: "CBU para transferencias", placeholder: "0000003100..." },
  { key: "alias", label: "Alias bancario", placeholder: "sendero.shop" },
  { key: "titular_cuenta", label: "Titular de la cuenta", placeholder: "Nombre Apellido" },
  { key: "recargo_mp_porcentaje", label: "Recargo MercadoPago (%)", placeholder: "13" },
  { key: "email_notificaciones", label: "Email para notificaciones", placeholder: "ventas@sendero3d.com" },
  { key: "tiempo_produccion_default", label: "Tiempo producción default (días)", placeholder: "7" },
];

export default async function ConfigAdminPage() {
  const supabase = await createServiceRoleClient();

  const { data: configs } = await supabase
    .from("configuracion")
    .select("*");

  const configMap: Record<string, string> = {};
  for (const c of configs || []) {
    configMap[c.key] = c.value;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
        Configuración
      </h1>
      <ConfigForm configMap={configMap} configKeys={CONFIG_KEYS} />

      <div className="pt-4 border-t border-lavanda/10 space-y-3">
        <h2 className="font-[family-name:var(--font-cinzel)] text-lg font-bold text-niebla">
          Mantenimiento
        </h2>
        <OptimizarBucketButton />
      </div>
    </div>
  );
}
