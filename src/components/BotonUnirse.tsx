"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";

export default function BotonUnirse({ escuelaId, yaPedida }: { escuelaId: string; yaPedida: boolean }) {
  const router = useRouter();
  const [pedida, setPedida] = useState(yaPedida);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function pedir() {
    setError("");
    setCargando(true);
    const { error } = await crearCliente().rpc("pedir_unirse_escuela", { p_escuela: escuelaId });
    setCargando(false);
    if (error) setError(error.message);
    else {
      setPedida(true);
      router.refresh();
    }
  }

  if (pedida) return <span className="aviso-ok">Solicitud enviada ✓</span>;
  return (
    <div className="grid gap-1">
      <button type="button" onClick={pedir} disabled={cargando} className="btn btn-lava">
        {cargando ? "Enviando…" : "Pedir unirme"}
      </button>
      {error && <p className="aviso-error" role="alert">{error}</p>}
    </div>
  );
}
