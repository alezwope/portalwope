"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";

export default function ResolverVinculo({ id, escuelas }: { id: string; escuelas: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const [escuela, setEscuela] = useState(escuelas.length === 1 ? escuelas[0].id : "");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function resolver(aceptar: boolean) {
    setError("");
    setCargando(true);
    const { error } = await crearCliente().rpc("resolver_vinculo", { p_id: id, p_aceptar: aceptar, p_escuela: escuela || null });
    setCargando(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  return (
    <div className="grid gap-2">
      {escuelas.length > 0 && (
        <label className="grid gap-1 text-sm">
          Sumar a la escuela
          <select className="campo !py-1.5" value={escuela} onChange={(e) => setEscuela(e.target.value)}>
            <option value="">Sin escuela (entrenamiento individual)</option>
            {escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </label>
      )}
      <div className="flex gap-2">
        <button type="button" disabled={cargando} onClick={() => resolver(true)} className="btn btn-lava">Aceptar</button>
        <button type="button" disabled={cargando} onClick={() => resolver(false)} className="btn btn-borde">No puedo tomarle</button>
      </div>
      {error && <p className="aviso-error" role="alert">{error}</p>}
    </div>
  );
}
