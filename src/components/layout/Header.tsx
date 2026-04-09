import Link from "next/link";
import { getCategoriasTree } from "@/lib/queries";
import HeaderClient from "./HeaderClient";

export default async function Header() {
  const categorias = await getCategoriasTree();
  return (
    <HeaderClient categorias={categorias}>
      <Link href="/" className="flex items-center gap-2 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/logo-original.png"
          alt="Sendero Shop"
          width={36}
          height={36}
          className="rounded-full"
        />
        <span className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla tracking-wider">
          SENDERO SHOP
        </span>
      </Link>
    </HeaderClient>
  );
}
