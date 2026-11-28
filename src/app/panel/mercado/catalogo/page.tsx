import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { misPaginas, requerirPerfil } from "@/lib/sesion";
import MercadoCatalogo from "@/components/MercadoCatalogo";

export const metadata: Metadata = { title: "Mi catálogo" };

export default async function Catalogo() {
  await requerirPerfil();
  const paginas = (await misPaginas()).filter((p) => ["tienda", "wellness", "entrenador"].includes(p.tipo) && p.estado === "activa");
  if (paginas.length === 0) redirect("/panel/perfil#paginas");
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Mi catálogo</h1>
      <MercadoCatalogo paginas={paginas.map((p) => ({ id: p.id, nombre: p.nombre, tipo: p.tipo }))} />
    </div>
  );
}
