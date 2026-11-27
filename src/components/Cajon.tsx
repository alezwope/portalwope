"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import MenuPersianas from "@/components/MenuPersianas";
import { useTextos } from "@/components/Idioma";

/** Botón ☰ y cajón lateral del teléfono con el mismo menú de persianas. */
export default function Cajon({ alias, entrenador }: { alias: string; entrenador: boolean }) {
  const { t } = useTextos();
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();

  useEffect(() => {
    if (!abierto) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className="rounded-lg border border-borde bg-card px-2.5 py-1.5 md:hidden" aria-label={t["app.menu"]} aria-expanded={abierto}>
        ☰
      </button>
      {/* Portal al <body>: la cabecera usa backdrop-filter y eso encerraría el cajón en su franja. */}
      {abierto && createPortal(
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label={t["app.menu"]}>
          <button type="button" className="absolute inset-0 bg-black/60" aria-label={t["comun.cerrar"]} onClick={() => setAbierto(false)} />
          <aside key={ruta} className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col gap-3 overflow-y-auto border-r border-borde bg-bg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image src="/brand/isotipo-96.png" alt="" width={32} height={32} className="logo-fundido" />
                <span className="titulo text-sm tracking-widest">UNIBARS</span>
              </div>
              <button type="button" onClick={() => setAbierto(false)} className="px-2 text-suave" aria-label={t["comun.cerrar"]}>✕</button>
            </div>
            <MenuPersianas alias={alias} entrenador={entrenador} alNavegar={() => setAbierto(false)} />
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
}
