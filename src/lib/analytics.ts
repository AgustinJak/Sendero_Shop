/* ─── Google Tag Manager + GA4 E-commerce Events ─── */
/* Cada evento sale también al píxel de Meta (lib/meta-pixel.ts). */

import { contenidosMeta, metaTrack } from "@/lib/meta-pixel";
import { pulso } from "@/lib/pulso";

type GtagEvent = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer: GtagEvent[];
  }
}

function push(event: GtagEvent) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);
}

// ─── Page-level events ───

export function trackViewItem(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
  linea?: string | null;
}) {
  push({ ecommerce: null }); // clear previous ecommerce data
  push({
    event: "view_item",
    ecommerce: {
      currency: "ARS",
      value: product.price,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category || "",
          item_brand: "Sendero 3D",
          price: product.price,
          quantity: 1,
          ...(product.linea ? { item_category2: product.linea } : {}),
        },
      ],
    },
  });
  metaTrack("ViewContent", {
    content_type: "product",
    content_ids: [product.id],
    content_name: product.name,
    ...(product.category ? { content_category: product.category } : {}),
    value: product.price,
  });
  pulso({ tipo: "producto", producto_id: product.id });
}

export function trackViewItemList(
  listName: string,
  products: {
    id: string;
    name: string;
    price: number;
    category?: string;
  }[]
) {
  push({ ecommerce: null });
  push({
    event: "view_item_list",
    ecommerce: {
      item_list_name: listName,
      items: products.map((p, i) => ({
        item_id: p.id,
        item_name: p.name,
        item_category: p.category || "",
        item_brand: "Sendero 3D",
        price: p.price,
        index: i,
        quantity: 1,
      })),
    },
  });
}

/** Búsqueda desde el buscador del header. */
export function trackSearch(termino: string) {
  push({ event: "search", search_term: termino });
  metaTrack("Search", { search_string: termino });
}

/**
 * Primera variante elegida en una ficha (color, tamaño…). Una vez por ficha:
 * cada clic en una opción no es un evento nuevo para Meta.
 */
export function trackCustomizeProduct(product: { id: string; name: string }) {
  metaTrack("CustomizeProduct", {
    content_type: "product",
    content_ids: [product.id],
    content_name: product.name,
  });
}

/** Consulta enviada por el formulario de /contacto. Los clics en WhatsApp cuentan como Contact (lib/meta-pixel.ts). */
export function trackLead(origen: string) {
  push({ event: "generate_lead", lead_source: origen });
  metaTrack("Lead", { content_name: origen });
}

// ─── Cart events ───

export function trackAddToCart(item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}) {
  push({ ecommerce: null });
  push({
    event: "add_to_cart",
    ecommerce: {
      currency: "ARS",
      value: item.price * item.quantity,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          item_category: item.category || "",
          item_brand: "Sendero 3D",
          price: item.price,
          quantity: item.quantity,
        },
      ],
    },
  });
  metaTrack("AddToCart", {
    ...contenidosMeta([{ id: item.id, quantity: item.quantity, price: item.price }]),
    content_name: item.name,
    value: item.price * item.quantity,
  });
  pulso({ tipo: "carrito", producto_id: item.id, cantidad: item.quantity });
}

export function trackRemoveFromCart(item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}) {
  push({ ecommerce: null });
  push({
    event: "remove_from_cart",
    ecommerce: {
      currency: "ARS",
      value: item.price * item.quantity,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          item_brand: "Sendero 3D",
          price: item.price,
          quantity: item.quantity,
        },
      ],
    },
  });
}

// ─── Checkout events ───

export function trackBeginCheckout(items: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}[], total: number) {
  push({ ecommerce: null });
  push({
    event: "begin_checkout",
    ecommerce: {
      currency: "ARS",
      value: total,
      items: items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        item_brand: "Sendero 3D",
        price: item.price,
        quantity: item.quantity,
      })),
    },
  });
  metaTrack("InitiateCheckout", {
    ...contenidosMeta(items.map((i) => ({ id: i.id, quantity: i.quantity, price: i.price }))),
    value: total,
  });
  pulso({ tipo: "checkout" });
}

export function trackPurchase(order: {
  id: string;
  total: number;
  shipping: number;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
}) {
  push({ ecommerce: null });
  push({
    event: "purchase",
    ecommerce: {
      transaction_id: order.id,
      currency: "ARS",
      value: order.total,
      shipping: order.shipping,
      items: order.items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        item_brand: "Sendero 3D",
        price: item.price,
        quantity: item.quantity,
      })),
    },
  });
  // Para Meta esto todavía no es una compra: el pedido se creó pero no se
  // pagó (transferencias, señas, pagos de MP que no se completan). Sale como
  // AddPaymentInfo, y el Purchase lo manda el servidor cuando se confirma el
  // pago (lib/meta-capi.ts). Así los anuncios aprenden de ventas reales.
  metaTrack("AddPaymentInfo", {
    ...contenidosMeta(order.items.map((i) => ({ id: i.id, quantity: i.quantity, price: i.price }))),
    value: order.total,
  });
}
