import type { DireccionEnvio } from "@/types";

/**
 * Validación en el servidor de lo que el cliente escribe en un pedido
 * (SHOP - Seguridad, punto 6). La usan el checkout (`/api/pedidos`) y los
 * pedidos a medida (`/api/borradores/publico/[token]/confirmar`).
 *
 * El formulario ya valida lo mismo, pero el request se puede mandar sin pasar
 * por el formulario: sin esto entraba un nombre de 50.000 caracteres, un
 * teléfono con letras o una dirección con campos inventados, y todo eso
 * terminaba en los emails, en el panel y en la etiqueta de envío.
 *
 * Devuelve los datos ya limpios: recortados, sin espacios de más y, en la
 * dirección, solo con los campos conocidos.
 *
 * No importa nada en tiempo de ejecución, así se puede probar con node suelto.
 */

export interface DatosClienteLimpios {
  nombre_completo: string;
  dni: string;
  telefono: string;
}

export interface EnvioLimpio {
  direccion_envio: DireccionEnvio | null;
  tipo_envio: "domicilio" | "sucursal" | null;
  sucursal_correo_id: string | null;
  sucursal_correo_nombre: string | null;
}

type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string };

/** Texto de una línea: colapsa espacios y saltos, recorta. */
function linea(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

export function validarDatosCliente(
  raw: unknown,
  { dniObligatorio }: { dniObligatorio: boolean }
): Resultado<DatosClienteLimpios> {
  const d = (raw ?? {}) as Record<string, unknown>;

  const nombre = linea(d.nombre_completo);
  if (nombre.length < 3 || nombre.length > 120 || !/\p{L}/u.test(nombre)) {
    return { ok: false, error: "Ingresá tu nombre y apellido" };
  }

  // Mismo criterio que el checkout (validarDNI): 7 u 8 dígitos. Se guarda
  // sin puntos ni espacios.
  const dniCrudo = linea(d.dni);
  const dni = dniCrudo.replace(/\D/g, "");
  if (dniCrudo.length > 20 || (dni && (dni.length < 7 || dni.length > 8))) {
    return { ok: false, error: "DNI inválido (7 u 8 dígitos)" };
  }
  if (dniObligatorio && !dni) {
    return { ok: false, error: "DNI inválido (7 u 8 dígitos)" };
  }

  // Se guarda como lo escribió (con +54, guiones o espacios), pero solo con
  // caracteres de teléfono y entre 8 y 15 dígitos.
  const telefono = linea(d.telefono);
  const digitos = telefono.replace(/\D/g, "").length;
  if (telefono.length > 30 || !/^[\d\s+()\-.]+$/.test(telefono) || digitos < 8 || digitos > 15) {
    return { ok: false, error: "Teléfono inválido (entre 8 y 15 números)" };
  }

  return { ok: true, datos: { nombre_completo: nombre, dni, telefono } };
}

/** Largo máximo de cada campo de la dirección. Los que no están acá se descartan. */
const CAMPOS_DIRECCION = {
  calle: 120,
  numero: 20,
  piso: 20,
  departamento: 20,
  codigo_postal: 10,
  localidad: 120,
  provincia: 60,
  municipio: 120,
} as const;

export function validarEnvio(
  metodoEnvio: string,
  raw: {
    direccion_envio?: unknown;
    tipo_envio?: unknown;
    sucursal_correo_id?: unknown;
    sucursal_correo_nombre?: unknown;
  }
): Resultado<EnvioLimpio> {
  if (metodoEnvio === "retiro") {
    return {
      ok: true,
      datos: { direccion_envio: null, tipo_envio: null, sucursal_correo_id: null, sucursal_correo_nombre: null },
    };
  }

  const tipo = raw.tipo_envio ?? null;
  if (tipo !== null && tipo !== "domicilio" && tipo !== "sucursal") {
    return { ok: false, error: "Tipo de envío inválido" };
  }

  const dir = raw.direccion_envio;
  if (!dir || typeof dir !== "object" || Array.isArray(dir)) {
    return { ok: false, error: "Faltan los datos de envío" };
  }
  const entrada = dir as Record<string, unknown>;
  const limpia: Record<string, string | null> = {};
  for (const [campo, max] of Object.entries(CAMPOS_DIRECCION)) {
    const valor = linea(entrada[campo]);
    if (valor.length > max) {
      return { ok: false, error: "Algún dato de la dirección es demasiado largo" };
    }
    limpia[campo] = valor;
  }
  limpia.municipio = limpia.municipio || null;

  if (!/\d{4}/.test(limpia.codigo_postal ?? "")) {
    return { ok: false, error: "Código postal inválido" };
  }

  const sucursalId = linea(raw.sucursal_correo_id);
  const sucursalNombre = linea(raw.sucursal_correo_nombre);
  if (sucursalId.length > 64 || sucursalNombre.length > 200) {
    return { ok: false, error: "Sucursal inválida" };
  }

  return {
    ok: true,
    datos: {
      direccion_envio: limpia as unknown as DireccionEnvio,
      tipo_envio: tipo,
      sucursal_correo_id: sucursalId || null,
      sucursal_correo_nombre: sucursalNombre || null,
    },
  };
}
