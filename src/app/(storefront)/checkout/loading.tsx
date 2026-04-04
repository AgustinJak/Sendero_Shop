import Image from "next/image";

export default function CheckoutLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Image
        src="/assets/loading-knight.gif"
        alt="Cargando checkout..."
        width={100}
        height={100}
        className="opacity-80"
        unoptimized
      />
      <p className="text-lavanda/70 text-sm animate-pulse">Preparando checkout...</p>
    </div>
  );
}
