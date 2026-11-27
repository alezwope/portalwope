"use client";

import { useState } from "react";
import { crearCliente } from "@/lib/supabase/client";

export type ComentarioTester = {
  id: string; autor: string; tipo: string; texto: string; ruta: string | null;
  dispositivo: string | null; estado: string; nota_admin: string | null; creado_en: string;
};

const ESTADOS: Record<string, string> = { nuevo: "Nuevo", en_curso: "En curso", resuelto: "Resuelto", descartado: "Descartado" };

function Fila({ c, tipos }: { c: ComentarioTester; tipos: Record<string, string> }) {
  const [estado, setEstado] = useState(c.estado);
  const [nota, setNota] = useState(c.nota_admin ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function guardar() {
    const { error } = await crearCliente().rpc("admin_comentario", { p_id: c.id, p_estado: estado, p_nota: nota || null });
    setMsg(error ? { ok: false, texto: error.message } : { ok: true, texto: "Guardado" });
  }

  return (
    <li className="tarjeta grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span><strong>{c.autor}</strong> <span className="text-suave">· {tipos[c.tipo] ?? c.tipo} · {new Date(c.creado_en).toLocaleString("es")}</span></span>
        {c.ruta && <code className="text-xs text-suave">{c.ruta}</code>}
      </div>
      <p className="whitespace-pre-wrap">{c.texto}</p>
      {c.dispositivo && <p className="truncate text-xs text-suave">{c.dispositivo}</p>}
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
        <select className="campo !py-1" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
          {Object.entries(ESTADOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
        <input className="campo !py-1" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota interna" maxLength={500} />
        <button type="button" className="btn btn-borde !py-1" onClick={guardar}>Guardar</button>
      </div>
      {msg && <p className={msg.ok ? "text-xs text-suave" : "text-xs text-lava"}>{msg.texto}</p>}
    </li>
  );
}

export default function AdminComentarios({ comentarios, tipos }: { comentarios: ComentarioTester[]; tipos: Record<string, string> }) {
  const [filtro, setFiltro] = useState("abiertos");
  const visibles = comentarios.filter((c) => filtro === "todos" || (filtro === "abiertos" ? c.estado === "nuevo" || c.estado === "en_curso" : c.estado === filtro));
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl">Comentarios de testers ({visibles.length})</h2>
        <select className="campo !w-auto !py-1" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar">
          <option value="abiertos">Por atender</option>
          <option value="todos">Todos</option>
          {Object.entries(ESTADOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
      </div>
      {visibles.length === 0 ? <p className="tarjeta text-suave">No hay comentarios en esta vista.</p> : (
        <ul className="grid gap-3">{visibles.map((c) => <Fila key={c.id} c={c} tipos={tipos} />)}</ul>
      )}
    </section>
  );
}
