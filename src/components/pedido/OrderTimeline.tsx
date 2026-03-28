"use client";

import type { EstadoPedido } from "@/types";

const STEPS: { key: EstadoPedido; label: string }[] = [
  { key: "pendiente_pago", label: "Pendiente de pago" },
  { key: "pago_confirmado", label: "Pago confirmado" },
  { key: "en_produccion", label: "En producción" },
  { key: "impreso", label: "Impreso" },
  { key: "enviado", label: "Enviado" },
  { key: "entregado", label: "Entregado" },
];

const STATE_ORDER: Record<EstadoPedido, number> = {
  pendiente_pago: 0,
  pago_confirmado: 1,
  en_produccion: 2,
  impreso: 3,
  enviado: 4,
  entregado: 5,
  cancelado: -1,
};

export default function OrderTimeline({ estado }: { estado: EstadoPedido }) {
  if (estado === "cancelado") {
    return (
      <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <p className="text-red-400 font-semibold text-sm">Pedido cancelado</p>
          <p className="text-lavanda/40 text-xs">Este pedido fue cancelado.</p>
        </div>
      </div>
    );
  }

  const currentIndex = STATE_ORDER[estado];

  return (
    <div className="space-y-0">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isPending = i > currentIndex;

        return (
          <div key={step.key} className="flex items-start gap-3">
            {/* Vertical line + dot */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                  isCompleted
                    ? "bg-green-500/20 border-green-500"
                    : isCurrent
                    ? "bg-ambar/20 border-ambar"
                    : "bg-navy-deep border-lavanda/20"
                }`}
              >
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-green-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : isCurrent ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-ambar" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-lavanda/20" />
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-0.5 h-8 ${
                    isCompleted ? "bg-green-500/40" : "bg-lavanda/10"
                  }`}
                />
              )}
            </div>

            {/* Label */}
            <div className="pt-1">
              <p
                className={`text-sm font-medium ${
                  isCompleted
                    ? "text-green-400"
                    : isCurrent
                    ? "text-ambar"
                    : isPending
                    ? "text-lavanda/30"
                    : ""
                }`}
              >
                {step.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
