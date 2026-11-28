import type { Metadata } from "next";
import { requerirPerfil, misPaginas } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";
import SimposioDetalle from "@/components/SimposioDetalle";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["sim.titulo"] };
}

export default async function SimposioPregunta(props: PageProps<"/panel/simposio/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requerirPerfil();
  const { data: pag } = await supabase.rpc("simposio_mi_pagina");
  const nombre = pag ? (await misPaginas()).find((p) => p.id === pag)?.nombre ?? null : null;
  return <SimposioDetalle id={id} nombrePagina={nombre} />;
}
