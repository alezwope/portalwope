"use client";

import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";

type Fila = { id: string; titulo: string; pagina: string; seccion: string; estado: string; oficial: boolean; reportes: number };

export default function AdminMercado({ filas }: { filas: Fila[] }) {
  const router = useRouter();
  async function cambiar(id: string, oficial: boolean) {
    const { error } = await crearCliente().rpc("admin_mercado_oficial", { p_id: id, p_oficial: oficial });
    if (error) alert("No se pudo cambiar."); else router.refresh();
  }
  return (
    <div className="tarjeta grid gap-2">
      <p className="text-sm text-suave">Marca como «Oficial WOPE» lo que viene de tu tienda de la web. Con 3 reportes un producto se oculta solo.</p>
      {filas.length === 0 && <p className="text-suave">Aún no hay productos.</p>}
      {filas.map((f) => (
        <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
          <span><strong>{f.titulo}</strong> · {f.pagina} · {f.seccion} · {f.estado}{f.reportes > 0 && <span className="text-lava"> · {f.reportes} reportes</span>}</span>
          <button className="btn btn-borde !py-1" onClick={() => cambiar(f.id, !f.oficial)}>{f.oficial ? "Quitar sello Oficial" : "Marcar Oficial WOPE"}</button>
        </div>
      ))}
    </div>
  );
}
