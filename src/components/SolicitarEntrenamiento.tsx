"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";
import { nivelDe } from "@/lib/catalogos";

export default function SolicitarEntrenamiento({
  paginaId,
  nombre,
  miNivel,
  atiende,
}: {
  paginaId: string;
  nombre: string;
  miNivel: string | null;
  atiende: string[];
}) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState("");
  const [medidas, setMedidas] = useState(true);
  const [salud, setSalud] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const fuera = atiende.length > 0 && miNivel && !atiende.includes(miNivel);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const { error } = await crearCliente().rpc("solicitar_vinculo", {
      p_pagina: paginaId,
      p_mensaje: mensaje,
      p_comparte_medidas: medidas,
      p_comparte_salud: salud,
    });
    setCargando(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  return (
    <form onSubmit={enviar} className="grid gap-3">
      <h2 className="text-xl">Solicitar entrenamiento</h2>
      {fuera && (
        <p className="aviso-error">
          {nombre} no indica tu nivel ({nivelDe(miNivel)?.nombre}) entre los que entrena. Puedes escribirle igual, pero quizás no pueda tomarte.
        </p>
      )}
      <label className="grid gap-1 text-sm">
        Cuéntale qué buscas (opcional)
        <textarea className="campo" rows={3} maxLength={500} value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Mi objetivo, mis horarios, si prefieres presencial o a distancia…" />
      </label>
      <fieldset className="grid gap-2 text-sm">
        <legend className="mb-1">Verá tu nivel, objetivo y marcas. ¿Qué más compartes?</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={medidas} onChange={(e) => setMedidas(e.target.checked)} className="accent-[var(--lava)]" />
          Peso y estatura
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={salud} onChange={(e) => setSalud(e.target.checked)} className="accent-[var(--lava)]" />
          Lesiones y notas de salud
        </label>
        <span className="text-xs text-suave">Puedes cambiarlo cuando quieras desde Comunidad.</span>
      </fieldset>
      {error && <p className="aviso-error" role="alert">{error}</p>}
      <button className="btn btn-lava justify-self-start" disabled={cargando}>{cargando ? "Enviando…" : "Enviar solicitud"}</button>
    </form>
  );
}
