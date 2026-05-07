import { createServiceRoleClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { calculateSubtotal, calculateDescuento } from "@/lib/borrador";
import type { PedidoBorrador } from "@/types";
import CustomCheckout from "./CustomCheckout";

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata = {
  title: "Tu pedido custom — Sendero Shop",
  robots: { index: false, follow: false },
};

export default async function PedidoCustomPage({ params }: Props) {
  const { token } = await params;

  // Validar formato del token
  if (!token || !/^[a-f0-9]{32}$/.test(token)) {
    return <ErrorScreen titulo="Link inválido" mensaje="Verificá la dirección que te pasaron." />;
  }

  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from("pedidos_borrador")
    .select("*")
    .eq("token", token)
    .single();

  if (!data) {
    return (
      <ErrorScreen
        titulo="Link no encontrado"
        mensaje="Este pedido custom no existe o el link es incorrecto. Pedile al vendedor que te pase el link de nuevo."
      />
    );
  }

  const b = data as PedidoBorrador;

  // Si ya fue convertido, redirigir al pedido real
  if (b.estado === "convertido" && b.pedido_id) {
    redirect(`/pedido/${b.pedido_id}`);
  }

  if (b.estado === "cancelado") {
    return (
      <ErrorScreen
        titulo="Este pedido fue cancelado"
        mensaje="El vendedor canceló este link. Pedile uno nuevo si querés seguir con la compra."
      />
    );
  }

  // Marcar como expirado al vuelo si ya venció
  const yaExpirado =
    b.estado === "expirado" || new Date(b.expires_at) < new Date();
  if (yaExpirado) {
    return (
      <ErrorScreen
        titulo="Este link expiró"
        mensaje="Pedile al vendedor que te genere uno nuevo. Los pedidos custom tienen tiempo de validez para asegurarte el precio."
      />
    );
  }

  // Estado pendiente válido — mostrar checkout
  const subtotal = calculateSubtotal(b.items);
  const descuento = calculateDescuento(
    subtotal,
    Number(b.descuento_monto),
    Number(b.descuento_porcentaje)
  );

  return (
    <CustomCheckout
      borrador={{
        id: b.id,
        token: b.token,
        items: b.items,
        descuento_monto: Number(b.descuento_monto),
        descuento_porcentaje: Number(b.descuento_porcentaje),
        costo_envio_override:
          b.costo_envio_override !== null
            ? Number(b.costo_envio_override)
            : null,
        envio_gratis: b.envio_gratis,
        metodos_pago_permitidos: b.metodos_pago_permitidos,
        expires_at: b.expires_at,
      }}
      subtotal={subtotal}
      descuento={descuento}
      turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null}
    />
  );
}

function ErrorScreen({ titulo, mensaje }: { titulo: string; mensaje: string }) {
  return (
    <div className="min-h-screen bg-navy-deep flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-navy rounded-xl border border-lavanda/10 p-8 text-center space-y-4">
        <h1 className="font-[family-name:var(--font-cinzel)] text-xl text-niebla">
          {titulo}
        </h1>
        <p className="text-sm text-lavanda">{mensaje}</p>
        <div className="flex gap-3 justify-center pt-2">
          <Link
            href="/"
            className="px-4 py-2 bg-lavanda/10 hover:bg-lavanda/20 text-lavanda-light text-sm rounded-lg transition-colors"
          >
            Ir a la tienda
          </Link>
          <a
            href="https://wa.me/5491125502785"
            target="_blank"
            rel="noopener"
            className="px-4 py-2 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-sm rounded-lg transition-colors"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
