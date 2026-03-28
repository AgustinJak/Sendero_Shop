"use client";

import { useEffect } from "react";
import { trackViewItemList } from "@/lib/analytics";

interface Props {
  listName: string;
  products: { id: string; name: string; price: number; category?: string }[];
}

export default function TrackItemList({ listName, products }: Props) {
  useEffect(() => {
    if (products.length > 0) {
      trackViewItemList(listName, products);
    }
  }, [listName, products]);

  return null;
}
