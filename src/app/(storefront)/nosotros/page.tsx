import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Conoce a Sendero Shop: figuras y accesorios impresos en 3D. Producción a pedido desde Buenos Aires.",
  alternates: { canonical: "https://sendero3d.com/nosotros" },
};

export default function NosotrosPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-[family-name:var(--font-cinzel)] text-3xl sm:text-4xl font-bold text-niebla mb-8 text-center">
        Nosotros
      </h1>

      <div className="space-y-6 text-lavanda-light leading-relaxed">
        <p>
          <strong className="text-niebla">Sendero Shop</strong> nace de la
          pasión por la impresión 3D y la cultura geek. Desde Buenos Aires,
          diseñamos y fabricamos figuras, katanas, accesorios y piezas
          decorativas.
        </p>

        <p>
          Cada producto es impreso a pedido, lo que nos permite ofrecer piezas
          únicas con atención al detalle. Usamos materiales de alta calidad y
          técnicas de post-procesado para lograr acabados que superan
          expectativas.
        </p>

        <div className="bg-navy-deep border border-lavanda/10 rounded-xl p-6 space-y-4">
          <h2 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
            Nuestro proceso
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                title: "Diseño",
                desc: "Seleccionamos y preparamos modelos con el mayor nivel de detalle.",
              },
              {
                step: "02",
                title: "Impresión",
                desc: "Fabricamos cada pieza con impresoras 3D de alta resolución.",
              },
              {
                step: "03",
                title: "Acabado",
                desc: "Aplicamos el acabado final para un resultado premium.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <span className="text-ambar font-bold text-2xl">{item.step}</span>
                <h3 className="text-niebla font-semibold mt-1">{item.title}</h3>
                <p className="text-sm text-lavanda/70 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p>
          Creemos que cada pieza cuenta una historia. Ya sea una katana de tu
          anime favorito o una figura decorativa minimalista, ponemos el mismo
          cuidado y dedicación en cada impresión.
        </p>

        <div className="text-center pt-4">
          <a
            href="https://wa.me/5491125502785?text=Hola!%20Quiero%20saber%20m%C3%A1s%20sobre%20Sendero%20Shop"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contactanos
          </a>
        </div>
      </div>
    </div>
  );
}
