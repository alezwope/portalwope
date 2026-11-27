"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";

export default function AdminQuitarInsignia({ id }: { id: string }) {
  const router = useRouter();
  const [seguro, setSeguro] = useState(false);
  const [error, setError] = useState("");

  async function quitar() {
    const { error } = await crearCliente().rpc("admin_insignia_quitar", { p_id: id, p_motivo: "Quitada desde la consola" });
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  if (!seguro) return <button type="button" className="btn btn-borde !py-1" onClick={() => setSeguro(true)}>Quitar</button>;
  return (
    <span className="flex items-center gap-2">
      <button type="button" className="btn btn-lava !py-1" onClick={quitar}>Confirmar</button>
      <button type="button" className="btn btn-borde !py-1" onClick={() => setSeguro(false)}>Cancelar</button>
      {error && <span className="text-xs text-lava">{error}</span>}
    </span>
  );
}
