import Link from "next/link";
import { whatsappLink } from "@/lib/utils";

/**
 * Valor pseudoaleatorio estable a partir de una semilla.
 *
 * Las partículas usaban Math.random() durante el render: el server pintaba
 * unas posiciones y el cliente otras, y la hidratación no coincidía. Con esto
 * ambos calculan lo mismo y el resultado se ve igual de disperso.
 */
function disperso(semilla: number): number {
  const x = Math.sin(semilla) * 10000;
  return x - Math.floor(x);
}

// Se calcula una sola vez por módulo: no depende de props ni del render.
const PARTICULAS = Array.from({ length: 20 }, (_, i) => ({
  left: disperso(i + 1) * 100,
  top: disperso(i + 21) * 100,
  duration: 3 + disperso(i + 41) * 4,
  delay: disperso(i + 61) * 3,
}));

export default function HomeHero({
  whatsapp,
  unidadesVendidas = 0,
}: {
  whatsapp: string;
  unidadesVendidas?: number;
}) {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Partículas flotantes */}
      <div className="absolute inset-0 pointer-events-none">
        {PARTICULAS.map((p, i) => (
          // Vaivén en CSS (`particula` en globals.css); cada una con su ritmo.
          <div
            key={i}
            className="particula absolute w-1 h-1 bg-lavanda/40 rounded-full"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Entrada escalonada en CSS: corre apenas se pinta, sin esperar al JS.
            Con framer-motion este texto salía del server invisible. */}
        <p className="volanta mb-4 animate-subir [animation-duration:0.6s] motion-reduce:animate-none">
          Diseño y fabricación propia · Villa Crespo, CABA
        </p>

        <h1 className="display display-hero text-texto mb-6 animate-subir motion-reduce:animate-none">
          Sendero de los Sueños
        </h1>

        <p className="text-lg sm:text-xl text-texto-2 mb-8 max-w-2xl mx-auto animate-subir [animation-delay:0.2s] motion-reduce:animate-none">
          Figuras, katanas y accesorios de colección inspirados en tus
          franquicias favoritas. Cada pieza es única, fabricada a pedido para
          vos.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-subir [animation-delay:0.4s] motion-reduce:animate-none">
          <Link
            href="/catalogo"
            className="group relative inline-flex items-center justify-center px-8 py-3 bg-purpura hover:bg-purpura/80 text-niebla font-semibold rounded-lg overflow-hidden transition-colors"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative">Ver Catálogo</span>
          </Link>

          <a
            href={whatsappLink(whatsapp, "Hola! Quiero consultar por un producto")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-3 border border-linea-fuerte text-texto-2 hover:bg-lavanda/10 rounded-lg transition-colors"
          >
            Consultanos
          </a>
        </div>

        {unidadesVendidas > 0 && (
          <p className="mt-8 flex items-center justify-center gap-2 text-sm text-texto-3 animate-subir [animation-delay:0.6s] motion-reduce:animate-none">
            <span className="text-ambar tracking-widest" aria-hidden="true">★★★★★</span>
            <span>
              <b className="text-texto-2">+{Math.floor(unidadesVendidas / 10) * 10} piezas</b> entregadas a clientes
            </span>
          </p>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy to-transparent" />
    </section>
  );
}
