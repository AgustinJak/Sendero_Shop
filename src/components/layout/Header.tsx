import Link from "next/link";
import { getCategoriasTree } from "@/lib/queries";
import HeaderClient from "./HeaderClient";

export default async function Header() {
  const categorias = await getCategoriasTree();
  return (
    <HeaderClient categorias={categorias}>
      <Link href="/" className="flex items-center gap-2 shrink-0">
        {/* El SVG ya trae su propio círculo, así que no lleva `rounded-full`:
            recortar un círculo contra otro solo comía un pelo del borde.
            Va como <img> y no con next/image porque el optimizador no toca
            SVGs — pasarlo por ahí agrega un hop sin achicar nada. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-sendero.svg"
          alt="Sendero Shop"
          width={36}
          height={36}
        />
        <span className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla tracking-wider">
          SENDERO SHOP
        </span>
      </Link>
    </HeaderClient>
  );
}
