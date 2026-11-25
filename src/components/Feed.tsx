"use client";

import { useState } from "react";
import Link from "next/link";
import { crearCliente } from "@/lib/supabase/client";
import { nivelDe } from "@/lib/catalogos";
import { MOTIVOS_REPORTE, hace, mensajeError, type ItemFeed } from "@/lib/social";
import Avatar from "@/components/Avatar";
import Zona from "@/components/Zona";

type Pestana = "amigos" | "zona" | "mios";
const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: "amigos", texto: "Amigos" },
  { id: "zona", texto: "Mi zona" },
  { id: "mios", texto: "Mis logros" },
];
const VACIO: Record<Pestana, string> = {
  amigos: "Aún no hay novedades de tus amigos. Agrega compañeros de barra en Comunidad o comparte tu primer logro.",
  zona: "",
  mios: "Tus logros aparecerán aquí: tu nivel, tus primeras marcas y tus récords.",
};

function hostDe(url: string) {
  try {
    const h = new URL(url).hostname.replace(/^(www|m)\./, "");
    return h.startsWith("youtu") ? "YouTube" : "Facebook";
  } catch {
    return "Enlace";
  }
}

export default function Feed({ inicial }: { inicial: ItemFeed[] }) {
  const [pestana, setPestana] = useState<Pestana>("amigos");
  const [items, setItems] = useState<ItemFeed[]>(inicial);
  const [cargando, setCargando] = useState(false);
  const [texto, setTexto] = useState("");
  const [enlace, setEnlace] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [reportando, setReportando] = useState<string | null>(null);

  async function cargar(p: Pestana) {
    if (p === "zona") return;
    setCargando(true);
    const { data, error } = await crearCliente().rpc("feed", { p_pestana: p });
    setCargando(false);
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    setItems((data ?? []) as ItemFeed[]);
  }
  function cambiar(p: Pestana) {
    setPestana(p);
    setMsg(null);
    setReportando(null);
    cargar(p);
  }

  async function publicar(ev: React.FormEvent) {
    ev.preventDefault();
    setMsg(null);
    setCargando(true);
    const { error } = await crearCliente().rpc("publicar", { p_texto: texto, p_enlace: enlace.trim() || null });
    setCargando(false);
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    setTexto("");
    setEnlace("");
    setPestana("amigos");
    await cargar("amigos");
  }

  async function reaccionar(it: ItemFeed) {
    const { data, error } = await crearCliente().rpc("reaccionar", { p_tipo: it.tipo, p_id: it.id });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    const r = data as { n: number; yo: boolean };
    setItems((prev) => prev.map((x) => (x.id === it.id && x.tipo === it.tipo ? { ...x, reacciones: r.n, yo_reaccione: r.yo } : x)));
  }

  async function borrar(it: ItemFeed) {
    const { error } = await crearCliente().rpc("borrar_publicacion", { p_id: it.id });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    setItems((prev) => prev.filter((x) => !(x.id === it.id && x.tipo === it.tipo)));
  }

  async function reportar(it: ItemFeed, motivo: string) {
    const { error } = await crearCliente().rpc("reportar", { p_tipo: it.tipo, p_id: it.id, p_motivo: motivo });
    setReportando(null);
    setMsg(error ? { ok: false, texto: mensajeError(error) } : { ok: true, texto: "Gracias. Revisaremos este contenido." });
  }

  return (
    <section className="grid gap-4" aria-label="Novedades">
      {pestana !== "zona" && (
      <form onSubmit={publicar} className="tarjeta grid gap-2">
        <label className="grid gap-1 text-sm">
          <span className="sr-only">Comparte con tus compañeros de barra</span>
          <textarea
            className="campo min-h-20"
            maxLength={500}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Comparte tu entrenamiento de hoy con tus compañeros de barra…"
          />
        </label>
        <input className="campo" type="url" value={enlace} onChange={(e) => setEnlace(e.target.value)} placeholder="Enlace de YouTube o Facebook (opcional)" aria-label="Enlace de YouTube o Facebook" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-suave">{texto.length}/500 · Tus amigos lo ven; nadie más.</span>
          <button className="btn btn-lava !py-1.5" disabled={cargando || texto.trim().length === 0}>Publicar</button>
        </div>
      </form>
      )}

      <div role="tablist" aria-label="Qué ver" className="flex gap-2">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => cambiar(p.id)}
            className={`rounded-full border px-3 py-1 text-sm ${pestana === p.id ? "border-lava text-lava" : "border-borde text-suave"}`}
          >
            {p.texto}
          </button>
        ))}
      </div>

      {msg && pestana !== "zona" && <p className={msg.ok ? "aviso-ok" : "aviso-error"} role="status">{msg.texto}</p>}

      {pestana === "zona" ? (
        <Zona />
      ) : items.length === 0 && !cargando ? (
        <p className="tarjeta text-suave">{VACIO[pestana]}</p>
      ) : (
        <ul className="grid gap-3" aria-busy={cargando}>
          {items.map((it) => {
            const nv = nivelDe(it.autor.nivel);
            return (
              <li key={`${it.tipo}-${it.id}`} className="tarjeta grid gap-2">
                <div className="flex items-center gap-3">
                  <Avatar alias={it.autor.alias} url={it.autor.avatar_url} nivel={it.autor.nivel} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/panel/u/${it.autor.alias}`} className="font-bold hover:text-lava">@{it.autor.alias}</Link>
                    {nv && <span className="ml-2 text-xs" style={{ color: nv.color }}>{nv.nombre}</span>}
                    <p className="text-xs text-suave">{hace(it.creado_en)}</p>
                  </div>
                </div>
                {it.tipo === "logro" ? (
                  <p className="text-lg">🏅 {it.titulo}</p>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{it.titulo}</p>
                )}
                {it.enlace && (
                  <a href={it.enlace} target="_blank" rel="noopener noreferrer nofollow ugc" className="btn btn-borde justify-self-start !py-1 text-sm">
                    ▶ Ver en {hostDe(it.enlace)}
                  </a>
                )}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <button onClick={() => reaccionar(it)} aria-pressed={it.yo_reaccione} className={`rounded-full border px-3 py-1 ${it.yo_reaccione ? "border-lava text-lava" : "border-borde text-suave"}`}>
                    💪 {it.reacciones > 0 ? it.reacciones : "Fuerza"}
                  </button>
                  {it.es_mio && it.tipo === "publicacion" && (
                    <button onClick={() => borrar(it)} className="text-suave hover:text-lava">Borrar</button>
                  )}
                  {!it.es_mio && (
                    <button onClick={() => setReportando(reportando === it.id ? null : it.id)} className="text-suave hover:text-lava">Reportar</button>
                  )}
                </div>
                {reportando === it.id && (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Motivo del reporte">
                    {MOTIVOS_REPORTE.map((m) => (
                      <button key={m} onClick={() => reportar(it, m)} className="rounded-full border border-borde px-3 py-1 text-xs hover:border-lava">{m}</button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {pestana !== "zona" && items.length > 0 && <p className="text-center text-sm text-suave">Ya viste todo lo de hoy. 🌿 Ve a entrenar: aquí te esperamos con tus logros.</p>}
    </section>
  );
}
