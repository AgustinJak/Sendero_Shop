"use client";

import type { EstadoPedido, MetodoEnvio, MetodoPago } from "@/types";

interface TimelineStep {
  key: EstadoPedido;
  label: string;
}

const STEPS_ENVIO: TimelineStep[] = [
  { key: "pendiente_pago", label: "Pendiente de pago" },
  { key: "pago_confirmado", label: "Pago confirmado" },
  { key: "en_produccion", label: "En producción" },
  { key: "impreso", label: "Impreso" },
  { key: "enviado", label: "Enviado" },
  { key: "entregado", label: "Entregado" },
];

const STEPS_RETIRO: TimelineStep[] = [
  { key: "pendiente_pago", label: "Pendiente de pago" },
  { key: "pago_confirmado", label: "Pago confirmado" },
  { key: "en_produccion", label: "En producción" },
  { key: "impreso", label: "Impreso" },
  { key: "esperando_retiro", label: "Esperando retiro" },
  { key: "entregado", label: "Retirado" },
];

function getStateOrder(steps: TimelineStep[]): Record<string, number> {
  const order: Record<string, number> = { cancelado: -1 };
  steps.forEach((s, i) => {
    order[s.key] = i;
  });
  return order;
}

export default function OrderTimeline({
  estado,
  metodoEnvio,
  metodoPago,
}: {
  estado: EstadoPedido;
  metodoEnvio?: MetodoEnvio;
  metodoPago?: MetodoPago;
}) {
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
          <p className="text-lavanda/60 text-xs">Este pedido fue cancelado.</p>
        </div>
      </div>
    );
  }

  const isRetiro = metodoEnvio === "retiro";
  const baseSteps = isRetiro ? STEPS_RETIRO : STEPS_ENVIO;
  // En efectivo no hay etapa "pendiente de pago" — se cobra al retirar/entregar.
  // El pedido nace ya en "pago_confirmado" (que la UI muestra como "Pedido
  // confirmado"). Si por alguna razón un pedido legacy quedó en pendiente_pago,
  // lo tratamos como "pago_confirmado" para que el timeline tenga sentido.
  const STEPS =
    metodoPago === "efectivo"
      ? baseSteps.filter((s) => s.key !== "pendiente_pago")
      : baseSteps;
  const effectiveEstado: EstadoPedido =
    metodoPago === "efectivo" && estado === "pendiente_pago"
      ? "pago_confirmado"
      : estado;
  const STATE_ORDER = getStateOrder(STEPS);
  const currentIndex = STATE_ORDER[effectiveEstado] ?? 0;

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
                    ? "text-lavanda/50"
                    : ""
                }`}
              >
                {step.key === "pago_confirmado" && metodoPago === "efectivo"
                  ? "Pedido confirmado"
                  : step.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
