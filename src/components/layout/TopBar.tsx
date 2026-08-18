import { formatPrice } from "@/lib/utils";

/**
 * Barra de anuncios sobre el header.
 *
 * Las señales de confianza estaban solo en la ficha de producto, o sea donde
 * el visitante ya venía decidido. Acá aparecen en todas las páginas y en el
 * primer píxel, que es donde alguien que no conoce la marca decide si sigue.
 *
 * El umbral de envío gratis sale de la config (`envio_gratis_desde`), no
 * hardcodeado: si lo cambiás en el admin, la barra acompaña. Con el valor en
 * 0 la promesa desaparece en vez de anunciar "envío gratis desde $0".
 *
 * El de MercadoLíder no es un link a propósito: la barra está en todas las
 * páginas, checkout incluido, y mandar a Mercado Libre ahí es abrir una puerta
 * de salida en el peor momento.
 *
 * Los cuatro ítems en una línea no entran hasta pantallas anchas, así que
 * aparecen por tramos en orden de importancia. Sin esto el ancho fijo de la
 * barra empujaba el scroll horizontal de toda la página.
 */
export default function TopBar({ envioGratisDesde = 0 }: { envioGratisDesde?: number }) {
  const items = [
    envioGratisDesde > 0 && {
      clave: "gratis",
      icono: "✦",
      fuerte: "Envío gratis",
      resto: `desde ${formatPrice(envioGratisDesde)}`,
      desde: "",
    },
    {
      clave: "mercadolider",
      icono: "★",
      fuerte: "MercadoLíder Gold",
      resto: "",
      desde: "sm",
      dorado: true,
    },
    {
      clave: "retiro",
      icono: "▸",
      fuerte: "Retiro sin cargo",
      resto: "en Villa Crespo",
      desde: "lg",
    },
    {
      clave: "taller",
      icono: "▸",
      fuerte: "Fabricación propia",
      resto: "hecho a pedido",
      desde: "xl",
    },
  ].filter(Boolean) as {
    clave: string;
    icono: string;
    fuerte: string;
    resto: string;
    desde: string;
    dorado?: boolean;
  }[];

  // Tailwind necesita las clases completas en el fuente, no armadas por
  // concatenación, o no las genera.
  const visibilidad: Record<string, string> = {
    "": "flex",
    sm: "hidden sm:flex",
    lg: "hidden lg:flex",
    xl: "hidden xl:flex",
  };

  return (
    <div className="border-b border-linea bg-navy-deep">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-x-6 gap-y-1 px-4 py-2 text-xs sm:px-6 lg:px-8">
        {items.map((item, i) => (
          <span
            key={item.clave}
            className={`items-center gap-1.5 whitespace-nowrap ${visibilidad[item.desde]}`}
          >
            {i > 0 && (
              <span className="mr-4 text-linea-fuerte" aria-hidden="true">
                ·
              </span>
            )}
            <span className="text-ambar" aria-hidden="true">
              {item.icono}
            </span>
            <span className={`font-semibold ${item.dorado ? "text-ambar" : "text-texto"}`}>
              {item.fuerte}
            </span>
            {item.resto && <span className="text-texto-3">{item.resto}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
