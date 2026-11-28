import type { Metadata } from "next";
import { requerirPerfil, misPaginas } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";
import Mercado from "@/components/Mercado";

export const metadata: Metadata = { title: "Marketplace" };

export default async function MercadoPagina() {
  const { perfil } = await requerirPerfil();
  const { t } = await textos();
  const paginas = await misPaginas();
  const puede = paginas.some((p) => ["tienda", "wellness", "entrenador"].includes(p.tipo) && p.estado === "activa");
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">{t["mk.titulo"]}</h1>
      <Mercado pais={perfil.pais ?? ""} puedePublicar={puede} />
    </div>
  );
}
