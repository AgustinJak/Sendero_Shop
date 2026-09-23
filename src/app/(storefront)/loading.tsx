import Image from "next/image";

export default function Loading() {
  return (
    // Todo el alto de la pantalla y visible recién a los 300 ms.
    //
    // Alto: con 60vh el footer quedaba dentro de la vista debajo del caballero,
    // y al llegar la página saltaba (CLS de hasta 0,3 en el catálogo). Con la
    // pantalla entera el footer arranca fuera de la vista y moverlo no cuenta.
    //
    // Demora: con las páginas cacheadas la carga suele durar menos que eso, y
    // así no parpadea el caballero. Mientras es invisible tampoco compite por
    // el LCP.
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 animate-[fade-in_0.2s_ease-out_0.3s_backwards]">
      <Image
        src="/assets/loading-knight.gif"
        alt="Cargando..."
        width={120}
        height={120}
        className="opacity-80"
        unoptimized
      />
      <p className="text-texto-3 text-sm animate-pulse">Cargando...</p>
    </div>
  );
}
