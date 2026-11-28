"use client";

import { useCallback, useEffect, useState } from "react";
import { useTextos } from "@/components/Idioma";
import { crearCliente } from "@/lib/supabase/client";

type Rev = { id: string; propone: "persona" | "entrenador"; fecha: string; nota: string | null; estado: "propuesta" | "confirmada" | "cancelada" };

/** Llamadas / revisiones entre un alumno y su entrenador. `personaId` solo lo usa el entrenador. */
export default function Revisiones({ paginaId, personaId, soy }: { paginaId: string; personaId?: string; soy: "persona" | "entrenador" }) {
  const { t, idioma } = useTextos();
  const [lista, setLista] = useState<Rev[] | null>(null);
  const [fecha, setFecha] = useState("");
  const [nota, setNota] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const cargar = useCallback(async () => {
    let q = crearCliente().from("revisiones").select("id, propone, fecha, nota, estado").eq("pagina_id", paginaId).order("fecha", { ascending: false }).limit(20);
    if (personaId) q = q.eq("persona_id", personaId);
    const { data } = await q;
    setLista((data ?? []) as Rev[]);
  }, [paginaId, personaId]);
  useEffect(() => { cargar(); }, [cargar]);

  async function proponer() {
    setErr(""); setMsg("");
    if (!fecha) return;
    const { error } = await crearCliente().rpc("revision_proponer", { p_pagina: paginaId, p_persona: personaId ?? null, p_fecha: new Date(fecha).toISOString(), p_nota: nota });
    if (error) return setErr(t["ent.error"]);
    setFecha(""); setNota(""); setMsg(t["ent.rev.enviada"]);
    cargar();
  }
  async function responder(id: string, estado: "confirmada" | "cancelada") {
    const { error } = await crearCliente().rpc("revision_responder", { p_id: id, p_estado: estado });
    if (error) setErr(t["ent.error"]);
    cargar();
  }
  const fmt = (f: string) => new Date(f).toLocaleString(idioma, { dateStyle: "medium", timeStyle: "short" });

  return (
    <section className="tarjeta grid gap-3">
      <h2 className="text-xl text-lava">{t["ent.rev.titulo"]}</h2>
      {lista && lista.length === 0 && <p className="text-sm text-suave">{t["ent.rev.vacio"]}</p>}
      <ul className="grid gap-2">
        {(lista ?? []).map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-borde p-2 text-sm">
            <span>
              <strong>{fmt(r.fecha)}</strong>
              {r.nota && <span className="text-suave"> · {r.nota}</span>}
              <span className="block text-xs text-suave">{r.propone === soy ? t["ent.rev.yo"] : t["ent.rev.otro"]} · {t[`ent.rev.${r.estado}` as "ent.rev.propuesta"]}</span>
            </span>
            {r.estado === "propuesta" && (
              <span className="flex gap-1">
                {r.propone !== soy && <button type="button" className="btn btn-lava !px-2 !py-1 text-xs" onClick={() => responder(r.id, "confirmada")}>{t["ent.rev.confirmar"]}</button>}
                <button type="button" className="btn btn-borde !px-2 !py-1 text-xs" onClick={() => responder(r.id, "cancelada")}>{t["ent.rev.cancelar"]}</button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <details>
        <summary className="cursor-pointer text-sm text-lava">{t["ent.rev.proponer"]}</summary>
        <div className="mt-2 grid gap-2">
          <label className="grid gap-0.5 text-xs text-suave">{t["ent.rev.fecha"]}<input type="datetime-local" className="campo !py-1.5" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
          <input className="campo" maxLength={300} placeholder={t["ent.rev.nota"]} value={nota} onChange={(e) => setNota(e.target.value)} />
          <button type="button" className="btn btn-lava justify-self-start" onClick={proponer} disabled={!fecha}>{t["ent.rev.enviar"]}</button>
        </div>
      </details>
      {msg && <p className="aviso-ok" role="status">{msg}</p>}
      {err && <p className="aviso-error" role="alert">{err}</p>}
    </section>
  );
}
