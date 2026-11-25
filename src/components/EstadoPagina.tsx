"use client";

import { useState } from "react";
import { crearCliente } from "@/lib/supabase/client";
import { ESTADOS_PAGINA } from "@/lib/catalogos";

export default function EstadoPagina({ id, actual }: { id: string; actual: string }) {
  const [estado, setEstado] = useState(actual);
  const [error, setError] = useState(false);

  async function cambiar(nuevo: string) {
    setError(false);
    const previo = estado;
    setEstado(nuevo);
    const { error } = await crearCliente().rpc("admin_estado_pagina", { p_id: id, p_estado: nuevo });
    if (error) {
      setEstado(previo);
      setError(true);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <select className="campo !w-auto !py-1" value={estado} onChange={(e) => cambiar(e.target.value)} aria-label="Estado de la página">
        {Object.entries(ESTADOS_PAGINA).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
      </select>
      {error && <span className="text-xs text-lava">Error</span>}
    </span>
  );
}
