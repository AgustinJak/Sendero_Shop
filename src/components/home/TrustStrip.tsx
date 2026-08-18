/**
 * Franja de confianza, justo debajo del hero.
 *
 * Las señales de confianza vivían solo en la ficha de producto — o sea, donde
 * el visitante ya estaba decidido. Acá aparecen en el primer scroll, que es
 * donde alguien que no conoce la marca decide si sigue o se va.
 *
 * Cuatro ítems y no más: en mobile entran en dos filas de dos y cada uno
 * queda legible.
 *
 * Repite en parte lo que dice la barra superior, y es a propósito: la barra
 * es un renglón que se scrollea y se olvida, esto es el bloque donde la
 * promesa se explica. Los separadores solo aparecen desde `lg`, cuando los
 * cuatro están en una fila y el corte tiene sentido.
 */

const ITEMS = [
  {
    titulo: "Envíos a todo el país",
    detalle: "Correo Argentino, cotizado en vivo",
    icono: (
      <>
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="1.8" />
        <circle cx="17.5" cy="18" r="1.8" />
      </>
    ),
  },
  {
    titulo: "Retiro en persona",
    detalle: "Villa Crespo, CABA — coordinamos día",
    icono: (
      <>
        <path d="m3 11 9-7 9 7" />
        <path d="M5.5 10v10h13V10" />
        <path d="M10 20v-5h4v5" />
      </>
    ),
  },
  {
    titulo: "Fabricación propia",
    detalle: "Hecho en nuestro taller, pieza por pieza",
    icono: (
      <>
        <path d="M12 3 4 7.5v9L12 21l8-4.5v-9z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </>
    ),
  },
  {
    titulo: "Descuento por cantidad",
    detalle: "Se aplica solo en el carrito",
    icono: (
      <>
        <path d="M20.6 13.4 12 22l-9-9V3h10z" />
        <circle cx="7.5" cy="7.5" r="1.6" />
      </>
    ),
  },
];

export default function TrustStrip() {
  return (
    <section className="border-y border-linea bg-navy-deep/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-7 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
        {ITEMS.map((item, i) => (
          <div
            key={item.titulo}
            className={`flex items-start gap-3 ${
              i > 0 ? "lg:border-l lg:border-linea lg:pl-6" : ""
            }`}
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ambar/10 text-ambar">
              <svg
                className="h-[19px] w-[19px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {item.icono}
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-texto">{item.titulo}</span>
              <span className="block text-xs text-texto-3">{item.detalle}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
