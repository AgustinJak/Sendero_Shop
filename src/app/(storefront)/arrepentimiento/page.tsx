import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Botón de Arrepentimiento",
  description:
    "Ejercé tu derecho de arrepentimiento según la Ley 24.240 de Defensa del Consumidor.",
  alternates: { canonical: "https://sendero3d.com/arrepentimiento" },
};

export default function ArrepentimientoPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-[family-name:var(--font-cinzel)] text-3xl sm:text-4xl font-bold text-niebla mb-8 text-center">
        Botón de Arrepentimiento
      </h1>

      <div className="space-y-6 text-lavanda-light text-sm leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-niebla [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_li]:mb-1 [&_a]:text-ambar [&_a]:underline [&_strong]:font-bold [&_strong]:text-niebla">
        <div className="bg-ambar/10 border border-ambar/20 rounded-xl p-6">
          <h2 className="font-[family-name:var(--font-cinzel)] text-base font-bold text-ambar mb-2">
            Derecho de Revocación
          </h2>
          <p>
            De acuerdo con el artículo 34 de la Ley 24.240 de Defensa del Consumidor, tenés
            derecho a revocar la aceptación de tu compra dentro de los <strong className="text-niebla">10 días
            corridos</strong> contados a partir de la recepción del producto o de la celebración del
            contrato (lo que ocurra último), sin necesidad de justificar tu decisión y sin costo alguno.
          </p>
        </div>

        <Section title="Cómo ejercer tu derecho">
          <p>Para solicitar la devolución podés:</p>
          <ol className="list-decimal list-inside mt-2 space-y-2 text-lavanda/70">
            <li>
              <strong className="text-lavanda-light">Cancelar desde tu pedido:</strong> Si tu pedido aún no
              fue enviado, podés cancelarlo directamente desde la{" "}
              <Link href="/mi-pedido" className="text-purpura hover:text-purpura/80 underline">
                página de seguimiento
              </Link>.
            </li>
            <li>
              <strong className="text-lavanda-light">Contactarnos por WhatsApp:</strong> Escribinos al{" "}
              <a
                href="https://wa.me/5491125502785?text=Hola!%20Quiero%20ejercer%20mi%20derecho%20de%20arrepentimiento.%20Mi%20número%20de%20pedido%20es:%20"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purpura hover:text-purpura/80 underline"
              >
                +54 9 11 2550-2785
              </a>{" "}
              indicando tu número de pedido.
            </li>
            <li>
              <strong className="text-lavanda-light">Enviar un email:</strong> Escribí a{" "}
              <a href="mailto:ayuda@sendero3d.com" className="text-purpura hover:text-purpura/80 underline">
                ayuda@sendero3d.com
              </a>{" "}
              con el asunto &quot;Arrepentimiento - Pedido #[tu número]&quot;.
            </li>
          </ol>
        </Section>

        <Section title="Condiciones">
          <ul className="list-disc list-inside space-y-2 text-lavanda/70">
            <li>El producto debe estar en las mismas condiciones en que fue recibido.</li>
            <li>
              Por tratarse de productos fabricados a pedido, la devolución podría no aplicar una vez
              que la producción haya comenzado (Art. 34, excepciones por bienes personalizados).
            </li>
            <li>Los gastos de envío de devolución corren por cuenta del consumidor.</li>
            <li>
              El reembolso se realizará dentro de los 10 días hábiles posteriores a la recepción
              del producto devuelto, por el mismo medio de pago utilizado.
            </li>
          </ul>
        </Section>

        <Section title="Organismo de defensa del consumidor">
          <p>
            Para más información sobre tus derechos como consumidor, podés consultar en la{" "}
            <a
              href="https://www.argentina.gob.ar/produccion/defensadelconsumidor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purpura hover:text-purpura/80 underline"
            >
              Dirección Nacional de Defensa del Consumidor
            </a>
            .
          </p>
        </Section>

        <div className="text-center pt-4">
          <a
            href="https://wa.me/5491125502785?text=Hola!%20Quiero%20ejercer%20mi%20derecho%20de%20arrepentimiento.%20Mi%20número%20de%20pedido%20es:%20"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-ambar hover:bg-ambar-light text-navy font-semibold rounded-lg transition-colors"
          >
            Solicitar devolución por WhatsApp
          </a>
        </div>
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
