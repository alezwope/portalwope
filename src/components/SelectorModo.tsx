"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Cambia entre la cuenta personal y la página de entrenador (como cambiar de perfil en Facebook). */
export default function SelectorModo({ alias, entrenador }: { alias: string; entrenador: string | null }) {
  const ruta = usePathname();
  if (!entrenador) return <span className="hidden text-sm text-suave sm:inline">@{alias}</span>;
  const enEntrenador = ruta.startsWith("/panel/entrenador");
  return (
    <div role="group" aria-label="Cambiar de perfil" className="flex rounded-full border border-borde p-0.5 text-xs sm:text-sm">
      <Link
        href="/panel"
        aria-current={!enEntrenador ? "true" : undefined}
        className={`rounded-full px-3 py-1 ${!enEntrenador ? "bg-lava text-white" : "text-suave"}`}
      >
        @{alias}
      </Link>
      <Link
        href="/panel/entrenador"
        aria-current={enEntrenador ? "true" : undefined}
        className={`max-w-[9rem] truncate rounded-full px-3 py-1 ${enEntrenador ? "bg-lava text-white" : "text-suave"}`}
      >
        🏋️ {entrenador}
      </Link>
    </div>
  );
}
