export default function CatalogoLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-40 bg-lavanda/10 rounded animate-pulse" />
          <div className="h-4 w-24 bg-lavanda/5 rounded animate-pulse mt-2" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-24 bg-lavanda/10 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-lavanda/10 rounded-lg animate-pulse" />
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar skeleton — desktop only */}
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

        {/* Grid skeleton */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bg-navy-deep rounded-xl overflow-hidden border border-lavanda/10"
            >
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
    </div>
  );
}
