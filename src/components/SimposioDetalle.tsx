"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTextos } from "@/components/Idioma";
import { rellenar } from "@/lib/i18n/diccionarios";
import { nivelDe } from "@/lib/catalogos";
import { crearCliente } from "@/lib/supabase/client";
import { esYoutube } from "@/lib/youtube";
import VideoYoutube from "@/components/VideoYoutube";

type Resp = { id: string; texto: string; video_url: string | null; util: boolean; estrellas: number | null; comentario: string | null; creado_en: string; mia: boolean; pagina: string; slug: string; tipo: string; ayudo: number };
type Preg = { id: string; categoria: string; titulo: string; texto: string; video_url: string | null; nivel: string | null; prioridad: boolean; estado: string; autor: string | null; mia: boolean; mi_pagina: string | null; ya_respondi: boolean; respuestas: Resp[]; creado_en: string };

function Reportar({ tipo, id }: { tipo: string; id: string }) {
  const { t } = useTextos();
  const [abre, setAbre] = useState(false);
  const [m, setM] = useState("");
  const [ok, setOk] = useState("");
  if (ok) return <p className="text-xs text-suave">{ok}</p>;
  return (
    <span className="grid gap-1">
      <button type="button" className="justify-self-start text-xs text-suave underline" onClick={() => setAbre(!abre)}>{t["sim.reportar"]}</button>
      {abre && (
        <span className="flex flex-wrap gap-2">
          <input className="campo max-w-xs" maxLength={300} placeholder={t["sim.motivo"]} value={m} onChange={(e) => setM(e.target.value)} />
          <button type="button" className="btn btn-borde !py-1" disabled={m.trim().length < 3} onClick={async () => {
            const { error } = await crearCliente().rpc("reportar", { p_tipo: tipo, p_id: id, p_motivo: m });
            setOk(error ? error.message : t["sim.reportado"]);
          }}>{t["sim.reportar"]}</button>
        </span>
      )}
    </span>
  );
}

function Valorar({ r, alCambiar }: { r: Resp; alCambiar: () => void }) {
  const { t } = useTextos();
  const [est, setEst] = useState(r.estrellas ?? 0);
  const [com, setCom] = useState(r.comentario ?? "");
  async function guardar(util: boolean | null) {
    await crearCliente().rpc("simposio_valorar", { p_respuesta: r.id, p_util: util, p_estrellas: est || null, p_comentario: com });
    alCambiar();
  }
  return (
    <div className="grid gap-2 rounded-lg border border-white/10 p-2">
      {!r.util && <button className="btn btn-lava !py-1 justify-self-start" onClick={() => guardar(true)}>👍 {t["sim.util"]}</button>}
      <div className="flex items-center gap-1 text-sm" aria-label={t["sim.estrellas"]}>
        <span className="mr-1 text-suave">{t["sim.estrellas"]}:</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n}`} className={`text-xl ${n <= est ? "text-dorado" : "text-suave"}`} onClick={() => setEst(n)}>★</button>
        ))}
      </div>
      <input className="campo" maxLength={500} placeholder={t["sim.gracias"]} value={com} onChange={(e) => setCom(e.target.value)} />
      <button className="btn btn-borde !py-1 justify-self-start" onClick={() => guardar(null)}>{t["sim.guardarVal"]}</button>
    </div>
  );
}

export default function SimposioDetalle({ id, nombrePagina }: { id: string; nombrePagina: string | null }) {
  const { t, idioma } = useTextos();
  const tt = t as Record<string, string>;
  const [p, setP] = useState<Preg | null>(null);
  const [error, setError] = useState(false);
  const [txt, setTxt] = useState("");
  const [vid, setVid] = useState("");
  const [err, setErr] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error } = await crearCliente().rpc("simposio_ver", { p_id: id });
    if (error) setError(true); else setP(data as Preg);
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  async function responder(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!esYoutube(vid)) return setErr(t["sim.err.video"]);
    setEnviando(true);
    const { error } = await crearCliente().rpc("simposio_responder", { p_pregunta: id, p_texto: txt, p_video: vid });
    setEnviando(false);
    if (error) return setErr(tt[`sim.err.${error.message}`] ?? t["sim.err"]);
    setTxt(""); setVid(""); cargar();
  }

  if (error) return <p className="text-suave">{t["sim.vacio"]}</p>;
  if (!p) return null;
  const abierta = p.estado === "abierta";
  return (
    <div className="grid gap-5">
      <Link href="/panel/simposio" className="text-sm underline">{t["sim.volver"]}</Link>
      <article className="tarjeta grid gap-3">
        <p className="flex flex-wrap gap-2 text-xs">
          <span className="text-dorado">{tt[`sim.c.${p.categoria}`]}</span>
          <span className="text-suave">· {tt[`sim.e.${p.estado}`]}</span>
          {p.prioridad && <span className="rounded-full border border-dorado px-2 text-dorado">★ {t["sim.prioridad"]}</span>}
        </p>
        <h1 className="text-2xl">{p.titulo}</h1>
        <p className="text-xs text-suave">{p.autor ? `@${p.autor}` : t["sim.anonimo"]}{p.nivel ? ` · ${(nivelDe(p.nivel)?.nombre ?? p.nivel)}` : ""} · {new Date(p.creado_en).toLocaleDateString(idioma)}</p>
        <p className="whitespace-pre-line">{p.texto}</p>
        <VideoYoutube url={p.video_url} titulo={p.titulo} />
        {p.categoria === "molestia" && <p className="aviso-error text-sm">{t["sim.avisoSalud"]}</p>}
        <div className="flex flex-wrap items-center gap-3">
          {p.mia && abierta && <button className="btn btn-borde !py-1" onClick={async () => { await crearCliente().rpc("simposio_cerrar", { p_id: p.id }); cargar(); }}>{t["sim.cerrar"]}</button>}
          {!p.mia && <Reportar tipo="pregunta" id={p.id} />}
        </div>
      </article>

      <section className="grid gap-3">
        <h2 className="text-xl">{rellenar(t["sim.respuestas"], { n: p.respuestas.length })}</h2>
        {p.respuestas.length === 0 && <p className="text-suave">{t["sim.sinResp"]}</p>}
        {p.respuestas.map((r) => (
          <article key={r.id} className={`tarjeta grid gap-2 ${r.util ? "border-dorado" : ""}`}>
            <p className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/e/${r.slug}`} className="font-semibold underline">{r.pagina}</Link>
              <span className="text-xs text-suave">{rellenar(t["sim.ayudo"], { n: r.ayudo })}</span>
            </p>
            {r.util && <p className="text-sm text-dorado">{t["sim.marcadaUtil"]}{r.estrellas ? ` · ${"★".repeat(r.estrellas)}` : ""}</p>}
            <p className="whitespace-pre-line">{r.texto}</p>
            <VideoYoutube url={r.video_url} titulo={r.pagina} />
            {r.comentario && <p className="text-sm italic text-suave">“{r.comentario}”</p>}
            {p.mia && <Valorar r={r} alCambiar={cargar} />}
            {p.mia && <Link href={`/e/${r.slug}`} className="btn btn-borde !py-1 justify-self-start">{t["sim.entrenarCon"]}</Link>}
            {!r.mia && !p.mia && <Reportar tipo="respuesta" id={r.id} />}
          </article>
        ))}
      </section>

      {!p.mia && abierta && (
        p.mi_pagina && nombrePagina ? (
          p.ya_respondi ? <p className="text-suave">{t["sim.yaRespondiste"]}</p> : (
            <form onSubmit={responder} className="tarjeta grid gap-3">
              <h2 className="text-xl">{t["sim.responder"]}</h2>
              <p className="text-xs text-suave">{rellenar(t["sim.responderComo"], { n: nombrePagina })}</p>
              <textarea className="campo" required minLength={10} maxLength={3000} rows={6} value={txt} onChange={(e) => setTxt(e.target.value)} />
              <label className="grid gap-1 text-sm">{t["sim.videoResp"]}<input className="campo" type="url" placeholder="https://youtu.be/…" value={vid} onChange={(e) => setVid(e.target.value)} /></label>
              {err && <p className="aviso-error" role="alert">{err}</p>}
              <button className="btn btn-lava justify-self-start" disabled={enviando}>{t["sim.enviarResp"]}</button>
            </form>
          )
        ) : <p className="text-xs text-suave">{t["sim.soloPro"]}</p>
      )}
    </div>
  );
}
