import { createServiceRoleClient } from "@/lib/supabase-server";
import BannersManager from "@/components/admin/BannersManager";

export default async function BannersAdminPage() {
  const supabase = await createServiceRoleClient();

  const { data: banners } = await supabase
    .from("banners")
    .select("*")
    .order("orden", { ascending: true });

  return (
    <div>
      <h1 className="font-[family-name:var(--font-cinzel)] text-2xl font-bold text-niebla mb-6">
        Banners
      </h1>
      <BannersManager banners={banners || []} />
    </div>
  );
}
