"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { esAdmin } from "@/lib/admin";

const SIN_ACCESO = "Esta cuenta no tiene acceso al panel.";

/**
 * El proxy manda acá con ?sin_permiso=1 a quien tiene sesión pero no es admin.
 * Va aparte y dentro de un Suspense porque useSearchParams lo exige en una
 * página estática.
 */
function AvisoSinPermiso({ hayOtroError }: { hayOtroError: boolean }) {
  const params = useSearchParams();
  if (hayOtroError || !params.has("sin_permiso")) return null;
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
      {SIN_ACCESO}
    </div>
  );
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Credenciales incorrectas");
      setLoading(false);
      return;
    }

    // La contraseña puede ser correcta y la cuenta no ser admin: se cierra la
    // sesión para no dejar una sesión sin permisos dando vueltas.
    if (!esAdmin(data.user)) {
      await supabase.auth.signOut();
      setError(SIN_ACCESO);
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-navy-deep flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-[family-name:var(--font-cinzel)] text-2xl font-bold text-niebla">
            Sendero Shop
          </h1>
          <p className="text-lavanda/60 text-sm mt-1">Panel de administración</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-navy rounded-xl border border-lavanda/10 p-6 space-y-4">
          <Suspense>
            <AvisoSinPermiso hayOtroError={!!error} />
          </Suspense>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm text-lavanda/60 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-niebla placeholder-lavanda/30 focus:outline-none focus:border-purpura transition-colors"
              placeholder="admin@sendero3d.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-lavanda/60 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-niebla placeholder-lavanda/30 focus:outline-none focus:border-purpura transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-purpura hover:bg-purpura/80 disabled:bg-purpura/40 text-niebla font-semibold rounded-lg transition-colors"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
