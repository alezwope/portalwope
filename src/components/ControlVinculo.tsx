"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";

/** Lado de la persona: decide qué datos comparte y puede terminar el vínculo. */
export default function ControlVinculo({ id, estado, medidas, salud }: { id: string; estado: string; medidas: boolean; salud: boolean }) {
  const router = useRouter();
  const [m, setM] = useState(medidas);
  const [s, setS] = useState(salud);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function guardar(nm: boolean, ns: boolean) {
    setError("");
    setM(nm);
    setS(ns);
    const { error } = await crearCliente().rpc("permisos_vinculo", { p_id: id, p_medidas: nm, p_salud: ns });
    if (error) {
      setError("No pudimos guardar. Intenta de nuevo.");
      setM(medidas);
      setS(salud);
    }
  }

  async function terminar() {
    const texto = estado === "solicitud" ? "¿Cancelar la solicitud?" : "¿Terminar el vínculo? Tu entrenador dejará de ver tus datos.";
    if (!window.confirm(texto)) return;
    setCargando(true);
    const { error } = await crearCliente().rpc("terminar_vinculo", { p_id: id });
    setCargando(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  return (
    <div className="grid gap-2 text-sm">
      <p className="text-suave">Siempre ve tu nivel, objetivo y marcas. Además compartes:</p>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={m} onChange={(e) => guardar(e.target.checked, s)} className="accent-[var(--lava)]" />
        Peso y estatura
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={s} onChange={(e) => guardar(m, e.target.checked)} className="accent-[var(--lava)]" />
        Lesiones y notas de salud
      </label>
      {error && <p className="aviso-error" role="alert">{error}</p>}
      <button type="button" onClick={terminar} disabled={cargando} className="btn btn-borde justify-self-start !py-1.5">
        {estado === "solicitud" ? "Cancelar solicitud" : "Terminar vínculo"}
      </button>
    </div>
  );
}
