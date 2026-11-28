"use client";

import { useState } from "react";
import { crearCliente } from "@/lib/supabase/client";
import { hace } from "@/lib/social";

type Reporte = { id: string; tipo: string; motivo: string; creado_en: string; reportante: string; autor: string | null; texto: string | null; oculta: boolean };

export default function ReportesAdmin({ inicial }: { inicial: Reporte[] }) {
  const [lista, setLista] = useState(inicial);
  const [error, setError] = useState("");

  async function resolver(id: string, ocultar: boolean) {
    setError("");
    const { error: e } = await crearCliente().rpc("admin_resolver_reporte", { p_id: id, p_ocultar: ocultar });
    if (e) return setError("No pudimos resolver el reporte.");
    setLista((l) => l.filter((r) => r.id !== id));
  }

  return (
    <section className={`tarjeta grid gap-3 ${lista.length ? "!border-dorado" : ""}`}>
      <h2 className="text-xl">Reportes de la comunidad ({lista.length})</h2>
      {error && <p className="aviso-error">{error}</p>}
      {lista.length === 0 && <p className="text-sm text-suave">No hay reportes abiertos.</p>}
      <ul className="grid gap-3">
        {lista.map((r) => (
          <li key={r.id} className="grid gap-1 rounded-lg border border-borde p-3 text-sm">
            <p><strong>{({ logro: "Logro", evento: "Evento", agrupacion: "Agrupación", persona: "Persona (CalisBro)", mensaje: "Mensaje privado" } as Record<string, string>)[r.tipo] ?? "Publicación"}</strong> de @{r.autor ?? "?"}: <span className="break-words">«{r.texto}»</span></p>
            <p className="text-suave">Motivo: {r.motivo} · reportó @{r.reportante} · {hace(r.creado_en)}{r.oculta && " · ya oculta"}</p>
            <div className="flex gap-2 pt-1">
              <button className="btn btn-lava !py-1" onClick={() => resolver(r.id, true)}>{r.tipo === "logro" ? "Eliminar" : r.tipo === "persona" || r.tipo === "mensaje" ? "Suspender CalisBro" : "Ocultar"}</button>
              <button className="btn btn-borde !py-1" onClick={() => resolver(r.id, false)}>Descartar</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
