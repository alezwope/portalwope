"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/planes";

type PlanMin = { id: string; nombre: string; orden_fijo: boolean };

export default function AsignarPlan({ planes, personaId, grupoId }: { planes: PlanMin[]; personaId?: string; grupoId?: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState(planes[0]?.id ?? "");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [orden, setOrden] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  if (planes.length === 0) return <p className="text-sm text-suave">Primero crea un plan en «Planes».</p>;
  const sel = planes.find((p) => p.id === plan);

  async function asignar() {
    setError("");
    setCargando(true);
    const { error } = await crearCliente().rpc("asignar_plan", {
      p_plan: plan, p_persona: personaId ?? null, p_grupo: grupoId ?? null,
      p_desde: desde || null, p_hasta: hasta || null, p_orden_fijo: orden ?? sel?.orden_fijo ?? true,
    });
    setCargando(false);
    if (error) return setError(mensajeError(error.message));
    setDesde(""); setHasta("");
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <select className="campo" value={plan} onChange={(e) => { setPlan(e.target.value); setOrden(null); }} aria-label="Plan">
        {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-0.5 text-xs text-suave">Desde (opcional)<input type="date" className="campo !py-1.5" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
        <label className="grid gap-0.5 text-xs text-suave">Hasta (opcional)<input type="date" className="campo !py-1.5" value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={orden ?? sel?.orden_fijo ?? true} onChange={(e) => setOrden(e.target.checked)} /> Orden fijo
      </label>
      {error && <p className="aviso-error" role="alert">{error}</p>}
      <button type="button" className="btn btn-lava justify-self-start" onClick={asignar} disabled={cargando}>{cargando ? "Asignando…" : "Asignar plan"}</button>
    </div>
  );
}
