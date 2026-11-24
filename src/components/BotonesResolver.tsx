"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";

export default function BotonesResolver({ id, soloDueno }: { id: string; soloDueno: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function resolver(aceptar: boolean) {
    setError("");
    setCargando(true);
    const { error } = await crearCliente().rpc("resolver_solicitud", { p_id: id, p_aceptar: aceptar });
    setCargando(false);
    if (error) setError(soloDueno ? "Solo el dueño de la escuela puede resolver esta solicitud." : error.message);
    else router.refresh();
  }

  return (
    <div className="grid gap-1">
      <div className="flex gap-2">
        <button type="button" disabled={cargando} onClick={() => resolver(true)} className="btn btn-lava">Aceptar</button>
        <button type="button" disabled={cargando} onClick={() => resolver(false)} className="btn btn-borde">Rechazar</button>
      </div>
      {error && <p className="aviso-error" role="alert">{error}</p>}
    </div>
  );
}
