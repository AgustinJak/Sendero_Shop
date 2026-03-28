export default function CatalogoLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title skeleton */}
      <div className="h-8 w-48 bg-lavanda/10 rounded-lg animate-pulse mb-6" />

      <div className="flex gap-8">
        {/* Sidebar skeleton */}
        <div className="hidden lg:block w-64 shrink-0 space-y-6">
          <div className="space-y-3">
            <div className="h-5 w-28 bg-lavanda/10 rounded animate-pulse" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 bg-lavanda/5 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
            ))}
          </div>
          <div className="space-y-3">
            <div className="h-5 w-20 bg-lavanda/10 rounded animate-pulse" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 bg-lavanda/5 rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
            ))}
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <div className="h-4 w-32 bg-lavanda/10 rounded animate-pulse" />
            <div className="h-9 w-40 bg-lavanda/10 rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="bg-navy rounded-xl border border-lavanda/10 overflow-hidden">
      <div className="aspect-square bg-lavanda/5 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-16 bg-lavanda/5 rounded animate-pulse" />
        <div className="h-4 bg-lavanda/10 rounded animate-pulse" />
        <div className="h-5 w-24 bg-lavanda/10 rounded animate-pulse" />
      </div>
    </div>
  );
}
