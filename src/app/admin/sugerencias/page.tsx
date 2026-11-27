import type { Metadata } from "next";
import AdminSugerencias, { type SugerenciaAdmin } from "@/components/AdminSugerencias";
import { requerirEquipo } from "@/lib/permisos";

export const metadata: Metadata = { title: "Consola · Sugerencias" };

export default async function PaginaSugerencias() {
  const { supabase } = await requerirEquipo("sugerencias");
  const [{ data }, { data: cat }] = await Promise.all([
    supabase.from("sugerencias").select("id, autor_id, titulo, texto, categoria, estado, respuesta, votos_favor, votos_contra, creado_en").order("votos_favor", { ascending: false }).order("creado_en", { ascending: false }).limit(300),
    supabase.from("catalogo_items").select("clave, datos").eq("catalogo", "categorias_sugerencia"),
  ]);
  const ids = [...new Set((data ?? []).map((s) => s.autor_id).filter(Boolean))] as string[];
  const { data: perfiles } = ids.length ? await supabase.from("profiles").select("id, alias").in("id", ids) : { data: [] as { id: string; alias: string | null }[] };
  const alias = new Map((perfiles ?? []).map((p) => [p.id, p.alias ? `@${p.alias}` : "sin alias"]));
  const categorias = Object.fromEntries((cat ?? []).map((c) => [c.clave, (c.datos as { es?: string }).es ?? c.clave]));

  const sugerencias: SugerenciaAdmin[] = (data ?? []).map((s) => ({
    id: s.id, autor: s.autor_id ? alias.get(s.autor_id) ?? "sin alias" : "persona eliminada", titulo: s.titulo, texto: s.texto,
    categoria: s.categoria, estado: s.estado, respuesta: s.respuesta, votos_favor: s.votos_favor, votos_contra: s.votos_contra, creado_en: s.creado_en,
  }));
  return <AdminSugerencias sugerencias={sugerencias} categorias={categorias} />;
}
