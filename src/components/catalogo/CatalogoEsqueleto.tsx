/**
 * Esqueleto del catálogo: encabezado, filtros y grilla.
 *
 * Se usa en dos lugares: en `catalogo/loading.tsx` (navegación) y como
 * fallback del `<Suspense>` de la página. Ese Suspense no tenía fallback: el
 * servidor mandaba el banner con un hueco vacío, el footer quedaba pegado al
 * banner en pleno viewport y saltaba al llegar la grilla (CLS 0,38 en PC).
 * Con el esqueleto el espacio queda reservado desde el primer pintado.
 *
 * Las alturas imitan las del contenido real; si cambia el encabezado del
 * catálogo, ajustar acá también.
 */
export default function CatalogoEsqueleto() {
  return (
    <>
      {/* Encabezado: volanta + título + bajada, y los botones a la derecha */}
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <div className="h-3 w-32 bg-lavanda/10 rounded animate-pulse mb-3" />
          <div className="h-10 w-56 bg-lavanda/10 rounded animate-pulse" />
          <div className="h-4 w-64 max-w-full bg-lavanda/5 rounded animate-pulse mt-4" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-24 bg-lavanda/10 rounded-lg animate-pulse lg:hidden" />
          <div className="h-10 w-32 bg-lavanda/10 rounded-lg animate-pulse" />
        </div>
      </div>

      <div className="flex gap-8">
        {/* Filtros — solo en desktop */}
        <div className="hidden lg:block w-56 shrink-0 space-y-4">
          <div className="h-4 w-20 bg-lavanda/10 rounded animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-lavanda/5 rounded animate-pulse" />
            ))}
          </div>
          <div className="h-px bg-lavanda/10 my-4" />
          <div className="h-4 w-16 bg-lavanda/10 rounded animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 bg-lavanda/5 rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* Grilla */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-navy-deep rounded-xl overflow-hidden border border-linea">
              <div className="aspect-square bg-lavanda/5 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-16 bg-lavanda/10 rounded animate-pulse" />
                <div className="h-4 w-full bg-lavanda/10 rounded animate-pulse" />
                <div className="h-5 w-20 bg-lavanda/10 rounded animate-pulse mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
