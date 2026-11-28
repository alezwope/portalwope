"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { NIVELES, nivelDe } from "@/lib/catalogos";
import { CAMARA, ENTRADAS_VACIAS, N_PARQ, calcular, completar, sinImpacto, type ClavePatron, type Entradas, type Aviso } from "@/lib/nivelador";
import CamaraPrueba from "@/components/CamaraPrueba";
import { guardarNivelacion } from "@/app/nivelador/acciones";
import { useTextos } from "@/components/Idioma";
import { rellenar, type ClaveTexto, type Textos } from "@/lib/i18n/diccionarios";

const CLAVE = "unibars.nivelador.v2";
const tx = (t: Textos, k: string) => (t as Record<string, string>)[k] ?? k;

function Num({ valor, onChange, etiqueta, ayuda, unidad, max = 600, camara }: { valor: number | null; onChange: (v: number | null) => void; etiqueta: string; ayuda?: string; unidad?: string; max?: number; camara?: { texto: string; medido: boolean; textoMedido: string; abrir: () => void } }) {
  return (
    <label className="grid content-start gap-1 text-sm">
      <span>{etiqueta}{unidad ? <span className="text-suave"> ({unidad})</span> : null}{camara?.medido ? <span className="text-dorado"> · 📷 {camara.textoMedido}</span> : null}</span>
      <input
        className="campo num"
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={valor ?? ""}
        placeholder="0"
        onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Math.min(max, Math.floor(Number(e.target.value)))))}
      />
      {camara && <button type="button" onClick={(ev) => { ev.preventDefault(); camara.abrir(); }} className="justify-self-start text-xs text-lava underline">{camara.texto}</button>}
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
function Patron({ titulo, omitirTexto, omitir, setOmitir, intro, children }: { titulo: string; omitirTexto: string; omitir: boolean; setOmitir: (v: boolean) => void; intro?: string; children: React.ReactNode }) {
  return (
    <section className="tarjeta grid gap-3">
      <h2 className="text-xl text-lava">{titulo}</h2>
      {intro && <p className="text-sm text-suave">{intro}</p>}
      <Si valor={omitir} onChange={setOmitir} texto={omitirTexto} />
      {!omitir && <div className="grid gap-3 sm:grid-cols-2">{children}</div>}
    </section>
  );
}

/** Texto de un aviso del cálculo, con los nombres de patrón traducidos. */
function textoAviso(t: Textos, a: Aviso) {
  const v = { ...(a.v ?? {}) };
  if (typeof v.lista === "string") v.lista = v.lista.split(",").map((c) => tx(t, `niv.p.${c}`)).join(", ");
  return rellenar(tx(t, a.k), v);
}

export default function Nivelador({ conSesion }: { conSesion: boolean }) {
  const { t } = useTextos();
  const [e, setE] = useState<Entradas>(ENTRADAS_VACIAS);
  const [cargado, setCargado] = useState(false);
  const [calculado, setCalculado] = useState<ReturnType<typeof calcular> | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pendiente, empezar] = useTransition();
  const [cam, setCam] = useState<{ campo: string; titulo: string } | null>(null);

  useEffect(() => {
    try {
      const g = localStorage.getItem(CLAVE) ?? localStorage.getItem("unibars.nivelador.v1");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (g) setE(completar(JSON.parse(g)));
    } catch {}
    setCargado(true);
  }, []);
  useEffect(() => {
    if (!cargado) return;
    try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch {}
  }, [e, cargado]);

  const set = <K extends keyof Entradas>(k: K, v: Entradas[K]) => {
    setE((p) => ({ ...p, [k]: v }));
    setCalculado(null);
    setMensaje(null);
  };
  const sub = <K extends ClavePatron>(k: K, cambios: Partial<Entradas[K]>) => {
    // Si se escribe a mano, ese campo deja de contar como medido con cámara.
    const tocados = Object.keys(cambios).map((c) => `${k}.${c}`);
    setE((p) => ({ ...p, [k]: { ...p[k], ...cambios }, camara: (p.camara ?? []).filter((c) => !tocados.includes(c)) }));
    setCalculado(null);
    setMensaje(null);
  };
  /** Botón de cámara para un campo medible. */
  const camaraDe = (campo: string, titulo: string) => CAMARA[campo] ? {
    texto: t["cam.medir"], textoMedido: t["cam.medido"], medido: (e.camara ?? []).includes(campo), abrir: () => setCam({ campo, titulo }),
  } : undefined;
  function usarCamara(valor: number) {
    if (!cam) return;
    const [k, c] = cam.campo.split(".") as [ClavePatron, string];
    setE((p) => ({ ...p, [k]: { ...p[k], [c]: valor }, camara: [...new Set([...(p.camara ?? []), cam.campo])] }));
    setCalculado(null);
    setCam(null);
  }
  const impacto = sinImpacto(e);

  function calcularAhora() {
    setMensaje(null);
    const r = calcular(e);
    setCalculado(r);
    if (r.ok) setTimeout(() => document.getElementById("resultado")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function guardar() {
    empezar(async () => {
      const r = await guardarNivelacion(e);
      setMensaje(r.ok ? { tipo: "ok", texto: rellenar(t["niv.guardado"], { nivel: nivelDe(r.nivel)?.nombre ?? r.nivel }) } : { tipo: "error", texto: r.error });
    });
  }

  const r = calculado?.ok ? calculado.r : null;
  const nv = r ? nivelDe(r.nivel) : null;
  const reps = t["niv.reps"], seg = t["niv.seg"];

  return (
    <div className="grid gap-5">
      <section className="tarjeta grid gap-3">
        <h2 className="text-xl text-lava">{t["niv.salud"]}</h2>
        <p className="text-sm text-suave">{t["niv.saludD"]}</p>
        {Array.from({ length: N_PARQ }, (_, i) => (
          <fieldset key={i} className="grid gap-1">
            <legend className="text-sm">{i + 1}. {tx(t, `niv.parq.${i}`)}</legend>
            <div className="flex gap-4 text-sm">
              {[true, false].map((v) => (
                <label key={String(v)} className="flex items-center gap-1">
                  <input type="radio" name={`parq${i}`} checked={e.parq[i] === v} onChange={() => set("parq", e.parq.map((x, j) => (j === i ? v : x)))} className="accent-[var(--lava)]" />
                  {v ? t["niv.si"] : t["niv.no"]}
                </label>
              ))}
            </div>
            {i === 5 && e.parq[5] === true && (
              <input className="campo" maxLength={120} placeholder={t["niv.zona"]} value={e.parqZona} onChange={(ev) => set("parqZona", ev.target.value)} />
            )}
          </fieldset>
        ))}
      </section>

      <section className="tarjeta grid gap-3">
        <h2 className="text-xl text-lava">{t["niv.contexto"]}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            {t["niv.edad"]}
            <select className="campo" value={e.edad} onChange={(ev) => set("edad", ev.target.value)}>
              <option value="">{t["niv.noDecir"]}</option>
              {["18-29", "30-39", "40-49", "50-59", "60+"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            {t["niv.ultimo"]}
            <select className="campo" value={e.ultimoEntreno} onChange={(ev) => set("ultimoEntreno", ev.target.value as Entradas["ultimoEntreno"])}>
              <option value="">{t["niv.elige"]}</option>
              {(["semana", "mes", "seis_meses", "mas_seis", "nunca"] as const).map((u) => <option key={u} value={u}>{tx(t, `niv.u.${u}`)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            {t["niv.activo"]}
            <select className="campo" value={e.activo === null ? "" : e.activo ? "si" : "no"} onChange={(ev) => set("activo", ev.target.value === "" ? null : ev.target.value === "si")}>
              <option value="">{t["niv.elige"]}</option>
              <option value="si">{t["niv.si"]}</option>
              <option value="no">{t["niv.no"]}</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            {t["niv.percibido"]}
            <select className="campo" value={e.percibido} onChange={(ev) => set("percibido", ev.target.value as Entradas["percibido"])}>
              <option value="">{t["niv.noSe"]}</option>
              {NIVELES.map((n) => <option key={n.clave} value={n.clave}>{n.nombre}</option>)}
            </select>
          </label>
        </div>
      </section>

      <p className="text-sm text-suave">{t["niv.marcasIntro"]}</p>
      {impacto && <p className="aviso-error">{t["niv.impactoAviso"]}</p>}

      <Patron titulo={t["niv.p.piernas"]} omitirTexto={t["niv.omitir"]} omitir={e.piernas.omitir} setOmitir={(v) => sub("piernas", { omitir: v })}>
        <Num etiqueta={t["niv.sentadillas"]} camara={camaraDe("piernas.reps", t["niv.sentadillas"])} unidad={reps} valor={e.piernas.reps} onChange={(v) => sub("piernas", { reps: v })} />
        {!impacto && <Num etiqueta={t["niv.silla"]} camara={camaraDe("piernas.silla", t["niv.silla"])} unidad={seg} max={360} valor={e.piernas.silla} onChange={(v) => sub("piernas", { silla: v })} ayuda={t["niv.sillaAyuda"]} />}
        <Num etiqueta={t["niv.pistol"]} camara={camaraDe("piernas.pistolLibre", t["niv.pistol"])} unidad={reps} valor={e.piernas.pistolLibre} onChange={(v) => sub("piernas", { pistolLibre: v })} ayuda={t["niv.pistolAyuda"]} />
        <div className="grid gap-2">
          <Si valor={e.piernas.completa} onChange={(v) => sub("piernas", { completa: v })} texto={t["niv.completa"]} />
          <Si valor={e.piernas.pistolAsistido} onChange={(v) => sub("piernas", { pistolAsistido: v })} texto={t["niv.pistolAsistido"]} />
        </div>
      </Patron>

      <Patron titulo={t["niv.p.empuje"]} omitirTexto={t["niv.omitir"]} omitir={e.empuje.omitir} setOmitir={(v) => sub("empuje", { omitir: v })}>
        <Num etiqueta={t["niv.pared"]} camara={camaraDe("empuje.pared", t["niv.pared"])} unidad={reps} valor={e.empuje.pared} onChange={(v) => sub("empuje", { pared: v })} />
        <Num etiqueta={t["niv.banco"]} camara={camaraDe("empuje.banco", t["niv.banco"])} unidad={reps} valor={e.empuje.banco} onChange={(v) => sub("empuje", { banco: v })} />
        <Num etiqueta={t["niv.rodillas"]} unidad={reps} valor={e.empuje.rodillas} onChange={(v) => sub("empuje", { rodillas: v })} />
        <Num etiqueta={t["niv.piso"]} camara={camaraDe("empuje.piso", t["niv.piso"])} unidad={reps} valor={e.empuje.piso} onChange={(v) => sub("empuje", { piso: v })} />
        <Num etiqueta={t["niv.fondos"]} camara={camaraDe("empuje.fondos", t["niv.fondos"])} unidad={reps} valor={e.empuje.fondos} onChange={(v) => sub("empuje", { fondos: v })} />
        <div className="grid gap-2">
          <Si valor={e.empuje.pino} onChange={(v) => sub("empuje", { pino: v })} texto={t["niv.pino"]} />
          <Si valor={e.empuje.pseudo} onChange={(v) => sub("empuje", { pseudo: v })} texto={t["niv.pseudo"]} />
        </div>
      </Patron>

      <Patron titulo={t["niv.p.core"]} omitirTexto={t["niv.omitir"]} omitir={e.core.omitir} setOmitir={(v) => sub("core", { omitir: v })}>
        <Num etiqueta={t["niv.plancha"]} camara={camaraDe("core.plancha", t["niv.plancha"])} unidad={seg} valor={e.core.plancha} onChange={(v) => sub("core", { plancha: v })} />
        <Num etiqueta={t["niv.hollow"]} camara={camaraDe("core.hollow", t["niv.hollow"])} unidad={seg} valor={e.core.hollow} onChange={(v) => sub("core", { hollow: v })} />
        <Num etiqueta={t["niv.lsit"]} unidad={seg} valor={e.core.lsit} onChange={(v) => sub("core", { lsit: v })} />
      </Patron>

      <Patron titulo={t["niv.p.traccion"]} omitirTexto={t["niv.sinBarra"]} omitir={e.traccion.omitir} setOmitir={(v) => sub("traccion", { omitir: v })}>
        <Num etiqueta={t["niv.colgado"]} camara={camaraDe("traccion.colgado", t["niv.colgado"])} unidad={seg} valor={e.traccion.colgado} onChange={(v) => sub("traccion", { colgado: v })} />
        <Num etiqueta={t["niv.estatica"]} camara={camaraDe("traccion.estatica", t["niv.estatica"])} unidad={seg} valor={e.traccion.estatica} onChange={(v) => sub("traccion", { estatica: v })} />
        <Num etiqueta={t["niv.dominadas"]} camara={camaraDe("traccion.dominadas", t["niv.dominadas"])} unidad={reps} valor={e.traccion.dominadas} onChange={(v) => sub("traccion", { dominadas: v })} />
        <div className="grid gap-2">
          <Si valor={e.traccion.muscleUp} onChange={(v) => sub("traccion", { muscleUp: v })} texto={t["niv.muscleUp"]} />
          <Si valor={e.traccion.frontLever} onChange={(v) => sub("traccion", { frontLever: v })} texto={t["niv.frontLever"]} />
        </div>
      </Patron>

      {!impacto && (
        <Patron titulo={t["niv.p.resistencia"]} intro={t["niv.burpeesIntro"]} omitirTexto={t["niv.omitirRes"]} omitir={e.resistencia.omitir} setOmitir={(v) => sub("resistencia", { omitir: v })}>
          <Num etiqueta={t["niv.medios"]} camara={camaraDe("resistencia.medios", t["niv.medios"])} unidad={reps} max={120} valor={e.resistencia.medios} onChange={(v) => sub("resistencia", { medios: v })} />
          <Num etiqueta={t["niv.conFlexion"]} camara={camaraDe("resistencia.conFlexion", t["niv.conFlexion"])} unidad={reps} max={120} valor={e.resistencia.conFlexion} onChange={(v) => sub("resistencia", { conFlexion: v })} />
          <div className="sm:col-span-2">
            <Si valor={e.resistencia.pechoSalto} onChange={(v) => sub("resistencia", { pechoSalto: v })} texto={t["niv.pechoSalto"]} />
          </div>
        </Patron>
      )}

      {cam && CAMARA[cam.campo] && (
        <CamaraPrueba
          ejercicio={CAMARA[cam.campo].ejercicio}
          sostenido={CAMARA[cam.campo].sostenido}
          duracion={CAMARA[cam.campo].duracion}
          titulo={cam.titulo}
          conSesion={conSesion}
          onUsar={usarCamara}
          onCerrar={() => setCam(null)}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-lava" onClick={calcularAhora}>{t["niv.calcular"]}</button>
        <button type="button" className="btn btn-borde" onClick={() => { setE(ENTRADAS_VACIAS); setCalculado(null); try { localStorage.removeItem(CLAVE); } catch {} }}>{t["niv.borrar"]}</button>
      </div>
      {calculado && !calculado.ok && <p className="aviso-error" role="alert">{tx(t, calculado.error)}</p>}

      {r && nv && (
        <section id="resultado" className="tarjeta grid gap-4 !border-2" style={{ borderColor: nv.color }} aria-live="polite">
          <div>
            <p className="text-sm text-suave">{t["niv.tuNivel"]}</p>
            <p className="titulo text-4xl" style={{ color: nv.color }}>{nv.nombre}{r.subnivel ? ` ${r.subnivel}` : ""}</p>
            <p className="text-suave">{t[`entrenar.etapa.${nv.clave}` as ClaveTexto]}</p>
          </div>
          <ul className="grid gap-2" aria-label={t["niv.porPatron"]}>
            {r.patrones.map((p) => {
              const pn = p.idx === null ? null : NIVELES[p.idx];
              return (
                <li key={p.clave} className="grid gap-1">
                  <div className="flex justify-between text-sm">
                    <span>{tx(t, `niv.p.${p.clave}`)}{r.atrasados.includes(p.clave) ? ` · ${t["niv.atrasado"]}` : ""}</span>
                    <span style={{ color: pn?.color }}>{pn ? pn.nombre : t["niv.sinMedir"]}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg">
                    <div className="h-full rounded-full" style={{ width: p.idx === null ? 0 : `${((p.idx + 1) / 5) * 100}%`, background: pn?.color }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="rounded-lg border border-borde p-3">
            <p className="text-sm text-suave">{t["niv.partida"]}</p>
            <p className="text-lg font-bold">{tx(t, `niv.d.${r.destino}.e`)}</p>
            <p className="text-sm text-suave">{tx(t, `niv.d.${r.destino}.d`)}</p>
          </div>
          {r.avisos.map((a, i) => <p key={i} className="aviso-ok">{textoAviso(t, a)}</p>)}
          {(e.camara ?? []).length > 0 && <p className="text-sm text-dorado">📷 {rellenar(t["cam.resumen"], { n: (e.camara ?? []).length })}</p>}
          <p className="text-xs text-suave">{t["niv.declarado"]}</p>

          {conSesion ? (
            <button type="button" className="btn btn-lava justify-self-start" onClick={guardar} disabled={pendiente}>
              {pendiente ? t["niv.guardando"] : t["niv.guardar"]}
            </button>
          ) : (
            <Link href="/entrar?siguiente=/nivelador" className="btn btn-lava justify-self-start">{t["niv.entrarGuardar"]}</Link>
          )}
          {mensaje && <p className={mensaje.tipo === "ok" ? "aviso-ok" : "aviso-error"} role="status">{mensaje.texto}</p>}
        </section>
      )}
    </div>
  );
}
