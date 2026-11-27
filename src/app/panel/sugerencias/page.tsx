import type { Metadata } from "next";
import Sugerencias, { type SugerenciaPublica } from "@/components/Sugerencias";
import { requerirPerfil } from "@/lib/sesion";

export const metadata: Metadata = { title: "Sugerencias" };

export default async function PaginaSugerencias() {
  const { supabase, perfil } = await requerirPerfil();
  const [{ data }, { data: votos }, { data: cat }] = await Promise.all([
    supabase.from("sugerencias").select("id, autor_id, titulo, texto, categoria, estado, respuesta, votos_favor, votos_contra").neq("estado", "oculta").order("votos_favor", { ascending: false }).order("creado_en", { ascending: false }).limit(200),
    supabase.from("sugerencias_votos").select("sugerencia_id, voto").eq("perfil_id", perfil.id),
    supabase.from("catalogo_items").select("clave, datos").eq("catalogo", "categorias_sugerencia"),
  ]);
  const mios = new Map((votos ?? []).map((v) => [v.sugerencia_id, v.voto as number]));
  const categorias = Object.fromEntries((cat ?? []).map((c) => [c.clave, (c.datos as { es?: string }).es ?? c.clave]));
  const lista: SugerenciaPublica[] = (data ?? []).map((s) => ({
    id: s.id, titulo: s.titulo, texto: s.texto, categoria: s.categoria, estado: s.estado, respuesta: s.respuesta,
    votos_favor: s.votos_favor, votos_contra: s.votos_contra, mio: mios.get(s.id) ?? 0, propia: s.autor_id === perfil.id,
  }));
  return <Sugerencias lista={lista} categorias={categorias} />;
}
