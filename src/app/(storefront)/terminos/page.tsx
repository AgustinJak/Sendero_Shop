import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  alternates: { canonical: "https://sendero3d.com/terminos" },
};

export default function TerminosPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-[family-name:var(--font-cinzel)] text-3xl sm:text-4xl font-bold text-niebla mb-8 text-center">
        Términos y Condiciones
      </h1>

      <div className="space-y-6 text-lavanda-light text-sm leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-niebla [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_li]:mb-1 [&_a]:text-ambar [&_a]:underline [&_strong]:font-bold [&_strong]:text-niebla">
        <p className="text-xs text-lavanda/70">Última actualización: Marzo 2026</p>

        <Section title="1. Información general">
          <p>
            Sendero Shop es un emprendimiento de impresión 3D con domicilio en Villa Crespo, Ciudad
            Autónoma de Buenos Aires, Argentina. Al realizar una compra en sendero3d.com, el usuario
            acepta los presentes términos y condiciones.
          </p>
        </Section>

        <Section title="2. Productos">
          <p>
            Todos los productos son fabricados a pedido mediante impresión 3D. Las imágenes son
            ilustrativas y pueden presentar leves variaciones de color o textura respecto al producto
            final. Cada pieza es única y artesanal.
          </p>
        </Section>

        <Section title="3. Precios y pagos">
          <p>
            Los precios están expresados en pesos argentinos (ARS) e incluyen IVA cuando corresponda.
            Sendero Shop se reserva el derecho de modificar precios sin previo aviso. Los medios de
            pago aceptados son: MercadoPago, Tarjeta de Debito/Creadito, transferencia bancaria y efectivo (solo retiro en persona).
          </p>
        </Section>

        <Section title="4. Producción y envío">
          <p>
            Los tiempos de producción varían según el producto (generalmente 5 a 10 días hábiles).
            Los envíos se realizan a todo el país a través de Correo Argentino o Andreani. Los costos
            de envío se calculan al momento de la compra. También ofrecemos retiro en persona
            coordinando previamente por WhatsApp.
          </p>
        </Section>

        <Section title="5. Cancelaciones">
          <p>
            El cliente puede cancelar su pedido antes de que entre en producción. Una vez iniciada
            la impresión, no es posible cancelar. Para cancelar, usar el botón correspondiente en
            la página de seguimiento del pedido o contactar por WhatsApp.
          </p>
        </Section>

        <Section title="6. Devoluciones y garantía">
          <p>
            Por la naturaleza artesanal de los productos impresos en 3D, no se aceptan devoluciones
            por arrepentimiento salvo lo dispuesto por la Ley 24.240 de Defensa del Consumidor. En
            caso de productos defectuosos o dañados durante el envío, contactar dentro de las 24h
            de recibido con fotos del producto.
          </p>
        </Section>

        <Section title="7. Propiedad intelectual">
          <p>
            Los modelos 3D utilizados pueden estar basados en personajes de terceros y se venden
            como piezas artesanales de fan-art. Sendero Shop no reclama propiedad sobre las marcas
            o personajes representados.
          </p>
        </Section>

        <Section title="8. Contacto">
          <p>
            Para consultas sobre estos términos, contactar a través de WhatsApp al +54 9 11 2550-2785
            o por email a ayuda@sendero3d.com.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-cinzel)] text-base font-bold text-niebla mb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}
