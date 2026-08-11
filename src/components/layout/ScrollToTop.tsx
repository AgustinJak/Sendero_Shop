"use client";

import { useState, useEffect } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 500);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollUp() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Sin AnimatePresence: dejaba un botón invisible pero clickeable fijo en la
  // esquina, que al tocarlo saltaba al inicio sin que se viera nada ahí.
  if (!visible) return null;

  return (
    <button
      onClick={scrollUp}
      className="fixed bottom-44 right-6 z-40 w-10 h-10 bg-navy-deep/90 border border-lavanda/20 rounded-full flex items-center justify-center text-lavanda-light hover:text-niebla hover:border-lavanda/40 transition-colors backdrop-blur-sm shadow-lg cursor-pointer animate-fade-in"
      aria-label="Volver arriba"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    </button>
  );
}
