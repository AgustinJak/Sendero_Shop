// ==========================================
// Sendero Shop — TypeScript Types
// ==========================================

// --- Categorías ---
export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  parent_id: string | null;
  imagen_url: string | null;
  orden: number;
  activo: boolean;
  created_at: string;
  // Relaciones
  children?: Categoria[];
  parent?: Categoria;
}

// --- Productos ---
export interface Producto {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string;
  precio: number;
  precio_oferta: number | null;
  categoria_id: string | null;
  activo: boolean;
  destacado: boolean;
  stock_tipo: "print-on-demand" | "limitado";
  tiempo_produccion: number;
  linea: string | null;
  tamano: string | null;
  peso_gr: number | null;
  alto_cm: number | null;
  ancho_cm: number | null;
  largo_cm: number | null;
  sku: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones
  imagenes?: ProductoImagen[];
  variante_grupos?: VarianteGrupo[];
  precio_reglas?: VariantePrecioRegla[];
  categoria?: Categoria;
}

export interface ProductoImagen {
  id: string;
  producto_id: string;
  url: string;
  orden: number;
  alt_text: string | null;
  tipo: "imagen" | "video";
  opcion_id: string | null;
}

// --- Variantes (combinables) ---
export interface VarianteGrupo {
  id: string;
  producto_id: string;
  nombre: string;
  orden: number;
  // Relaciones
  opciones?: VarianteOpcion[];
}

export interface VarianteOpcion {
  id: string;
  grupo_id: string;
  valor: string;
  precio_adicional: number;
  imagen_url: string | null;
  activo: boolean;
  orden: number;
}

// --- Reglas de precio condicional ---
export interface VariantePrecioRegla {
  id: string;
  producto_id: string;
  opcion_id: string;
  cuando_opcion_id: string;
  precio_adicional: number;
}

// Selección del usuario en el carrito
export interface VarianteSeleccion {
  grupo_id: string;
  grupo_nombre: string;
  opcion_id: string;
  opcion_valor: string;
  precio_adicional: number;
}

// --- Carrito ---
export interface CartItem {
  producto_id: string;
  nombre: string;
  slug: string;
  imagen_url: string;
  precio_base: number;
  opciones: VarianteSeleccion[];
  cantidad: number;
  // Calculado
  precio_unitario: number; // base + sum(adicionales)
  subtotal: number; // unitario * cantidad
  // Físico (para cotización de envío)
  peso_gr: number | null;
  alto_cm: number | null;
  ancho_cm: number | null;
  largo_cm: number | null;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
}

// --- Pedidos ---
export type EstadoPedido =
  | "pendiente_pago"
  | "pago_confirmado"
  | "en_produccion"
  | "impreso"
  | "enviado"
  | "esperando_retiro"
  | "entregado"
  | "cancelado";

export type MetodoEnvio = "retiro" | "correo_argentino" | "andreani";
export type TipoEnvio = "domicilio" | "sucursal";
export type MetodoPago = "mercadopago" | "transferencia" | "efectivo";

export interface DireccionEnvio {
  calle: string;
  numero: string;
  piso: string;
  departamento: string;
  codigo_postal: string;
  localidad: string;
  provincia: string;
}

export interface Pedido {
  id: string;
  numero_pedido: string;
  estado: EstadoPedido;
  nombre_cliente: string;
  dni: string;
  email: string;
  telefono: string;
  direccion_envio: DireccionEnvio | null;
  metodo_envio: MetodoEnvio;
  tipo_envio: TipoEnvio | null;
  costo_envio: number;
  metodo_pago: MetodoPago;
  recargo_mp: number;
  subtotal: number;
  total: number;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  sucursal_correo_id: string | null;
  sucursal_correo_nombre: string | null;
  notas: string | null;
  cancelado_at: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones
  items?: PedidoItem[];
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  opciones_seleccionadas: VarianteSeleccion[];
  subtotal: number;
}

// --- Envíos ---
export interface EnvioZona {
  id: string;
  nombre_zona: string;
  provincias: string[];
  codigos_postales: string | null;
  correo_argentino_domicilio: number;
  correo_argentino_sucursal: number;
  andreani_domicilio: number;
  andreani_sucursal: number;
  activo: boolean;
}

// --- Configuración ---
export interface Configuracion {
  key: string;
  value: string;
  updated_at: string;
}

// --- Colecciones ---
export interface Coleccion {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  tipo: "automatica" | "manual";
  regla: Record<string, string> | null;
  meta_title: string | null;
  meta_description: string | null;
  imagen_cover: string | null;
  activa: boolean;
  orden: number;
  created_at: string;
  // Relaciones
  productos?: Producto[];
}

// --- Banners ---
export interface Banner {
  id: string;
  titulo: string | null;
  subtitulo: string | null;
  imagen_url: string | null;
  link: string | null;
  posicion: "hero" | "catalogo_top" | "popup";
  activo: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  orden: number;
}

// --- Reviews ---
export interface Review {
  id: string;
  producto_id: string;
  pedido_id: string | null;
  nombre_cliente: string;
  email: string;
  rating: number;
  comentario: string | null;
  aprobado: boolean;
  created_at: string;
  // Relaciones (join)
  producto?: { nombre: string; slug: string };
}

// --- Checkout ---
export interface DatosPersonales {
  nombre_completo: string;
  dni: string;
  email: string;
  telefono: string;
}

export interface CheckoutData {
  datos_personales: DatosPersonales;
  metodo_envio: MetodoEnvio;
  tipo_envio: TipoEnvio | null;
  direccion_envio: DireccionEnvio | null;
  metodo_pago: MetodoPago;
}
