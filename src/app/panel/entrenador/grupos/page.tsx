import type { Metadata } from "next";
import { requerirEntrenador } from "@/lib/entrenador";
import GruposAlumnos from "@/components/GruposAlumnos";

export const metadata: Metadata = { title: "Grupos" };

export default async function Grupos() {
  const { supabase, pagina } = await requerirEntrenador();
  const [{ data: grupos }, { data: planes }, { data: vinc }] = await Promise.all([
    supabase.from("grupos").select("id, nombre, grupo_miembros(persona_id)").eq("pagina_id", pagina.id).order("nombre"),
    supabase.from("planes").select("id, nombre, orden_fijo").eq("pagina_id", pagina.id).order("nombre"),
    supabase.from("vinculos").select("persona_id").eq("pagina_id", pagina.id).eq("estado", "aceptado"),
  ]);
  const ids = (vinc ?? []).map((v) => v.persona_id);
  const { data: perfiles } = ids.length ? await supabase.rpc("perfiles_publicos", { p_ids: ids }) : { data: [] };
  const alias = new Map<string, string | null>((perfiles ?? []).map((p: { id: string; alias: string | null }) => [p.id, p.alias]));
  const { data: asig } = await supabase.from("asignaciones").select("id, grupo_id, planes(nombre)").eq("pagina_id", pagina.id).eq("activa", true).not("grupo_id", "is", null);

  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Grupos</h1>
      <GruposAlumnos
        paginaId={pagina.id}
        alumnos={ids.map((id) => ({ persona_id: id, alias: alias.get(id) ?? "alumno" }))}
        planes={planes ?? []}
        grupos={(grupos ?? []).map((g) => ({
          id: g.id, nombre: g.nombre,
          miembros: (g.grupo_miembros as { persona_id: string }[]).map((m) => m.persona_id),
          asignaciones: (asig ?? []).filter((a) => a.grupo_id === g.id).map((a) => ({ id: a.id, plan: (a.planes as unknown as { nombre: string }).nombre })),
        }))}
      />
    </div>
  );
}
