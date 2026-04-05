"use client";

import { useFilterTransition } from "./FilterTransitionContext";

export default function GridLoadingOverlay({ children }: { children: React.ReactNode }) {
  const { isPending } = useFilterTransition();

  return (
    <div className="relative">
      {children}

      {/* Loading overlay */}
      {isPending && (
        <div className="absolute inset-0 bg-navy-deep/60 backdrop-blur-[1px] rounded-xl z-10 flex items-start justify-center pt-32 transition-opacity duration-200">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-purpura/30 border-t-ambar rounded-full animate-spin" />
            <span className="text-lavanda/70 text-sm animate-pulse">Filtrando...</span>
          </div>
        </div>
      )}
    </div>
  );
}
