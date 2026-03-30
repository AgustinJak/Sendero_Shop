import { createServiceRoleClient } from "@/lib/supabase-server";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import DeleteProductButton from "@/components/admin/DeleteProductButton";

export default async function ProductosAdminPage() {
  const supabase = await createServiceRoleClient();

  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, slug, precio, precio_oferta, activo, destacado, linea, categoria:categorias(nombre), imagenes:producto_imagenes(url, orden)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
          Productos
        </h1>
        <Link
          href="/admin/productos/nuevo"
          className="px-4 py-2 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-medium rounded-lg transition-colors"
        >
          + Nuevo producto
        </Link>
      </div>

      <div className="bg-navy rounded-xl border border-lavanda/10 overflow-hidden">
        {productos && productos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-lavanda/10 text-lavanda/60 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-left px-4 py-3">Categoría</th>
                  <th className="text-left px-4 py-3">Línea</th>
                  <th className="text-right px-4 py-3">Precio</th>
                  <th className="text-center px-4 py-3">Estado</th>
                  <th className="text-center px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lavanda/5">
                {productos.map((prod) => {
                  const img = (prod.imagenes as { url: string; orden: number }[])
                    ?.sort((a, b) => a.orden - b.orden)[0];
                  const cat = prod.categoria as unknown as { nombre: string } | null;
                  return (
                    <tr key={prod.id} className="hover:bg-lavanda/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {img ? (
                            <img src={img.url} alt="" className="w-10 h-10 rounded-lg object-cover bg-navy-deep" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-navy-deep flex items-center justify-center text-lavanda/20">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <p className="text-lavanda-light font-medium">{prod.nombre}</p>
                            <div className="flex gap-1 mt-0.5">
                              {prod.destacado && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-ambar/10 text-ambar">DESTACADO</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-lavanda/60">{cat?.nombre || "—"}</td>
                      <td className="px-4 py-3 text-lavanda/60">{prod.linea || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {prod.precio_oferta ? (
                          <div>
                            <span className="text-red-400 line-through text-xs">{formatPrice(prod.precio)}</span>
                            <span className="text-ambar font-medium ml-1">{formatPrice(prod.precio_oferta)}</span>
                          </div>
                        ) : (
                          <span className="text-niebla">{formatPrice(prod.precio)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          prod.activo ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
                        }`}>
                          {prod.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <Link
                            href={`/admin/productos/${prod.id}`}
                            className="text-ambar hover:text-ambar-light text-xs transition-colors"
                          >
                            Editar
                          </Link>
                          <DeleteProductButton id={prod.id} nombre={prod.nombre} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-8 text-center text-lavanda/40">No hay productos</p>
        )}
      </div>
    </div>
  );
}
