/**
 * Entrada suave de cada página. Es CSS (`animate-page-in`) y no framer-motion:
 * el motion.div anterior salía del server con `opacity: 0` y la página no se
 * veía hasta que el JS terminaba de hidratar. Ver `page-in` en globals.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in motion-reduce:animate-none">{children}</div>;
}
