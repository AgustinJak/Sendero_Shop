"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ConfigKey {
  key: string;
  label: string;
  placeholder: string;
}

export default function ConfigForm({
  configMap,
  configKeys,
}: {
  configMap: Record<string, string>;
  configKeys: ConfigKey[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({ ...configMap });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const entries = configKeys.map((ck) => ({
      key: ck.key,
      value: values[ck.key] || "",
    }));

    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });

    setLoading(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-navy rounded-xl border border-lavanda/10 p-6 space-y-4">
      {configKeys.map((ck) => (
        <div key={ck.key}>
          <label className="block text-sm text-lavanda/60 mb-1">{ck.label}</label>
          <input
            type="text"
            value={values[ck.key] || ""}
            onChange={(e) => updateValue(ck.key, e.target.value)}
            placeholder={ck.placeholder}
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light placeholder-lavanda/30 focus:outline-none focus:border-purpura"
          />
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-purpura hover:bg-purpura/80 disabled:bg-purpura/40 text-niebla font-semibold rounded-lg transition-colors"
        >
          {loading ? "Guardando..." : "Guardar configuración"}
        </button>
        {saved && (
          <span className="text-sm text-green-400">Guardado</span>
        )}
      </div>
    </form>
  );
}
