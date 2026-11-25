"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";

export default function TerminarVinculo({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function terminar() {
    if (!window.confirm("¿Terminar el vínculo con este alumno? Dejarás de ver sus datos.")) return;
    setCargando(true);
    const { error } = await crearCliente().rpc("terminar_vinculo", { p_id: id });
    setCargando(false);
    if (error) setError(error.message);
    else {
      router.push("/panel/entrenador/alumnos");
      router.refresh();
    }
  }

  return (
    <div className="grid gap-2">
      <button type="button" onClick={terminar} disabled={cargando} className="btn btn-borde justify-self-start">Terminar vínculo</button>
      {error && <p className="aviso-error" role="alert">{error}</p>}
    </div>
  );
}
