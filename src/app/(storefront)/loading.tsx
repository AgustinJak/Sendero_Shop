import Image from "next/image";

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Image
        src="/assets/loading-knight.gif"
        alt="Cargando..."
        width={120}
        height={120}
        className="opacity-80"
        unoptimized
      />
      <p className="text-lavanda/70 text-sm animate-pulse">Cargando...</p>
    </div>
  );
}
