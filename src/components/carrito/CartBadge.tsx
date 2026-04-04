"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartContext } from "./CartProvider";

export default function CartBadge() {
  const { itemCount, openDrawer } = useCartContext();
  const prevCount = useRef(itemCount);
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    if (itemCount > prevCount.current) {
      setBounce(true);
      const t = setTimeout(() => setBounce(false), 400);
      return () => clearTimeout(t);
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  return (
    <button
      onClick={openDrawer}
      className="relative text-lavanda-light hover:text-niebla transition-colors"
      aria-label={`Carrito (${itemCount} items)`}
    >
      <motion.div
        animate={bounce ? { scale: [1, 1.3, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
      </motion.div>

      <AnimatePresence>
        {itemCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-ambar text-navy-deep text-[10px] font-bold rounded-full flex items-center justify-center"
          >
            {itemCount > 9 ? "9+" : itemCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
