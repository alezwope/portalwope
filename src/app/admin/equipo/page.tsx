import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminEquipo, { type MiembroEquipo } from "@/components/AdminEquipo";
import { requerirEquipo, PERMISOS_EQUIPO } from "@/lib/permisos";

export const metadata: Metadata = { title: "Consola · Equipo" };

export default async function PaginaEquipo() {
  const { supabase, equipo } = await requerirEquipo();
  if (!equipo.esSuper) redirect("/admin");

  const { data } = await supabase.from("equipo").select("usuario_id, rol, permisos");
  const ids = (data ?? []).map((e) => e.usuario_id);
  const { data: perfiles } = ids.length ? await supabase.from("profiles").select("id, alias").in("id", ids) : { data: [] as { id: string; alias: string | null }[] };
  const alias = new Map((perfiles ?? []).map((p) => [p.id, p.alias]));

  const miembros: MiembroEquipo[] = (data ?? [])
    .filter((e) => alias.get(e.usuario_id))
    .map((e) => ({ alias: alias.get(e.usuario_id) as string, rol: e.rol, permisos: e.permisos ?? [] }));

  return <AdminEquipo miembros={miembros} permisosDisponibles={PERMISOS_EQUIPO} />;
}
