import { getCategoriasTree } from "@/lib/queries";
import HeaderClient from "./HeaderClient";

export default async function Header() {
  const categorias = await getCategoriasTree();
  return <HeaderClient categorias={categorias} />;
}
