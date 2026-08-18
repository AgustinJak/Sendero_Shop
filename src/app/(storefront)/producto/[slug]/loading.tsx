export default function ProductoLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-64 bg-lavanda/5 rounded animate-pulse mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gallery skeleton */}
        <div className="space-y-3">
          <div className="aspect-square bg-lavanda/5 rounded-xl animate-pulse" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-16 h-16 bg-lavanda/5 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>

        {/* Info skeleton */}
        <div className="space-y-4">
          <div className="h-3 w-20 bg-lavanda/5 rounded animate-pulse" />
          <div className="h-8 w-3/4 bg-lavanda/10 rounded-lg animate-pulse" />
          <div className="h-7 w-32 bg-ambar/10 rounded animate-pulse" />

          <div className="border-t border-linea pt-4 space-y-3">
            <div className="h-5 w-24 bg-lavanda/10 rounded animate-pulse" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 w-24 bg-lavanda/5 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>

          <div className="h-12 w-full bg-purpura/20 rounded-xl animate-pulse mt-4" />

          <div className="border-t border-linea pt-4 space-y-2">
            <div className="h-5 w-28 bg-lavanda/10 rounded animate-pulse" />
            <div className="h-3 bg-lavanda/5 rounded animate-pulse" />
            <div className="h-3 bg-lavanda/5 rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-lavanda/5 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
