import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { esAdmin } from "@/lib/admin";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Tener sesión no alcanza: tiene que ser admin (ver lib/admin.ts).
  if (!esAdmin(user)) {
    redirect(user ? "/admin/login?sin_permiso=1" : "/admin/login");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
