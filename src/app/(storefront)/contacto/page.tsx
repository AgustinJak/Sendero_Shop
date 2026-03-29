import type { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contacta a Sendero Shop por WhatsApp o formulario. Consultas, pedidos personalizados y soporte.",
  alternates: { canonical: "https://sendero3d.com/contacto" },
};

export default function ContactoPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-[family-name:var(--font-cinzel)] text-3xl sm:text-4xl font-bold text-niebla mb-4 text-center">
        Contacto
      </h1>
      <p className="text-lavanda-light text-center mb-10">
        Escribinos por WhatsApp o dejanos un mensaje y te respondemos a la brevedad.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* WhatsApp + info */}
        <div className="space-y-6">
          <a
            href="https://wa.me/5491125502785?text=Hola!%20Quiero%20hacer%20una%20consulta"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-green-600/10 border border-green-600/30 rounded-xl p-5 hover:bg-green-600/15 transition-colors group"
          >
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <p className="text-niebla font-semibold group-hover:text-green-400 transition-colors">
                WhatsApp
              </p>
              <p className="text-sm text-lavanda/60">
                +54 9 11 2550-2785
              </p>
            </div>
          </a>

          <div className="bg-navy-deep border border-lavanda/10 rounded-xl p-5 space-y-3">
            <h3 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider">
              Horarios de atención
            </h3>
            <div className="text-sm text-lavanda-light space-y-1">
              <p>Lunes a Viernes: 10:00 - 19:00</p>
              <p>Sábados: 10:00 - 14:00</p>
            </div>
          </div>

          <div className="bg-navy-deep border border-lavanda/10 rounded-xl p-5 space-y-3">
            <h3 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider">
              Ubicación
            </h3>
            <p className="text-sm text-lavanda-light">
              Villa Crespo, CABA, Argentina
            </p>
            <p className="text-xs text-lavanda/50">
              Solo retiro con cita previa coordinada por WhatsApp.
            </p>
          </div>
        </div>

        {/* Contact form */}
        <ContactForm />
      </div>
    </div>
  );
}
