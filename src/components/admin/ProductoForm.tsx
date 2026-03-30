"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Producto, Categoria } from "@/types";
import { slugify, formatPrice } from "@/lib/utils";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), { ssr: false });

export interface ProductoFormData {
  nombre: string;
  slug: string;
  descripcion: string;
  precio: number;
  precio_oferta: number | null;
  categoria_id: string;
  activo: boolean;
  destacado: boolean;
  stock_tipo: "print-on-demand" | "limitado";
  tiempo_produccion: number;
  linea: string;
  tamano: string;
  peso_gr: number | null;
  sku: string;
  meta_title: string;
  meta_description: string;
}

interface Props {
  producto?: Producto;
  categorias: Categoria[];
  onFormChange?: (data: ProductoFormData) => void;
}

export default function ProductoForm({ producto, categorias, onFormChange }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Flatten categorías for select (defined early for use in auto-generation)
  const flatCategorias: { id: string; nombre: string; depth: number }[] = [];
  function flattenCats(cats: Categoria[], depth = 0) {
    for (const cat of cats) {
      flatCategorias.push({ id: cat.id, nombre: cat.nombre, depth });
      if (cat.children) flattenCats(cat.children, depth + 1);
    }
  }
  flattenCats(categorias);

  const [form, setForm] = useState<ProductoFormData>({
    nombre: producto?.nombre || "",
    slug: producto?.slug || "",
    descripcion: producto?.descripcion || "",
    precio: producto?.precio || 0,
    precio_oferta: producto?.precio_oferta ?? null,
    categoria_id: producto?.categoria_id || "",
    activo: producto?.activo ?? true,
    destacado: producto?.destacado ?? false,
    stock_tipo: producto?.stock_tipo || "print-on-demand",
    tiempo_produccion: producto?.tiempo_produccion || 7,
    linea: producto?.linea || "",
    tamano: producto?.tamano || "",
    peso_gr: producto?.peso_gr ?? null,
    sku: producto?.sku || "",
    meta_title: producto?.meta_title || "",
    meta_description: producto?.meta_description || "",
  });

  // Track which fields the user has manually edited
  const [manualEdits, setManualEdits] = useState<Set<string>>(() => {
    const edits = new Set<string>();
    // If editing existing product, mark non-empty fields as manually edited
    if (producto) {
      if (producto.sku) edits.add("sku");
      if (producto.meta_title) edits.add("meta_title");
      if (producto.meta_description) edits.add("meta_description");
    }
    return edits;
  });

  // Notify parent of form changes for preview
  useEffect(() => {
    onFormChange?.(form);
  }, [form, onFormChange]);

  const [skuSeq, setSkuSeq] = useState<number | null>(null);

  // Fetch next SKU sequence number on mount (only for new products)
  useEffect(() => {
    if (!producto) {
      fetch("/api/admin/productos/next-sku")
        .then((r) => r.json())
        .then((data) => setSkuSeq(data.next || 1))
        .catch(() => setSkuSeq(1));
    }
  }, [producto]);

  // Auto-generate SKU
  function generateSku(nombre: string, linea: string, categoriaId: string): string {
    const cat = flatCategorias.find((c) => c.id === categoriaId);
    const parts = ["SS"];
    if (linea) parts.push(linea.slice(0, 3).toUpperCase().replace(/\s/g, ""));
    if (cat) parts.push(cat.nombre.slice(0, 3).toUpperCase().replace(/\s/g, ""));
    const seq = skuSeq ?? 1;
    parts.push(String(seq).padStart(3, "0"));
    return parts.join("-");
  }

  // Auto-generate meta title
  function generateMetaTitle(nombre: string): string {
    if (!nombre) return "";
    return `${nombre} — Sendero Shop`;
  }

  // Auto-generate meta description
  function generateMetaDesc(nombre: string, linea: string, precio: number): string {
    if (!nombre) return "";
    const parts = [nombre];
    if (linea) parts.push(`de ${linea}`);
    parts.push("impreso en 3D");
    if (precio > 0) parts.push(formatPrice(precio));
    parts.push("Envío a todo Argentina");
    return parts.join(", ") + ".";
  }

  // Auto-fill generated fields
  function autoFill(data: ProductoFormData): ProductoFormData {
    const updated = { ...data };
    if (!manualEdits.has("sku")) {
      updated.sku = generateSku(data.nombre, data.linea, data.categoria_id);
    }
    if (!manualEdits.has("meta_title")) {
      updated.meta_title = generateMetaTitle(data.nombre);
    }
    if (!manualEdits.has("meta_description")) {
      updated.meta_description = generateMetaDesc(data.nombre, data.linea, data.precio);
    }
    return updated;
  }

  // Auto-slug from nombre
  function handleNombreChange(nombre: string) {
    setForm((prev) => autoFill({
      ...prev,
      nombre,
      slug: producto ? prev.slug : slugify(nombre),
    }));
  }

  function updateField<K extends keyof ProductoFormData>(key: K, value: ProductoFormData[K]) {
    setForm((prev) => autoFill({ ...prev, [key]: value }));
  }

  // For manually editable auto-fields
  function updateAutoField<K extends keyof ProductoFormData>(key: K, value: ProductoFormData[K]) {
    setManualEdits((prev) => {
      const next = new Set(prev);
      if (value === "" || value === null) {
        next.delete(key); // empty = go back to auto
      } else {
        next.add(key);
      }
      return next;
    });
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = producto
        ? `/api/admin/productos/${producto.id}`
        : "/api/admin/productos";
      const method = producto ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar");
      }

      // If creating, redirect to edit page so user can upload images
      if (!producto && data.id) {
        router.push(`/admin/productos/${data.id}`);
      } else {
        router.push("/admin/productos");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Nombre y Slug */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-lavanda/60 mb-1">Nombre *</label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => handleNombreChange(e.target.value)}
            required
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          />
        </div>
        <div>
          <label className="block text-sm text-lavanda/60 mb-1">Slug</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => updateField("slug", e.target.value)}
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          />
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm text-lavanda/60 mb-1">Descripción</label>
        <RichTextEditor
          content={form.descripcion}
          onChange={(html) => updateField("descripcion", html)}
        />
      </div>

      {/* Precio, Oferta, Categoría */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-lavanda/60 mb-1">Precio *</label>
          <input
            type="number"
            value={form.precio}
            onChange={(e) => updateField("precio", Number(e.target.value))}
            min={0}
            step={1}
            required
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          />
        </div>
        <div>
          <label className="block text-sm text-lavanda/60 mb-1">Precio oferta</label>
          <input
            type="number"
            value={form.precio_oferta ?? ""}
            onChange={(e) => updateField("precio_oferta", e.target.value ? Number(e.target.value) : null)}
            min={0}
            step={1}
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          />
        </div>
        <div>
          <label className="block text-sm text-lavanda/60 mb-1">Categoría</label>
          <select
            value={form.categoria_id}
            onChange={(e) => updateField("categoria_id", e.target.value)}
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          >
            <option value="">Sin categoría</option>
            {flatCategorias.map((c) => (
              <option key={c.id} value={c.id}>
                {"— ".repeat(c.depth)}{c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Línea, Tamaño */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-lavanda/60 mb-1">Línea</label>
          <input
            type="text"
            value={form.linea}
            onChange={(e) => updateField("linea", e.target.value)}
            placeholder="Ej: One Piece, Minimalista, Decoración"
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          />
        </div>
        <div>
          <label className="block text-sm text-lavanda/60 mb-1">Tamaño</label>
          <input
            type="text"
            value={form.tamano}
            onChange={(e) => updateField("tamano", e.target.value)}
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          />
        </div>
      </div>

      {/* SKU, Peso, Tiempo producción */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-lavanda/60 mb-1">
            SKU {!manualEdits.has("sku") && <span className="text-lavanda/30 text-xs">(auto)</span>}
          </label>
          <input
            type="text"
            value={form.sku}
            onChange={(e) => updateAutoField("sku", e.target.value)}
            placeholder="Se genera automáticamente"
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          />
        </div>
        <div>
          <label className="block text-sm text-lavanda/60 mb-1">Peso (gr)</label>
          <input
            type="number"
            value={form.peso_gr ?? ""}
            onChange={(e) => updateField("peso_gr", e.target.value ? Number(e.target.value) : null)}
            min={0}
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          />
        </div>
        <div>
          <label className="block text-sm text-lavanda/60 mb-1">Tiempo producción (días)</label>
          <input
            type="number"
            value={form.tiempo_produccion}
            onChange={(e) => updateField("tiempo_produccion", Number(e.target.value))}
            min={1}
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          />
        </div>
      </div>

      {/* Stock tipo */}
      <div>
        <label className="block text-sm text-lavanda/60 mb-1">Tipo de stock</label>
        <select
          value={form.stock_tipo}
          onChange={(e) => updateField("stock_tipo", e.target.value as "print-on-demand" | "limitado")}
          className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura max-w-xs"
        >
          <option value="print-on-demand">Print on demand</option>
          <option value="limitado">Limitado</option>
        </select>
      </div>

      {/* SEO */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-niebla">SEO</h3>
        <div>
          <label className="block text-sm text-lavanda/60 mb-1">
            Meta title {!manualEdits.has("meta_title") && <span className="text-lavanda/30 text-xs">(auto)</span>}
          </label>
          <input
            type="text"
            value={form.meta_title}
            onChange={(e) => updateAutoField("meta_title", e.target.value)}
            placeholder="Se genera automáticamente"
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          />
        </div>
        <div>
          <label className="block text-sm text-lavanda/60 mb-1">
            Meta description {!manualEdits.has("meta_description") && <span className="text-lavanda/30 text-xs">(auto)</span>}
          </label>
          <textarea
            value={form.meta_description}
            onChange={(e) => updateAutoField("meta_description", e.target.value)}
            rows={2}
            placeholder="Se genera automáticamente"
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura resize-none"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(e) => updateField("activo", e.target.checked)}
            className="accent-purpura"
          />
          <span className="text-sm text-lavanda-light">Activo</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.destacado}
            onChange={(e) => updateField("destacado", e.target.checked)}
            className="accent-ambar"
          />
          <span className="text-sm text-lavanda-light">Destacado</span>
        </label>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-purpura hover:bg-purpura/80 disabled:bg-purpura/40 text-niebla font-semibold rounded-lg transition-colors"
        >
          {loading ? "Guardando..." : producto ? "Guardar cambios" : "Crear producto"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/productos")}
          className="px-6 py-2.5 border border-lavanda/20 text-lavanda-light hover:bg-lavanda/5 rounded-lg transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
