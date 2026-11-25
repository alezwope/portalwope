"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { NIVELES, nivelDe } from "@/lib/catalogos";
import { PARQ, ENTRADAS_VACIAS, calcular, NOMBRE_NIVEL, type Entradas } from "@/lib/nivelador";
import { guardarNivelacion } from "@/app/nivelador/acciones";

const CLAVE = "unibars.nivelador.v1";

function Num({ valor, onChange, etiqueta, ayuda, unidad }: { valor: number | null; onChange: (v: number | null) => void; etiqueta: string; ayuda?: string; unidad?: string }) {
  return (
    <label className="grid gap-1 text-sm">
      <span>{etiqueta}{unidad ? <span className="text-suave"> ({unidad})</span> : null}</span>
      <input
        className="campo"
        type="number"
        inputMode="numeric"
        min={0}
        max={600}
        value={valor ?? ""}
        placeholder="0"
        onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Math.min(600, Math.floor(Number(e.target.value)))))}
      />
      {ayuda && <span className="text-xs text-suave">{ayuda}</span>}
    </label>
  );
}
function Si({ valor, onChange, texto }: { valor: boolean; onChange: (v: boolean) => void; texto: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={valor} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--lava)]" />
      {texto}
    </label>
  );
}
function Patron({ titulo, omitirTexto, omitir, setOmitir, children }: { titulo: string; omitirTexto: string; omitir: boolean; setOmitir: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <section className="tarjeta grid gap-3">
      <h2 className="text-xl text-lava">{titulo}</h2>
      <Si valor={omitir} onChange={setOmitir} texto={omitirTexto} />
      {!omitir && <div className="grid gap-3 sm:grid-cols-2">{children}</div>}
    </section>
  );
}

export default function Nivelador({ conSesion }: { conSesion: boolean }) {
  const [e, setE] = useState<Entradas>(ENTRADAS_VACIAS);
  const [cargado, setCargado] = useState(false);
  const [calculado, setCalculado] = useState<ReturnType<typeof calcular> | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pendiente, empezar] = useTransition();

  useEffect(() => {
    try {
      const g = localStorage.getItem(CLAVE);
    // eslint-disable-next-line react-hooks/set-state-in-effect
      if (g) setE({ ...ENTRADAS_VACIAS, ...JSON.parse(g) });
    } catch {}
    setCargado(true);
  }, []);
  useEffect(() => {
    if (!cargado) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(e));
    } catch {}
  }, [e, cargado]);

  const set = <K extends keyof Entradas>(k: K, v: Entradas[K]) => {
    setE((p) => ({ ...p, [k]: v }));
    setCalculado(null);
    setMensaje(null);
  };
  const sub = <K extends "piernas" | "empuje" | "core" | "traccion">(k: K, cambios: Partial<Entradas[K]>) => set(k, { ...e[k], ...cambios });

  function calcularAhora() {
    setMensaje(null);
    const r = calcular(e);
    setCalculado(r);
    if (r.ok) setTimeout(() => document.getElementById("resultado")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function guardar() {
    empezar(async () => {
      const r = await guardarNivelacion(e);
      setMensaje(r.ok ? { tipo: "ok", texto: `¡Listo! Tu nivel ${NOMBRE_NIVEL[r.nivel as keyof typeof NOMBRE_NIVEL]} quedó guardado en tu perfil.` } : { tipo: "error", texto: r.error });
    });
  }

  const r = calculado?.ok ? calculado.r : null;
  const nv = r ? nivelDe(r.nivel) : null;

  return (
    <div className="grid gap-5">
      <section className="tarjeta grid gap-3">
        <h2 className="text-xl text-lava">1. Tu salud primero</h2>
        <p className="text-sm text-suave">Cuestionario de aptitud para la actividad física (basado en el PAR-Q+). No reemplaza una consulta médica.</p>
        {PARQ.map((q, i) => (
          <fieldset key={i} className="grid gap-1">
            <legend className="text-sm">{i + 1}. {q}</legend>
            <div className="flex gap-4 text-sm">
              {[true, false].map((v) => (
                <label key={String(v)} className="flex items-center gap-1">
                  <input type="radio" name={`parq${i}`} checked={e.parq[i] === v} onChange={() => set("parq", e.parq.map((x, j) => (j === i ? v : x)))} className="accent-[var(--lava)]" />
                  {v ? "Sí" : "No"}
                </label>
              ))}
            </div>
            {i === 5 && e.parq[5] === true && (
              <input className="campo" maxLength={120} placeholder="¿Qué zona? (hombro, rodilla, espalda…)" value={e.parqZona} onChange={(ev) => set("parqZona", ev.target.value)} />
            )}
          </fieldset>
        ))}
      </section>

      <section className="tarjeta grid gap-3">
        <h2 className="text-xl text-lava">2. Tu contexto</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Rango de edad
            <select className="campo" value={e.edad} onChange={(ev) => set("edad", ev.target.value)}>
              <option value="">Prefiero no decir</option>
              {["13-17", "18-29", "30-39", "40-49", "50-59", "60+"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            ¿Cuándo entrenaste fuerza por última vez?
            <select className="campo" value={e.ultimoEntreno} onChange={(ev) => set("ultimoEntreno", ev.target.value as Entradas["ultimoEntreno"])}>
              <option value="">Elige…</option>
              <option value="semana">Esta semana</option>
              <option value="mes">En el último mes</option>
              <option value="seis_meses">Hace 1 a 6 meses</option>
              <option value="mas_seis">Hace más de 6 meses</option>
              <option value="nunca">Nunca</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            ¿Haces al menos 150 min de actividad moderada por semana?
            <select className="campo" value={e.activo === null ? "" : e.activo ? "si" : "no"} onChange={(ev) => set("activo", ev.target.value === "" ? null : ev.target.value === "si")}>
              <option value="">Elige…</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            ¿Qué nivel crees que tienes?
            <select className="campo" value={e.percibido} onChange={(ev) => set("percibido", ev.target.value as Entradas["percibido"])}>
              <option value="">No sé</option>
              {NIVELES.map((n) => <option key={n.clave} value={n.clave}>{n.nombre}</option>)}
            </select>
          </label>
        </div>
      </section>

      <p className="text-sm text-suave">
        3. Tus marcas. Pon <strong>0</strong> en lo que no puedas hacer y no pruebes nada que te duela. Necesitamos al menos 3 de los 4 patrones.
      </p>

      <Patron titulo="Piernas" omitirTexto="Prefiero omitir este patrón" omitir={e.piernas.omitir} setOmitir={(v) => sub("piernas", { omitir: v })}>
        <Num etiqueta="Sentadillas en 60 segundos" unidad="repeticiones" valor={e.piernas.reps} onChange={(v) => sub("piernas", { reps: v })} />
        <Num etiqueta="Pistol libre (cada pierna)" unidad="repeticiones" valor={e.piernas.pistolLibre} onChange={(v) => sub("piernas", { pistolLibre: v })} ayuda="La pierna más débil." />
        <Si valor={e.piernas.completa} onChange={(v) => sub("piernas", { completa: v })} texto="Bajo hasta abajo (cadera bajo las rodillas)" />
        <Si valor={e.piernas.pistolAsistido} onChange={(v) => sub("piernas", { pistolAsistido: v })} texto="Hago pistol asistido (con apoyo)" />
      </Patron>

      <Patron titulo="Empuje" omitirTexto="Prefiero omitir este patrón" omitir={e.empuje.omitir} setOmitir={(v) => sub("empuje", { omitir: v })}>
        <Num etiqueta="Flexiones en la pared" unidad="repeticiones" valor={e.empuje.pared} onChange={(v) => sub("empuje", { pared: v })} />
        <Num etiqueta="Flexiones con manos en banco" unidad="repeticiones" valor={e.empuje.banco} onChange={(v) => sub("empuje", { banco: v })} />
        <Num etiqueta="Flexiones con rodillas en el piso" unidad="repeticiones" valor={e.empuje.rodillas} onChange={(v) => sub("empuje", { rodillas: v })} />
        <Num etiqueta="Flexiones completas en el piso" unidad="repeticiones" valor={e.empuje.piso} onChange={(v) => sub("empuje", { piso: v })} />
        <Num etiqueta="Fondos en paralelas" unidad="repeticiones" valor={e.empuje.fondos} onChange={(v) => sub("empuje", { fondos: v })} />
        <div className="grid gap-2">
          <Si valor={e.empuje.pino} onChange={(v) => sub("empuje", { pino: v })} texto="Hago flexión de pino (fuerza)" />
          <Si valor={e.empuje.pseudo} onChange={(v) => sub("empuje", { pseudo: v })} texto="Hago pseudo planche push-up" />
        </div>
      </Patron>

      <Patron titulo="Core" omitirTexto="Prefiero omitir este patrón" omitir={e.core.omitir} setOmitir={(v) => sub("core", { omitir: v })}>
        <Num etiqueta="Plancha en codos" unidad="segundos" valor={e.core.plancha} onChange={(v) => sub("core", { plancha: v })} />
        <Num etiqueta="Hollow body" unidad="segundos" valor={e.core.hollow} onChange={(v) => sub("core", { hollow: v })} />
        <Num etiqueta="L-sit" unidad="segundos" valor={e.core.lsit} onChange={(v) => sub("core", { lsit: v })} />
      </Patron>

      <Patron titulo="Tracción" omitirTexto="No tengo barra a mano" omitir={e.traccion.omitir} setOmitir={(v) => sub("traccion", { omitir: v })}>
        <Num etiqueta="Colgado de la barra" unidad="segundos" valor={e.traccion.colgado} onChange={(v) => sub("traccion", { colgado: v })} />
        <Num etiqueta="Dominada estática (isométrica)" unidad="segundos" valor={e.traccion.estatica} onChange={(v) => sub("traccion", { estatica: v })} />
        <Num etiqueta="Dominadas completas" unidad="repeticiones" valor={e.traccion.dominadas} onChange={(v) => sub("traccion", { dominadas: v })} />
        <div className="grid gap-2">
          <Si valor={e.traccion.muscleUp} onChange={(v) => sub("traccion", { muscleUp: v })} texto="Hago muscle up estricto" />
          <Si valor={e.traccion.frontLever} onChange={(v) => sub("traccion", { frontLever: v })} texto="Hago front lever tuck" />
        </div>
      </Patron>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-lava" onClick={calcularAhora}>Calcular mi nivel</button>
        <button type="button" className="btn btn-borde" onClick={() => { setE(ENTRADAS_VACIAS); setCalculado(null); try { localStorage.removeItem(CLAVE); } catch {} }}>Borrar respuestas</button>
      </div>
      {calculado && !calculado.ok && <p className="aviso-error" role="alert">{calculado.error}</p>}

      {r && nv && (
        <section id="resultado" className="tarjeta grid gap-4 !border-2" style={{ borderColor: nv.color }} aria-live="polite">
          <div>
            <p className="text-sm text-suave">Tu nivel</p>
            <p className="titulo text-4xl" style={{ color: nv.color }}>{nv.nombre}{r.subnivel ? ` ${r.subnivel}` : ""}</p>
            <p className="text-suave">{nv.etapa}</p>
          </div>
          <ul className="grid gap-2" aria-label="Nivel por patrón">
            {r.patrones.map((p) => {
              const pn = p.idx === null ? null : NIVELES[p.idx];
              return (
                <li key={p.clave} className="grid gap-1">
                  <div className="flex justify-between text-sm">
                    <span>{p.nombre}{r.atrasados.includes(p.nombre) ? " · atrasado" : ""}</span>
                    <span style={{ color: pn?.color }}>{pn ? pn.nombre : "Sin medir"}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg">
                    <div className="h-full rounded-full" style={{ width: p.idx === null ? 0 : `${((p.idx + 1) / 5) * 100}%`, background: pn?.color }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="rounded-lg border border-borde p-3">
            <p className="text-sm text-suave">Tu punto de partida en CalisteniaGO</p>
            <p className="text-lg font-bold">{r.destino.etiqueta}</p>
            <p className="text-sm text-suave">{r.destino.detalle}</p>
          </div>
          {r.avisos.map((a, i) => <p key={i} className="aviso-ok">{a}</p>)}
          <p className="text-xs text-suave">Resultado declarado: se basa en lo que tú indicaste. Más adelante podrás verificarlo con la cámara.</p>

          {conSesion ? (
            <button type="button" className="btn btn-lava justify-self-start" onClick={guardar} disabled={pendiente}>
              {pendiente ? "Guardando…" : "Guardar mi nivel en mi perfil"}
            </button>
          ) : (
            <Link href="/entrar?siguiente=/nivelador" className="btn btn-lava justify-self-start">Entrar para guardar mi nivel</Link>
          )}
          {mensaje && <p className={mensaje.tipo === "ok" ? "aviso-ok" : "aviso-error"} role="status">{mensaje.texto}</p>}
        </section>
      )}
    </div>
  );
}
