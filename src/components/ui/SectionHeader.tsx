import Link from "next/link";

/**
 * Encabezado de sección: volanta + título + bajada, con un link opcional
 * alineado a la derecha.
 *
 * Antes cada sección de la home era solo un título centrado en negrita y
 * arrancaba la grilla. El patrón de tres partes hace que la sección se
 * presente — dice de qué va y por qué mirarla — y es la diferencia más
 * visible entre una página armada y una redactada.
 *
 * El link va acá y no suelto al final de la grilla para que el usuario sepa
 * que hay más antes de empezar a scrollear, no después.
 */
export default function SectionHeader({
  volanta,
  titulo,
  bajada,
  href,
  hrefLabel = "Ver todo",
  centrado = false,
}: {
  volanta?: string;
  titulo: string;
  bajada?: string;
  href?: string;
  hrefLabel?: string;
  centrado?: boolean;
}) {
  return (
    <div
      className={`mb-8 flex gap-6 ${
        centrado
          ? "flex-col items-center text-center"
          : "flex-col items-start sm:flex-row sm:items-end sm:justify-between"
      }`}
    >
      <div className={centrado ? "max-w-2xl" : "max-w-[52ch]"}>
        {volanta && <p className="volanta mb-2">{volanta}</p>}
        <h2 className="display display-seccion text-texto">{titulo}</h2>
        {bajada && <p className="mt-3 text-texto-3">{bajada}</p>}
      </div>

      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-2 font-semibold text-ambar transition-colors hover:text-ambar-light"
        >
          {hrefLabel}
          <svg
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.4}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      )}
    </div>
  );
}
