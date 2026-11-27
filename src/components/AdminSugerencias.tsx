"use client";

import { useState } from "react";
import { crearCliente } from "@/lib/supabase/client";

export type SugerenciaAdmin = {
  id: string; autor: string; titulo: string; texto: string; categoria: string; estado: string;
  respuesta: string | null; votos_favor: number; votos_contra: number; creado_en: string;
};

export const ESTADOS_SUGERENCIA: Record<string, string> = {
  abierta: "Abierta", en_estudio: "En estudio", planificada: "Planificada", hecha: "Hecha", descartada: "Descartada", oculta: "Oculta (moderación)",
};

function Fila({ s, categorias }: { s: SugerenciaAdmin; categorias: Record<string, string> }) {
  const [estado, setEstado] = useState(s.estado);
  const [respuesta, setRespuesta] = useState(s.respuesta ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function guardar() {
    const { error } = await crearCliente().rpc("admin_sugerencia", { p_id: s.id, p_estado: estado, p_respuesta: respuesta || null });
    setMsg(error ? { ok: false, texto: error.message } : { ok: true, texto: "Guardado" });
  }

  return (
    <li className="tarjeta grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg">{s.titulo}</h3>
        <span className="text-sm">👍 {s.votos_favor} · 👎 {s.votos_contra}</span>
      </div>
      <p className="text-xs text-suave">{s.autor} · {categorias[s.categoria] ?? s.categoria} · {new Date(s.creado_en).toLocaleDateString("es")}</p>
      <p className="whitespace-pre-wrap">{s.texto}</p>
      <div className="grid gap-2 sm:grid-cols-[12rem_1fr_auto]">
        <select className="campo !py-1" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
          {Object.entries(ESTADOS_SUGERENCIA).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
        <input className="campo !py-1" value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Respuesta pública (la ve toda la comunidad)" maxLength={2000} />
        <button type="button" className="btn btn-borde !py-1" onClick={guardar}>Guardar</button>
      </div>
      {msg && <p className={msg.ok ? "text-xs text-suave" : "text-xs text-lava"}>{msg.texto}</p>}
    </li>
  );
}

export default function AdminSugerencias({ sugerencias, categorias }: { sugerencias: SugerenciaAdmin[]; categorias: Record<string, string> }) {
  const [filtro, setFiltro] = useState("abierta");
  const visibles = sugerencias.filter((s) => filtro === "todas" || s.estado === filtro);
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl">Sugerencias ({visibles.length})</h2>
        <select className="campo !w-auto !py-1" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar">
          <option value="todas">Todas</option>
          {Object.entries(ESTADOS_SUGERENCIA).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
      </div>
      {visibles.length === 0 ? <p className="tarjeta text-suave">No hay sugerencias en esta vista.</p> : (
        <ul className="grid gap-3">{visibles.map((s) => <Fila key={s.id} s={s} categorias={categorias} />)}</ul>
      )}
    </section>
  );
}
