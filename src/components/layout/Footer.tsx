import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-navy-deep border-t border-lavanda/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo y descripción */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <Image
                src="/icons/logo-original.png"
                alt="Sendero Shop"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="font-[family-name:var(--font-cinzel)] text-lg font-bold text-niebla tracking-wider">
                SENDERO SHOP
              </span>
            </div>
            <p className="mt-3 text-sm text-lavanda-light">
              Figuras y accesorios impresos en 3D. Producción a pedido en
              Argentina.
            </p>
            {/* Redes sociales */}
            <div className="flex gap-4 mt-4">
              <a
                href="https://www.instagram.com/sendero.3d/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-lavanda hover:text-niebla transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@aguspiun"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="text-lavanda hover:text-niebla transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.87a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.3z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Links rápidos */}
          <div>
            <h3 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider mb-4">
              Tienda
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/catalogo" className="text-sm text-lavanda-light hover:text-niebla transition-colors">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link href="/categorias" className="text-sm text-lavanda-light hover:text-niebla transition-colors">
                  Categorías
                </Link>
              </li>
              <li>
                <Link href="/nosotros" className="text-sm text-lavanda-light hover:text-niebla transition-colors">
                  Nosotros
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="text-sm text-lavanda-light hover:text-niebla transition-colors">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href="/mi-pedido" className="text-sm text-lavanda-light hover:text-niebla transition-colors">
                  Buscar mi pedido
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/terminos" className="text-sm text-lavanda-light hover:text-niebla transition-colors">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link href="/privacidad" className="text-sm text-lavanda-light hover:text-niebla transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link href="/arrepentimiento" className="text-sm text-lavanda-light hover:text-niebla transition-colors">
                  Botón de Arrepentimiento
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider mb-4">
              Contacto
            </h3>
            <ul className="space-y-2">
              <li className="text-sm text-lavanda-light">
                Villa Crespo, CABA, Argentina
              </li>
              <li>
                <a
                  href="https://wa.me/5491125502785"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-lavanda-light hover:text-niebla transition-colors"
                >
                  WhatsApp: +54 9 11 2550-2785
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-lavanda/10 text-center">
          <p className="text-xs text-lavanda/60">
            © {new Date().getFullYear()} Sendero Shop. Hecho con amor en
            Argentina.
          </p>
        </div>
      </div>
    </footer>
  );
}
