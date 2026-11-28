"use client";

import { useCallback, useEffect, useState } from "react";
import { useTextos } from "@/components/Idioma";
import { rellenar } from "@/lib/i18n/diccionarios";
import { crearCliente } from "@/lib/supabase/client";
import Revisiones from "@/components/Revisiones";

type Item = { id: string; nombre: string; series: number | null; reps: number | null; segundos: number | null; descanso_seg: number | null; notas: string | null; video_url: string | null };
type Entreno = { id: string; orden: number; nombre: string; notas: string | null; hecho: boolean; hecho_en: string | null; rpe: number | null; comentario: string | null; agenda: string | null; items: Item[] };
type Asig = { asignacion_id: string; plan: string; descripcion: string | null; pagina: { id: string; nombre: string }; orden_fijo: boolean; entrenos: Entreno[] };

function Detalle({ a, e, bloqueado, alCambiar }: { a: Asig; e: Entreno; bloqueado: boolean; alCambiar: () => void }) {
  const { t, idioma } = useTextos();
  const [rpe, setRpe] = useState(e.rpe ? String(e.rpe) : "");
  const [coment, setComent] = useState(e.comentario ?? "");
  const [fecha, setFecha] = useState(e.agenda ?? "");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [cargando, setCargando] = useState(false);

  async function hecho() {
    setErr(""); setMsg(""); setCargando(true);
    const { error } = await crearCliente().rpc("completar_entreno", { p_asig: a.asignacion_id, p_entreno: e.id, p_rpe: rpe ? Number(rpe) : null, p_comentario: coment });
    setCargando(false);
    if (error) return setErr(error.message === "orden_fijo" ? t["ent.errOrden"] : t["ent.error"]);
    setMsg(t["ent.guardado"]);
    alCambiar();
  }
  async function agendar(f: string) {
    setFecha(f);
    await crearCliente().rpc("programar_entreno", { p_asig: a.asignacion_id, p_entreno: e.id, p_fecha: f || null });
    alCambiar();
  }

  return (
    <div className="grid gap-3 border-t border-borde pt-3">
      {e.notas && <p className="text-sm text-suave">{e.notas}</p>}
      <ol className="grid gap-2">
        {e.items.map((i) => (
          <li key={i.id} className="rounded-xl border border-borde p-2">
            <p className="font-bold">{i.nombre}</p>
            <p className="text-sm text-suave">
              {[i.series && rellenar(t["ent.series"], { n: String(i.series) }), i.reps && rellenar(t["ent.reps"], { n: String(i.reps) }), i.segundos && rellenar(t["ent.seg"], { n: String(i.segundos) }), i.descanso_seg != null && rellenar(t["ent.desc"], { n: String(i.descanso_seg) })].filter(Boolean).join(" · ")}
            </p>
            {i.notas && <p className="text-sm">{i.notas}</p>}
            {i.video_url && <a href={i.video_url} target="_blank" rel="noopener noreferrer" className="text-sm text-lava underline">▶ {t["ent.video"]}</a>}
          </li>
        ))}
      </ol>
      {bloqueado ? (
        <p className="text-sm text-suave">🔒 {t["ent.bloqueado"]}</p>
      ) : (
        <>
          <label className="grid gap-1 text-sm">{t["ent.rpe"]}
            <select className="campo" value={rpe} onChange={(x) => setRpe(x.target.value)}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <textarea className="campo" rows={2} maxLength={500} placeholder={t["ent.coment"]} value={coment} onChange={(x) => setComent(x.target.value)} />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-lava" onClick={hecho} disabled={cargando}>{e.hecho ? t["ent.actualizar"] : t["ent.marcar"]}</button>
            {!e.hecho && (
              <label className="flex items-center gap-2 text-sm text-suave">{t["ent.agendar"]}
                <input type="date" className="campo !w-auto !py-1.5" value={fecha} onChange={(x) => agendar(x.target.value)} />
              </label>
            )}
          </div>
          {fecha && !e.hecho && <p className="text-xs text-suave">{rellenar(t["ent.agendado"], { fecha: new Date(fecha + "T12:00:00").toLocaleDateString(idioma, { dateStyle: "medium" }) })}</p>}
        </>
      )}
      {msg && <p className="aviso-ok" role="status">{msg}</p>}
      {err && <p className="aviso-error" role="alert">{err}</p>}
    </div>
  );
}

export default function MisEntrenos() {
  const { t } = useTextos();
  const [datos, setDatos] = useState<Asig[] | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data } = await crearCliente().rpc("mis_entrenos");
    setDatos((data ?? []) as Asig[]);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  if (datos === null) return <p className="tarjeta text-suave">{t["ent.cargando"]}</p>;
  if (datos.length === 0) return null;

  const paginas = [...new Map(datos.map((a) => [a.pagina.id, a.pagina])).values()];
  return (
    <section className="grid gap-3" aria-label={t["ent.titulo"]}>
      <h2 className="text-2xl">{t["ent.titulo"]}</h2>
      {datos.map((a) => {
        const sig = a.entrenos.findIndex((e) => !e.hecho);
        const hechos = a.entrenos.filter((e) => e.hecho).length;
        return (
          <div key={a.asignacion_id} className="tarjeta grid gap-3">
            <div>
              <p className="titulo text-xl text-lava">{a.plan}</p>
              <p className="text-sm text-suave">{rellenar(t["ent.de"], { pagina: a.pagina.nombre })} · {rellenar(t["ent.progreso"], { hechos: String(hechos), total: String(a.entrenos.length) })} · {a.orden_fijo ? t["ent.ordenFijo"] : t["ent.flexible"]}</p>
              {a.descripcion && <p className="text-sm">{a.descripcion}</p>}
            </div>
            <ul className="grid gap-2">
              {a.entrenos.map((e, idx) => {
                const clave = `${a.asignacion_id}:${e.id}`;
                const esSig = idx === sig;
                const bloqueado = a.orden_fijo && !e.hecho && sig !== -1 && idx > sig;
                return (
                  <li key={e.id} className={`rounded-xl border p-3 ${esSig ? "border-lava" : "border-borde"}`}>
                    <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setAbierto(abierto === clave ? null : clave)} aria-expanded={abierto === clave}>
                      <span className="font-bold">{e.nombre}</span>
                      <span className="shrink-0 text-xs">
                        {e.hecho ? <span className="text-dorado">✔ {t["ent.hecho"]}</span> : bloqueado ? "🔒" : esSig ? <span className="text-lava">➜ {t["ent.siguiente"]}</span> : null}
                      </span>
                    </button>
                    {abierto === clave && <Detalle a={a} e={e} bloqueado={bloqueado} alCambiar={cargar} />}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {paginas.map((p) => <Revisiones key={p.id} paginaId={p.id} soy="persona" />)}
    </section>
  );
}
