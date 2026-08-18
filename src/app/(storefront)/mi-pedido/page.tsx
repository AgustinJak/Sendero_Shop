import type { Metadata } from "next";
import OrderLookupForm from "@/components/pedido/OrderLookupForm";

export const metadata: Metadata = {
  title: "Buscar mi pedido",
  description: "Consultá el estado de tu pedido en Sendero Shop.",
  robots: "noindex, nofollow",
};

export default function MiPedidoPage() {
  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-purpura/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-ambar">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
        <h1 className="display display-seccion text-texto">
          Buscar mi pedido
        </h1>
        <p className="text-texto-3 mt-2 text-sm">
          Ingresá tu email y número de pedido para ver el estado.
        </p>
      </div>
      <OrderLookupForm />
    </div>
  );
}
