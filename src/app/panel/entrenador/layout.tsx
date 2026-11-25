import type { Metadata } from "next";
import Link from "next/link";
import { requerirEntrenador } from "@/lib/entrenador";
import { ESTADOS_PAGINA } from "@/lib/catalogos";

// Esta sección se puede instalar como su propia app: "UniBars Entrenador".
export const metadata: Metadata = {
  title: { default: "Entrenador", template: "%s · UniBars Entrenador" },
  manifest: "/manifest-entrenador.webmanifest",
};

export default async function EntrenadorLayout({ children }: LayoutProps<"/panel/entrenador">) {
  const { supabase, pagina } = await requerirEntrenador();
  const { data: activos } = await supabase.rpc("alumnos_activos", { p_pagina: pagina.id });
  const cupo = pagina.plan === "pro" ? null : pagina.cupo_gratis;

  return (
    <div className="grid gap-6">
      <div className="tarjeta flex flex-wrap items-center justify-between gap-3 !py-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-dorado">Panel de entrenador</p>
          <p className="titulo text-xl">{pagina.nombre}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>
            Alumnos: <strong>{activos ?? 0}</strong>
            {cupo !== null && <span className="text-suave"> / {cupo} gratis</span>}
          </span>
          {pagina.estado !== "activa" && (
            <span className="rounded-full border border-dorado px-2 text-dorado">{ESTADOS_PAGINA[pagina.estado]}</span>
          )}
          <Link href={`/e/${pagina.slug}`} className="btn btn-borde !py-1">Ver mi ficha pública</Link>
        </div>
      </div>
      {children}
    </div>
  );
}
