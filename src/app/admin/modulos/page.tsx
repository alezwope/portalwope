import type { Metadata } from "next";
import AdminModulos, { type Modulo } from "@/components/AdminModulos";
import { requerirEquipo } from "@/lib/permisos";

export const metadata: Metadata = { title: "Consola · Módulos" };

export default async function PaginaModulos() {
  const { supabase } = await requerirEquipo("modulos");
  const { data } = await supabase.from("modulos").select("clave, nombre, descripcion, etapa, activo, paises").order("etapa").order("orden");
  return <AdminModulos modulos={(data ?? []) as Modulo[]} />;
}
