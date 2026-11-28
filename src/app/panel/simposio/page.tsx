import type { Metadata } from "next";
import { requerirPerfil } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";
import Simposio from "@/components/Simposio";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["sim.titulo"] };
}

export default async function SimposioPagina() {
  const { supabase } = await requerirPerfil();
  const { t } = await textos();
  const { data: pag } = await supabase.rpc("simposio_mi_pagina");
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">{t["sim.titulo"]}</h1>
      <Simposio puedeResponder={!!pag} />
    </div>
  );
}
