import { cache } from "react";
import { redirect } from "next/navigation";
import { requerirPerfil } from "@/lib/sesion";

export type Equipo = { esSuper: boolean; rol: string | null; permisos: string[] };

/** Rol y permisos del equipo de la persona actual (la base de datos es quien decide; esto solo ordena la pantalla). */
export const equipoActual = cache(async (): Promise<Equipo> => {
  const { supabase } = await requerirPerfil();
  const { data } = await supabase.rpc("mis_permisos");
  const d = (data ?? {}) as { super_admin?: boolean; rol?: string | null; permisos?: string[] };
  return { esSuper: !!d.super_admin, rol: d.rol ?? null, permisos: d.permisos ?? [] };
});

export function puede(equipo: Equipo, permiso: string) {
  return equipo.esSuper || equipo.permisos.includes(permiso);
}

/** Entra solo quien es administrador general o parte del equipo; con `permiso`, exige ese permiso. */
export async function requerirEquipo(permiso?: string) {
  const base = await requerirPerfil();
  const equipo = await equipoActual();
  if (!equipo.esSuper && equipo.permisos.length === 0) redirect("/panel");
  if (permiso && !puede(equipo, permiso)) redirect("/admin");
  return { ...base, equipo };
}

/** Secciones de la consola y el permiso que pide cada una. */
export const SECCIONES_ADMIN: { href: string; nombre: string; permiso?: string }[] = [
  { href: "/admin", nombre: "Resumen" },
  { href: "/admin/insignias", nombre: "Insignias", permiso: "insignias" },
  { href: "/admin/modulos", nombre: "Módulos", permiso: "modulos" },
  { href: "/admin/ajustes", nombre: "Ajustes", permiso: "ajustes" },
];
