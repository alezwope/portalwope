import type { Metadata } from "next";
import AdminAjustes, { type Ajuste } from "@/components/AdminAjustes";
import { requerirEquipo } from "@/lib/permisos";

export const metadata: Metadata = { title: "Consola · Ajustes" };

export default async function PaginaAjustes() {
  const { supabase } = await requerirEquipo("ajustes");
  const { data } = await supabase.from("ajustes").select("clave, valor, descripcion, publico").order("clave");
  return <AdminAjustes ajustes={(data ?? []) as Ajuste[]} />;
}
