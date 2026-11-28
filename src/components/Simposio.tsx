"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTextos } from "@/components/Idioma";
import { rellenar } from "@/lib/i18n/diccionarios";
import { nivelDe } from "@/lib/catalogos";
import { crearCliente } from "@/lib/supabase/client";
import { esYoutube } from "@/lib/youtube";

type Fila = { id: string; categoria: string; titulo: string; autor: string | null; nivel: string | null; prioridad: boolean; estado: string; respuestas: number; video: boolean; mia: boolean; creado_en: string };
export const CATEGORIAS = ["tecnica", "progresion", "planificacion", "movilidad", "molestia", "otro"];
const FILTROS = ["todas", "sin_respuesta", "resueltas", "mias", "respondi"];

export default function Simposio({ puedeResponder }: { puedeResponder: boolean }) {
  const { t } = useTextos();
  const tt = t as Record<string, string>;
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cat, setCat] = useState("");
  const [filtro, setFiltro] = useState(puedeResponder ? "sin_respuesta" : "todas");
  const [q, setQ] = useState("");
  const [hayMas, setHayMas] = useState(false);
  const [listo, setListo] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState({ categoria: "tecnica", titulo: "", texto: "", video: "", anonima: false });
  const [err, setErr] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async (offset: number) => {
    const { data } = await crearCliente().rpc("simposio_listar", { p_categoria: cat, p_filtro: filtro, p_q: q, p_offset: offset });
    const l = (data ?? []) as Fila[];
    setFilas((p) => (offset === 0 ? l : [...p, ...l])); setHayMas(l.length === 20); setListo(true);
  }, [cat, filtro, q]);
  useEffect(() => { const id = setTimeout(() => cargar(0), 250); return () => clearTimeout(id); }, [cargar]);

  async function preguntar(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!esYoutube(f.video)) return setErr(t["sim.err.video"]);
    setEnviando(true);
    const { data, error } = await crearCliente().rpc("simposio_preguntar", { p_categoria: f.categoria, p_titulo: f.titulo, p_texto: f.texto, p_video: f.video, p_anonima: f.anonima });
    setEnviando(false);
    if (error) return setErr(tt[`sim.err.${error.message}`] ?? t["sim.err"]);
    router.push(`/panel/simposio/${data}`);
  }

  return (
    <div className="grid gap-5">
      <p className="text-suave">{t["sim.intro"]}</p>
      {!abierto && <button className="btn btn-lava justify-self-start" onClick={() => setAbierto(true)}>{t["sim.preguntar"]}</button>}
      {abierto && (
        <form onSubmit={preguntar} className="tarjeta grid gap-3">
          <label className="grid gap-1 text-sm">{t["sim.categoria"]}
            <select className="campo" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{tt[`sim.c.${c}`]}</option>)}
            </select>
          </label>
          {f.categoria === "molestia" && <p className="aviso-error text-sm">{t["sim.avisoSalud"]}</p>}
          <label className="grid gap-1 text-sm">{t["sim.tituloPreg"]}<input className="campo" required minLength={8} maxLength={140} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></label>
          <label className="grid gap-1 text-sm">{t["sim.texto"]}<textarea className="campo" required minLength={10} maxLength={2000} rows={5} value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} /></label>
          <label className="grid gap-1 text-sm">{t["sim.video"]}<input className="campo" type="url" placeholder="https://youtu.be/…" value={f.video} onChange={(e) => setF({ ...f, video: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.anonima} onChange={(e) => setF({ ...f, anonima: e.target.checked })} />{t["sim.anonima"]}</label>
          {err && <p className="aviso-error" role="alert">{err}</p>}
          <div className="flex gap-2"><button className="btn btn-lava" disabled={enviando}>{t["sim.enviar"]}</button><button type="button" className="btn btn-borde" onClick={() => setAbierto(false)}>✕</button></div>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTROS.filter((x) => x !== "respondi" || puedeResponder).map((x) => (
          <button key={x} className={`btn !px-3 !py-1 ${filtro === x ? "btn-lava" : "btn-borde"}`} onClick={() => setFiltro(x)}>{tt[`sim.f.${x}`]}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <input className="campo max-w-xs" placeholder={t["sim.buscar"]} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="campo max-w-[12rem]" value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t["sim.categoria"]}>
          <option value="">{t["sim.f.todas"]}</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{tt[`sim.c.${c}`]}</option>)}
        </select>
      </div>

      {listo && filas.length === 0 && <p className="text-suave">{t["sim.vacio"]}</p>}
      <ul className="grid gap-3">
        {filas.map((p) => (
          <li key={p.id}>
            <Link href={`/panel/simposio/${p.id}`} className="tarjeta grid gap-1 hover:border-lava">
              <span className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-dorado">{tt[`sim.c.${p.categoria}`]}</span>
                <span className="text-suave">· {tt[`sim.e.${p.estado}`]}</span>
                {p.prioridad && <span className="rounded-full border border-dorado px-2 text-dorado">★ {t["sim.prioridad"]}</span>}
                {p.video && <span>▶</span>}
              </span>
              <strong>{p.titulo}</strong>
              <span className="text-xs text-suave">
                {p.autor ? `@${p.autor}` : t["sim.anonimo"]}{p.nivel ? ` · ${(nivelDe(p.nivel)?.nombre ?? p.nivel)}` : ""} · {rellenar(t["sim.respuestas"], { n: p.respuestas })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {hayMas && <button className="btn btn-borde justify-self-center" onClick={() => cargar(filas.length)}>{t["sim.mas"]}</button>}
    </div>
  );
}
