"use client";

import { useState } from "react";
import { crearCliente } from "@/lib/supabase/client";

export default function UsarInvitacion({ codigo, nombre }: { codigo: string; nombre: string }) {
  const [medidas, setMedidas] = useState(true);
  const [salud, setSalud] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function unirme() {
    setError("");
    setCargando(true);
    const { data, error } = await crearCliente().rpc("usar_invitacion", {
      p_codigo: codigo,
      p_comparte_medidas: medidas,
      p_comparte_salud: salud,
    });
    setCargando(false);
    if (error) setError(error.message);
    else setResultado(data as string);
  }

  if (resultado)
    return (
      <div className="grid gap-3">
        <p className="aviso-ok" role="status">
          {resultado === "aceptado"
            ? `¡Listo! Ya estás conectado con ${nombre}.`
            : `${nombre} llegó a su cupo por ahora. Tu solicitud quedó guardada y te avisaremos cuando te acepte.`}
        </p>
        <a href="/panel/perfil#entrenamiento" className="btn btn-lava justify-self-start">Completar mi perfil de entrenamiento</a>
      </div>
    );

  return (
    <div className="grid gap-3">
      <fieldset className="grid gap-2 text-sm">
        <legend className="mb-1">Tu entrenador verá tu nivel, objetivo y marcas. ¿Qué más compartes?</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={medidas} onChange={(e) => setMedidas(e.target.checked)} className="accent-[var(--lava)]" />
          Peso y estatura
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={salud} onChange={(e) => setSalud(e.target.checked)} className="accent-[var(--lava)]" />
          Lesiones y notas de salud
        </label>
      </fieldset>
      {error && <p className="aviso-error" role="alert">{error}</p>}
      <button type="button" onClick={unirme} disabled={cargando} className="btn btn-lava justify-self-start">
        {cargando ? "Uniéndote…" : `Unirme a ${nombre}`}
      </button>
    </div>
  );
}
