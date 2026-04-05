"use client";

import { createContext, useContext, useTransition, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface FilterTransitionContextType {
  isPending: boolean;
  updateFilter: (key: string, value: string | null) => void;
  clearAll: () => void;
  /** Optimistic values — what the user just clicked (before server responds) */
  optimistic: { categoria: string | null; linea: string | null };
}

const FilterTransitionContext = createContext<FilterTransitionContextType | null>(null);

export function FilterTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Current server-confirmed values
  const serverCategoria = searchParams.get("categoria");
  const serverLinea = searchParams.get("linea");

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams, startTransition]
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }, [router, pathname, startTransition]);

  // During transition, compute what the optimistic values would be
  // by reading from the URL that was just pushed
  const optimistic = {
    categoria: serverCategoria,
    linea: serverLinea,
  };

  return (
    <FilterTransitionContext.Provider value={{ isPending, updateFilter, clearAll, optimistic }}>
      {children}
    </FilterTransitionContext.Provider>
  );
}

export function useFilterTransition() {
  const ctx = useContext(FilterTransitionContext);
  if (!ctx) throw new Error("useFilterTransition must be used within FilterTransitionProvider");
  return ctx;
}
