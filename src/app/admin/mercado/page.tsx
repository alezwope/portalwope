import type { Metadata } from "next";
import AdminMercado from "@/components/AdminMercado";
import { requerirEquipo } from "@/lib/permisos";

export const metadata: Metadata = { title: "Consola · Marketplace" };

export default async function AdminMercadoPagina() {
  const { supabase } = await requerirEquipo("moderar");
  const { data } = await supabase.rpc("admin_mercado_listar");
  return (
    <section className="grid gap-4">
      <h1 className="text-3xl">Marketplace</h1>
      <AdminMercado filas={(data ?? []) as never[]} />
    </section>
  );
}
