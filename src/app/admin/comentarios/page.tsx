import type { Metadata } from "next";
import AdminComentarios, { type ComentarioTester } from "@/components/AdminComentarios";
import { requerirEquipo } from "@/lib/permisos";

export const metadata: Metadata = { title: "Consola · Comentarios" };

export default async function PaginaComentarios() {
  const { supabase } = await requerirEquipo("comentarios");
  const [{ data }, { data: tiposCat }] = await Promise.all([
    supabase.from("comentarios_testers").select("id, usuario_id, tipo, texto, ruta, dispositivo, estado, nota_admin, creado_en").order("creado_en", { ascending: false }).limit(300),
    supabase.from("catalogo_items").select("clave, datos").eq("catalogo", "tipos_comentario"),
  ]);
  const ids = [...new Set((data ?? []).map((c) => c.usuario_id).filter(Boolean))] as string[];
  const { data: perfiles } = ids.length ? await supabase.from("profiles").select("id, alias").in("id", ids) : { data: [] as { id: string; alias: string | null }[] };
  const alias = new Map((perfiles ?? []).map((p) => [p.id, p.alias ? `@${p.alias}` : "sin alias"]));
  const tipos = Object.fromEntries((tiposCat ?? []).map((t) => [t.clave, (t.datos as { es?: string }).es ?? t.clave]));

  const comentarios: ComentarioTester[] = (data ?? []).map((c) => ({
    id: c.id, autor: alias.get(c.usuario_id) ?? "anónimo", tipo: c.tipo, texto: c.texto, ruta: c.ruta,
    dispositivo: c.dispositivo, estado: c.estado, nota_admin: c.nota_admin, creado_en: c.creado_en,
  }));
  return <AdminComentarios comentarios={comentarios} tipos={tipos} />;
}
