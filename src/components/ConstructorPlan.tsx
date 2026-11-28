"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";
import { mensajeError, NIVELES_DB, sinTildes, type EjercicioCat } from "@/lib/planes";

export type ItemPlan = { ejercicio_id: string | null; nombre_libre: string; series: string; reps: string; segundos: string; descanso_seg: string; notas: string };
export type EntrenoPlan = { id?: string; nombre: string; notas: string; items: ItemPlan[] };
export type PlanInicial = { id?: string; pagina_id: string; nombre: string; descripcion: string; orden_fijo: boolean; entrenos: EntrenoPlan[] };

const itemVacio = (): ItemPlan => ({ ejercicio_id: null, nombre_libre: "", series: "3", reps: "", segundos: "", descanso_seg: "60", notas: "" });
const mover = <T,>(a: T[], i: number, d: number) => {
  const j = i + d;
  if (j < 0 || j >= a.length) return a;
  const c = [...a];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
};

function Selector({ catalogo, alElegir, alCerrar }: { catalogo: EjercicioCat[]; alElegir: (e: EjercicioCat) => void; alCerrar: () => void }) {
  const [q, setQ] = useState("");
  const [nivel, setNivel] = useState("");
  const lista = useMemo(() => {
    const b = sinTildes(q.trim());
    return catalogo.filter((e) => (!nivel || e.nivel === nivel) && (!b || sinTildes(e.nombre).includes(b))).slice(0, 40);
  }, [q, nivel, catalogo]);
  return (
    <div className="grid gap-2 rounded-xl border border-borde p-3">
      <div className="flex flex-wrap gap-2">
        <input className="campo !w-auto flex-1" placeholder="Buscar ejercicio (dominada, plancha, pino…)" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <select className="campo !w-auto" value={nivel} onChange={(e) => setNivel(e.target.value)} aria-label="Nivel">
          <option value="">Todos los niveles</option>
          {NIVELES_DB.map((n) => <option key={n}>{n}</option>)}
        </select>
        <button type="button" className="btn btn-borde !py-1" onClick={alCerrar}>Cerrar</button>
      </div>
      <ul className="grid max-h-72 gap-1 overflow-y-auto">
        {lista.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => alElegir(e)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--card)]">
              <span>{e.nombre}</span>
              <span className="shrink-0 text-xs text-suave">{e.nivel}{e.equipo ? ` · ${e.equipo}` : ""}</span>
            </button>
          </li>
        ))}
        {lista.length === 0 && <li className="px-2 text-sm text-suave">Sin resultados.</li>}
      </ul>
    </div>
  );
}

export default function ConstructorPlan({ inicial, catalogo }: { inicial: PlanInicial; catalogo: EjercicioCat[] }) {
  const router = useRouter();
  const [plan, setPlan] = useState(inicial);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const porId = useMemo(() => new Map(catalogo.map((e) => [e.id, e])), [catalogo]);

  const setEntreno = (i: number, f: (e: EntrenoPlan) => EntrenoPlan) =>
    setPlan((p) => ({ ...p, entrenos: p.entrenos.map((e, k) => (k === i ? f(e) : e)) }));
  const setItem = (i: number, j: number, cambio: Partial<ItemPlan>) =>
    setEntreno(i, (e) => ({ ...e, items: e.items.map((it, k) => (k === j ? { ...it, ...cambio } : it)) }));

  async function guardar() {
    setError("");
    if (!plan.nombre.trim()) return setError("Ponle un nombre al plan.");
    setCargando(true);
    const { error } = await crearCliente().rpc("plan_guardar", {
      p_pagina: plan.pagina_id,
      p_plan: plan.id ?? null,
      p_nombre: plan.nombre,
      p_descripcion: plan.descripcion,
      p_orden_fijo: plan.orden_fijo,
      p_entrenos: plan.entrenos.map((e) => ({
        id: e.id ?? null, nombre: e.nombre, notas: e.notas,
        items: e.items.map((it) => ({ ...it, ejercicio_id: it.ejercicio_id ?? "" })),
      })),
    });
    setCargando(false);
    if (error) return setError(mensajeError(error.message));
    router.push("/panel/entrenador/planes");
    router.refresh();
  }

  async function borrar() {
    if (!plan.id || !window.confirm("¿Borrar este plan? También se borra lo asignado y el historial de quienes lo hicieron.")) return;
    setCargando(true);
    const { error } = await crearCliente().rpc("plan_borrar", { p_plan: plan.id });
    setCargando(false);
    if (error) return setError(mensajeError(error.message));
    router.push("/panel/entrenador/planes");
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <section className="tarjeta grid gap-3">
        <label className="grid gap-1 text-sm">Nombre del plan
          <input className="campo" maxLength={80} value={plan.nombre} onChange={(e) => setPlan({ ...plan, nombre: e.target.value })} placeholder="Ej.: Mi primera dominada · 4 semanas" />
        </label>
        <label className="grid gap-1 text-sm">Descripción (opcional)
          <textarea className="campo" rows={2} maxLength={500} value={plan.descripcion} onChange={(e) => setPlan({ ...plan, descripcion: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={plan.orden_fijo} onChange={(e) => setPlan({ ...plan, orden_fijo: e.target.checked })} />
          Orden fijo (la persona debe hacerlos uno tras otro). Si lo desmarcas, elige cuál hacer primero.
        </label>
      </section>

      {plan.entrenos.map((en, i) => (
        <section key={en.id ?? `n${i}`} className="tarjeta grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="titulo text-lava">{i + 1}</span>
            <input className="campo !w-auto flex-1" maxLength={80} value={en.nombre} onChange={(e) => setEntreno(i, (x) => ({ ...x, nombre: e.target.value }))} placeholder={`Entrenamiento ${i + 1} (Ej.: Día de tirón)`} />
            <button type="button" className="btn btn-borde !px-2 !py-1" aria-label="Subir" onClick={() => setPlan((p) => ({ ...p, entrenos: mover(p.entrenos, i, -1) }))}>↑</button>
            <button type="button" className="btn btn-borde !px-2 !py-1" aria-label="Bajar" onClick={() => setPlan((p) => ({ ...p, entrenos: mover(p.entrenos, i, 1) }))}>↓</button>
            <button type="button" className="btn btn-borde !px-2 !py-1" aria-label="Quitar entrenamiento" onClick={() => setPlan((p) => ({ ...p, entrenos: p.entrenos.filter((_, k) => k !== i) }))}>✕</button>
          </div>
          <input className="campo" maxLength={500} value={en.notas} onChange={(e) => setEntreno(i, (x) => ({ ...x, notas: e.target.value }))} placeholder="Indicaciones generales (opcional)" />

          <ul className="grid gap-2">
            {en.items.map((it, j) => {
              const cat = it.ejercicio_id ? porId.get(it.ejercicio_id) : null;
              return (
                <li key={j} className="grid gap-2 rounded-xl border border-borde p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {it.ejercicio_id ? (
                      <span className="flex-1 font-bold">{cat?.nombre ?? it.ejercicio_id}</span>
                    ) : (
                      <input className="campo !w-auto flex-1" maxLength={80} value={it.nombre_libre} onChange={(e) => setItem(i, j, { nombre_libre: e.target.value })} placeholder="Nombre del ejercicio" />
                    )}
                    <button type="button" className="btn btn-borde !px-2 !py-1" aria-label="Subir" onClick={() => setEntreno(i, (x) => ({ ...x, items: mover(x.items, j, -1) }))}>↑</button>
                    <button type="button" className="btn btn-borde !px-2 !py-1" aria-label="Bajar" onClick={() => setEntreno(i, (x) => ({ ...x, items: mover(x.items, j, 1) }))}>↓</button>
                    <button type="button" className="btn btn-borde !px-2 !py-1" aria-label="Quitar ejercicio" onClick={() => setEntreno(i, (x) => ({ ...x, items: x.items.filter((_, k) => k !== j) }))}>✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {([["series", "Series"], ["reps", "Repeticiones"], ["segundos", "Segundos"], ["descanso_seg", "Descanso (s)"]] as const).map(([k, et]) => (
                      <label key={k} className="grid gap-0.5 text-xs text-suave">{et}
                        <input className="campo !py-1.5" inputMode="numeric" value={it[k]} onChange={(e) => setItem(i, j, { [k]: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
                      </label>
                    ))}
                  </div>
                  <input className="campo !py-1.5" maxLength={300} value={it.notas} onChange={(e) => setItem(i, j, { notas: e.target.value })} placeholder="Nota (tempo, variante, truco…)" />
                </li>
              );
            })}
          </ul>

          {abierto === i ? (
            <Selector
              catalogo={catalogo}
              alCerrar={() => setAbierto(null)}
              alElegir={(e) => {
                setEntreno(i, (x) => ({ ...x, items: [...x.items, { ...itemVacio(), ejercicio_id: e.id }] }));
                setAbierto(null);
              }}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-borde !py-1.5" onClick={() => setAbierto(i)}>+ Ejercicio del catálogo</button>
              <button type="button" className="btn btn-borde !py-1.5" onClick={() => setEntreno(i, (x) => ({ ...x, items: [...x.items, itemVacio()] }))}>+ Ejercicio libre</button>
            </div>
          )}
        </section>
      ))}

      <button type="button" className="btn btn-borde justify-self-start" onClick={() => setPlan((p) => ({ ...p, entrenos: [...p.entrenos, { nombre: "", notas: "", items: [] }] }))}>+ Añadir entrenamiento</button>

      {error && <p className="aviso-error" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-lava" onClick={guardar} disabled={cargando}>{cargando ? "Guardando…" : "Guardar plan"}</button>
        {plan.id && <button type="button" className="btn btn-borde" onClick={borrar} disabled={cargando}>Borrar plan</button>}
      </div>
    </div>
  );
}
