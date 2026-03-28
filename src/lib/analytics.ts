/* ─── Google Tag Manager + GA4 E-commerce Events ─── */

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
  anime?: string | null;
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
          ...(product.anime ? { item_category2: product.anime } : {}),
        },
      ],
    },
  });
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
}
