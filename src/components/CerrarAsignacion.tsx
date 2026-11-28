"use client";

import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";

export default function CerrarAsignacion({ id }: { id: string }) {
  const router = useRouter();
  async function cerrar() {
    if (!window.confirm("¿Quitar esta asignación? La persona dejará de verla (su historial se conserva).")) return;
    await crearCliente().rpc("asignacion_cerrar", { p_asig: id });
    router.refresh();
  }
  return <button type="button" onClick={cerrar} className="btn btn-borde !px-2 !py-1 text-xs">Quitar</button>;
}
