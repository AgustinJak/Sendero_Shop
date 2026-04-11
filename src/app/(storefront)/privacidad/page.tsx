import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  alternates: { canonical: "https://sendero3d.com/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-[family-name:var(--font-cinzel)] text-3xl sm:text-4xl font-bold text-niebla mb-8 text-center">
        Política de Privacidad
      </h1>

      <div className="space-y-6 text-lavanda-light text-sm leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-niebla [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_li]:mb-1 [&_a]:text-ambar [&_a]:underline [&_strong]:font-bold [&_strong]:text-niebla">
        <p className="text-xs text-lavanda/70">Última actualización: Marzo 2026</p>

        <Section title="1. Datos que recopilamos">
          <p>Al realizar una compra, recopilamos los siguientes datos personales:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-lavanda/70">
            <li>Nombre completo</li>
            <li>DNI</li>
            <li>Email</li>
            <li>Teléfono</li>
            <li>Dirección de envío (si corresponde)</li>
          </ul>
        </Section>

        <Section title="2. Uso de los datos">
          <p>Los datos personales se utilizan exclusivamente para:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-lavanda/70">
            <li>Procesar y gestionar pedidos</li>
            <li>Enviar notificaciones sobre el estado del pedido</li>
            <li>Responder consultas de soporte</li>
            <li>Cumplir con obligaciones legales y fiscales</li>
          </ul>
        </Section>

        <Section title="3. Almacenamiento y seguridad">
          <p>
            Los datos se almacenan en servidores seguros proporcionados por Supabase (infraestructura
            AWS). No almacenamos datos de tarjetas de crédito; los pagos son procesados directamente
            por MercadoPago.
          </p>
        </Section>

        <Section title="4. Compartición de datos">
          <p>
            No vendemos, alquilamos ni compartimos datos personales con terceros, excepto con los
            servicios necesarios para operar la tienda:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-lavanda/70">
            <li>MercadoPago (procesamiento de pagos)</li>
            <li>Correo Argentino / Andreani (envíos)</li>
            <li>Google Analytics (analítica web anonimizada)</li>
          </ul>
        </Section>

        <Section title="5. Cookies">
          <p>
            Utilizamos cookies técnicas necesarias para el funcionamiento del carrito de compras y
            la sesión del usuario. También utilizamos Google Analytics para entender cómo los usuarios
            navegan el sitio. Podés desactivar las cookies desde la configuración de tu navegador.
          </p>
        </Section>

        <Section title="6. Derechos del usuario">
          <p>
            De acuerdo con la Ley 25.326 de Protección de Datos Personales, tenés derecho a acceder,
            rectificar y suprimir tus datos personales. Para ejercer estos derechos, contactanos por
            WhatsApp al +54 9 11 2550-2785 o por email a ayuda@sendero3d.com.
          </p>
        </Section>

        <Section title="7. Cambios en esta política">
          <p>
            Nos reservamos el derecho de actualizar esta política. Los cambios se publicarán en esta
            misma página con la fecha de actualización correspondiente.
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
