"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTextos } from "@/components/Idioma";
import { crearCliente } from "@/lib/supabase/client";
import CamaraPrueba from "@/components/CamaraPrueba";
import InsigniaVerif from "@/components/InsigniaVerif";
import { CAMARA } from "@/lib/nivelador";
import { PATRONES, REGEX_YOUTUBE, formatoValor, type Habilidad, type MarcaDiario, type Visibilidad } from "@/lib/habilidades";
import { mensajeError } from "@/lib/social";

const ICONO_VISIB: Record<Visibilidad, string> = { privado: "🔒", amigos: "👥", comunidad: "🌐" };

export default function Diario({ usuarioId, habilidades, marcas, preseleccion }: { usuarioId: string; habilidades: Habilidad[]; marcas: MarcaDiario[]; preseleccion?: string }) {
  const router = useRouter();
  const { t, idioma } = useTextos();
  const tx = (k: string) => (t as Record<string, string>)[k] ?? k;
  const LOCALE = { es: "es-AR", en: "en-US", pt: "pt-BR" }[idioma];
  const hoy = new Date().toLocaleDateString("en-CA");

  const [hab, setHab] = useState(preseleccion && habilidades.some((h) => h.clave === preseleccion) ? preseleccion : habilidades[0]?.clave ?? "");
  const [libre, setLibre] = useState("");
  const [unidadLibre, setUnidadLibre] = useState("reps");
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [nota, setNota] = useState("");
  const [video, setVideo] = useState("");
  const [visib, setVisib] = useState<Visibilidad>("amigos");
  const [metodo, setMetodo] = useState<"declarado" | "camara">("declarado");
  const [camara, setCamara] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [verHab, setVerHab] = useState("");

  const h = habilidades.find((x) => x.clave === hab) ?? null;
  const esLibre = hab === "__libre";
  const unidad = esLibre ? unidadLibre : h?.unidad ?? "reps";
  const cam = h?.campo_camara ? CAMARA[h.campo_camara] : null;
  const nombreDe = (m: { habilidad: string | null; ejercicio: string }) => (m.habilidad ? tx(`hab.${m.habilidad}`) : m.ejercicio);

  async function guardar(ev: React.FormEvent) {
    ev.preventDefault();
    setMsg(null);
    const v = parseFloat(valor);
    if (!esLibre && !h) return setMsg(t["dia.err.nombre"]);
    if (esLibre && libre.trim().length < 2) return setMsg(t["dia.err.nombre"]);
    if (!(v > 0)) return setMsg(t["dia.err.valor"]);
    const url = video.trim();
    if (url && !REGEX_YOUTUBE.test(url)) return setMsg(t["dia.err.video"]);
    if (visib === "comunidad" && !url) return setMsg(t["dia.err.videoCom"]);
    setCargando(true);
    const { error } = await crearCliente().from("marcas").insert({
      usuario_id: usuarioId,
      ejercicio: esLibre ? libre.trim() : tx(`hab.${hab}`),
      habilidad: esLibre ? null : hab,
      valor: v,
      unidad,
      fecha,
      nota: nota.trim() || null,
      video_url: url || null,
      metodo,
      visibilidad: visib,
    });
    setCargando(false);
    if (error) return setMsg(/máximo|futura/i.test(error.message) ? mensajeError(error) : t["dia.err.guardar"]);
    setValor(""); setNota(""); setVideo(""); setMetodo("declarado");
    router.refresh();
  }

  async function borrar(id: string) {
    await crearCliente().from("marcas").delete().eq("id", id);
    setConfirmar(null);
    router.refresh();
  }

  // Gráfico: habilidades con al menos 2 marcas
  const series = useMemo(() => {
    const m = new Map<string, MarcaDiario[]>();
    for (const x of marcas) {
      const k = x.habilidad ?? `~${x.ejercicio.toLowerCase().trim()}`;
      m.set(k, [...(m.get(k) ?? []), x]);
    }
    return [...m.entries()].filter(([, v]) => v.length >= 2).map(([k, v]) => ({ k, v: [...v].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.creado_en.localeCompare(b.creado_en)) }));
  }, [marcas]);
  const serie = series.find((s) => s.k === verHab) ?? series[0] ?? null;

  return (
    <section id="diario" className="grid gap-4 scroll-mt-20" aria-label={t["dia.titulo"]}>
      <div>
        <h2 className="text-2xl">{t["dia.titulo"]}</h2>
        <p className="text-sm text-suave">{t["dia.intro"]}</p>
      </div>

      <form onSubmit={guardar} className="tarjeta grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            {t["dia.habilidad"]}
            <select className="campo" value={hab} onChange={(e) => { setHab(e.target.value); setMetodo("declarado"); }}>
              {PATRONES.map((p) => (
                <optgroup key={p} label={t[`arb.pat.${p}` as "arb.pat.core"]}>
                  {habilidades.filter((x) => x.patron === p).map((x) => <option key={x.clave} value={x.clave}>{tx(`hab.${x.clave}`)}</option>)}
                </optgroup>
              ))}
              <option value="__libre">{t["dia.otra"]}</option>
            </select>
          </label>
          {esLibre ? (
            <label className="grid gap-1 text-sm">
              {t["dia.ejercicio"]}
              <input className="campo" value={libre} maxLength={60} onChange={(e) => setLibre(e.target.value)} />
            </label>
          ) : (
            <p className="self-end text-sm text-suave">{unidad === "seg" ? t["ent2.seg"] : t["ent2.reps"]}{h?.ventana ? ` · ${t["arb.en60"]}` : ""}</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <label className="grid gap-1 text-sm">
            {t["dia.valor"]}
            <input className="campo" type="number" inputMode="decimal" step="0.5" min="0" value={valor} onChange={(e) => { setValor(e.target.value); setMetodo("declarado"); }} />
          </label>
          {esLibre && (
            <label className="grid gap-1 text-sm">
              {t["dia.unidad"]}
              <select className="campo" value={unidadLibre} onChange={(e) => setUnidadLibre(e.target.value)}>
                <option value="reps">{t["ent2.reps"]}</option>
                <option value="seg">{t["ent2.seg"]}</option>
                <option value="kg">{t["ent2.kg"]}</option>
              </select>
            </label>
          )}
          <label className="grid gap-1 text-sm sm:col-start-3">
            {t["dia.fecha"]}
            <input className="campo" type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} />
          </label>
        </div>

        {cam && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-borde" onClick={() => setCamara(true)}>📷 {t["dia.camara"]}</button>
            {metodo === "camara" && <span className="text-sm text-ok">✓ {t["dia.camaraOk"]}</span>}
          </div>
        )}

        <label className="grid gap-1 text-sm">
          {t["dia.nota"]}
          <input className="campo" value={nota} maxLength={200} onChange={(e) => setNota(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          {t["dia.video"]}
          <input className="campo" type="url" inputMode="url" placeholder="https://youtu.be/…" value={video} maxLength={300} onChange={(e) => setVideo(e.target.value)} />
          <span className="text-xs text-suave">{t["dia.videoAyuda"]}</span>
        </label>
        <fieldset className="grid gap-1 text-sm">
          <legend className="mb-1">{t["dia.visib"]}</legend>
          {(["privado", "amigos", "comunidad"] as Visibilidad[]).map((o) => (
            <label key={o} className="flex items-center gap-2">
              <input type="radio" name="visib" checked={visib === o} onChange={() => setVisib(o)} />
              <span>{ICONO_VISIB[o]} {t[`dia.v.${o}` as "dia.v.amigos"]}</span>
            </label>
          ))}
        </fieldset>

        {msg && <p className="text-sm text-lava" role="alert">{msg}</p>}
        <button className="btn btn-lava justify-self-start" disabled={cargando}>{t["dia.guardar"]}</button>
      </form>

      {camara && cam && h && (
        <CamaraPrueba
          ejercicio={cam.ejercicio}
          titulo={tx(`hab.${h.clave}`)}
          sostenido={cam.sostenido}
          duracion={cam.duracion}
          conSesion
          onUsar={(n) => { setValor(String(n)); setMetodo("camara"); setCamara(false); }}
          onCerrar={() => setCamara(false)}
        />
      )}

      {serie ? (
        <div className="tarjeta grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg">{t["gra.titulo"]}</h3>
            <select className="campo w-auto" aria-label={t["gra.elige"]} value={serie.k} onChange={(e) => setVerHab(e.target.value)}>
              {series.map((s) => <option key={s.k} value={s.k}>{nombreDe(s.v[0])}</option>)}
            </select>
          </div>
          <Grafico puntos={serie.v.map((m) => ({ x: m.fecha, y: m.valor }))} unidad={serie.v[0].unidad} locale={LOCALE} />
        </div>
      ) : (
        marcas.length > 0 && <p className="text-sm text-suave">{t["gra.vacio"]}</p>
      )}

      {marcas.length === 0 ? (
        <p className="tarjeta text-suave">{t["dia.vacio"]}</p>
      ) : (
        <ul className="grid gap-2">
          {marcas.map((m) => (
            <li key={m.id} className="tarjeta grid gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p>
                  <strong>{nombreDe(m)}</strong>{" "}
                  <span className="titulo text-xl text-dorado">{formatoValor(m.valor, m.unidad)}</span>{" "}
                  <span className="text-sm text-suave">{m.unidad === "seg" ? "s" : m.unidad === "kg" ? "kg" : "reps"}</span>
                </p>
                <p className="text-xs text-suave">{new Date(m.fecha + "T12:00:00").toLocaleDateString(LOCALE, { dateStyle: "medium" })} · <span title={t[`dia.v.${m.visibilidad}` as "dia.v.amigos"]}>{ICONO_VISIB[m.visibilidad]}</span></p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <InsigniaVerif v={m.verif} />
                {m.metodo === "camara" && <span className="rounded-full border border-borde px-2 py-0.5 text-xs">📷 {t["dia.camaraOk"]}</span>}
                {m.video_url && <a href={m.video_url} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-lava underline">{t["dia.verVideo"]}</a>}
              </div>
              {m.nota && <p className="text-sm text-suave">{m.nota}</p>}
              {m.verificadores.length > 0 && (
                <p className="text-xs text-suave">
                  {m.verificadores.filter((x) => x.valida).length > 0 && <>{t["dia.verificaron"]}: {m.verificadores.filter((x) => x.valida).map((x) => `@${x.alias}`).join(", ")}. </>}
                  {m.verificadores.filter((x) => !x.valida).length > 0 && <>{t["dia.dudaron"]}: {m.verificadores.filter((x) => !x.valida).map((x) => `@${x.alias}`).join(", ")}.</>}
                </p>
              )}
              <div className="text-right">
                {confirmar === m.id ? (
                  <span className="text-sm">
                    {t["dia.confirmarBorrar"]}{" "}
                    <button type="button" onClick={() => borrar(m.id)} className="text-lava underline">{t["dia.borrar"]}</button>{" · "}
                    <button type="button" onClick={() => setConfirmar(null)} className="text-suave underline">{t["comun.cerrar"]}</button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirmar(m.id)} className="text-sm text-suave hover:text-lava" aria-label={`${t["dia.borrar"]} ${nombreDe(m)}`}>✕ {t["dia.borrar"]}</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Grafico({ puntos, unidad, locale }: { puntos: { x: string; y: number }[]; unidad: string; locale: string }) {
  const W = 320, H = 130, P = 26;
  const ys = puntos.map((p) => p.y);
  const min = Math.min(...ys), max = Math.max(...ys);
  const rango = max - min || 1;
  const px = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, puntos.length - 1);
  const py = (y: number) => H - P - ((y - min) / rango) * (H - 2 * P);
  const d = puntos.map((p, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(p.y).toFixed(1)}`).join(" ");
  const fecha = (s: string) => new Date(s + "T12:00:00").toLocaleDateString(locale, { day: "numeric", month: "short" });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-lava" role="img" aria-label={`${formatoValor(min, unidad)} → ${formatoValor(max, unidad)}`}>
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="var(--borde)" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {puntos.map((p, i) => <circle key={i} cx={px(i)} cy={py(p.y)} r="3" fill="currentColor" />)}
      <text x={P} y={12} fontSize="10" fill="var(--suave)">{formatoValor(max, unidad)}</text>
      <text x={P} y={H - 4} fontSize="10" fill="var(--suave)">{fecha(puntos[0].x)}</text>
      <text x={W - P} y={H - 4} fontSize="10" textAnchor="end" fill="var(--suave)">{fecha(puntos[puntos.length - 1].x)}</text>
    </svg>
  );
}
