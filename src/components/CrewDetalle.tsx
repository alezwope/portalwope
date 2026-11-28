"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";
import { MOTIVOS_REPORTE, hace, mensajeError, type ItemFeed } from "@/lib/social";
import { OBJETIVOS, nivelDe } from "@/lib/catalogos";
import { nomCat, rellenar, type ClaveTexto } from "@/lib/i18n/diccionarios";
import { useTextos } from "@/components/Idioma";
import Avatar from "@/components/Avatar";
import { EtiquetasNivel } from "@/components/Crews";

type Persona = { id: string; alias: string; avatar_url: string | null; nivel: string | null; rol?: string };
type Detalle = {
  id: string; tipo: "familia" | "club" | "crew"; nombre: string; descripcion: string | null; ciudad: string; pais: string; lugar: string | null; contacto_url: string | null;
  niveles: string[]; objetivo: string | null; abierto: boolean; total: number; estado: "ninguno" | "solicitud" | "activo"; rol: string | null;
  miembros: Persona[]; solicitudes: Persona[];
  eventos: { id: string; titulo: string; lugar: string; ciudad: string; inicia_en: string; cupo: number | null; voy: number; yo_voy: boolean }[];
};

function contactoDe(url: string) {
  try {
    const h = new URL(url).hostname.replace(/^(www|m)\./, "");
    if (h.includes("instagram")) return "Instagram";
    if (h.includes("whatsapp") || h === "wa.me") return "WhatsApp";
    if (h.startsWith("t.me")) return "Telegram";
    if (h.includes("youtube") || h === "youtu.be") return "YouTube";
    return "Facebook";
  } catch {
    return "";
  }
}

export default function CrewDetalle({ id }: { id: string }) {
  const { t, idioma } = useTextos();
  const router = useRouter();
  const [d, setD] = useState<Detalle | null | undefined>(undefined);
  const [posts, setPosts] = useState<ItemFeed[]>([]);
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [reportando, setReportando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const sb = crearCliente();
    const { data, error } = await sb.rpc("crew_detalle", { p_id: id });
    if (error) { setMsg({ ok: false, texto: mensajeError(error) }); return setD(null); }
    setD((data as Detalle | null) ?? null);
    if (data && (data as Detalle).estado === "activo") {
      const r = await sb.rpc("feed_crew", { p_crew: id });
      setPosts((r.data ?? []) as ItemFeed[]);
    }
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  async function llamar(fn: string, args: Record<string, unknown>, ok?: string) {
    setMsg(null);
    const { error } = await crearCliente().rpc(fn, args);
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    if (ok) setMsg({ ok: true, texto: ok });
    await cargar();
  }
  async function publicar(ev: React.FormEvent) {
    ev.preventDefault();
    setMsg(null);
    const { error } = await crearCliente().rpc("publicar", { p_texto: texto, p_enlace: null, p_crew: id });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    setTexto("");
    await cargar();
  }
  async function reaccionar(it: ItemFeed) {
    const { data, error } = await crearCliente().rpc("reaccionar", { p_tipo: it.tipo, p_id: it.id });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    const r = data as { n: number; yo: boolean };
    setPosts((prev) => prev.map((x) => (x.id === it.id ? { ...x, reacciones: r.n, yo_reaccione: r.yo } : x)));
  }
  async function borrarPub(it: ItemFeed) {
    const { error } = await crearCliente().rpc("borrar_publicacion", { p_id: it.id });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    setPosts((prev) => prev.filter((x) => x.id !== it.id));
  }
  async function reportar(it: ItemFeed, motivo: string) {
    const { error } = await crearCliente().rpc("reportar", { p_tipo: it.tipo, p_id: it.id, p_motivo: motivo });
    setReportando(null);
    setMsg(error ? { ok: false, texto: mensajeError(error) } : { ok: true, texto: t["crw.gracias"] });
  }
  async function asistir(eid: string) {
    const { data, error } = await crearCliente().rpc("asistir", { p_evento: eid });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    const r = data as { voy: number; yo_voy: boolean };
    setD((x) => (x ? { ...x, eventos: x.eventos.map((e) => (e.id === eid ? { ...e, voy: r.voy, yo_voy: r.yo_voy } : e)) } : x));
  }
  async function borrarCrew() {
    const { error } = await crearCliente().rpc("borrar_agrupacion", { p_id: id });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    router.push("/panel/crews");
  }

  if (d === undefined) return <p className="tarjeta text-suave">{t["crw.cargando"]}</p>;
  if (d === null) return <div className="tarjeta grid gap-2"><p>{t["crw.noDisponible"]}</p><Link href="/panel/crews" className="btn btn-borde justify-self-start">{t["crw.volver"]}</Link></div>;

  const soyDueno = d.rol === "dueno";
  const activo = d.estado === "activo";
  const red = d.contacto_url ? contactoDe(d.contacto_url) : "";

  return (
    <div className="grid gap-5">
      <Link href="/panel/crews" className="text-sm text-suave hover:text-lava">{t["crw.volver"]}</Link>
      <header className="tarjeta grid gap-2">
        <p className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-dorado px-2 text-xs text-dorado">{t[`crw.tipo.${d.tipo}` as ClaveTexto]}</span>
          <span className="flex flex-wrap gap-1"><EtiquetasNivel niveles={d.niveles} /></span>
        </p>
        <h2 className="text-2xl">{d.nombre}</h2>
        <p className="text-sm text-suave">
          {d.objetivo ? `🎯 ${nomCat(t, "obj", d.objetivo, OBJETIVOS[d.objetivo as keyof typeof OBJETIVOS])} · ` : ""}
          {rellenar(t["crw.miembros"], { n: d.total })} · {d.ciudad}
        </p>
        {d.lugar && <p className="text-sm text-suave">📍 {rellenar(t["crw.entrenanEn"], { lugar: d.lugar })}</p>}
        {d.descripcion && <p className="whitespace-pre-wrap break-words text-sm">{d.descripcion}</p>}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
          {d.contacto_url && <a href={d.contacto_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="btn btn-borde !py-1">{rellenar(t["crw.contactar"], { red })}</a>}
          {d.estado === "ninguno" && <button onClick={() => llamar("unirse_crew", { p_id: id }, d.abierto ? t["crw.sumado"] : t["crw.pendiente"])} className="btn btn-lava !py-1">{d.abierto ? t["crw.unirme"] : t["crw.pedir"]}</button>}
          {d.estado === "solicitud" && <span className="text-suave">{t["crw.pendiente"]}</span>}
          {activo && !soyDueno && <button onClick={() => llamar("salir_crew", { p_id: id })} className="text-suave hover:text-lava">{t["crw.salir"]}</button>}
          {soyDueno && !confirmar && <button onClick={() => setConfirmar(true)} className="text-suave hover:text-lava">{t["crw.borrar"]}</button>}
        </div>
        {confirmar && (
          <div className="flex flex-wrap items-center gap-3 text-sm" role="alert">
            <span>{t["crw.confirmarBorrar"]}</span>
            <button onClick={borrarCrew} className="btn btn-lava !py-1">{t["crw.si"]}</button>
            <button onClick={() => setConfirmar(false)} className="btn btn-borde !py-1">{t["crw.no"]}</button>
          </div>
        )}
      </header>

      {msg && <p className={msg.ok ? "aviso-ok" : "aviso-error"} role="status">{msg.texto}</p>}

      {soyDueno && d.solicitudes.length > 0 && (
        <section className="tarjeta grid gap-2">
          <h3 className="text-lg">{t["crw.solicitudes"]}</h3>
          <ul className="grid gap-2">
            {d.solicitudes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3">
                <Avatar alias={p.alias} url={p.avatar_url} nivel={p.nivel} />
                <Link href={`/panel/u/${p.alias}`} className="font-bold hover:text-lava">@{p.alias}</Link>
                <button onClick={() => llamar("resolver_solicitud_crew", { p_crew: id, p_usuario: p.id, p_aceptar: true })} className="btn btn-lava !py-1">{t["crw.aceptar"]}</button>
                <button onClick={() => llamar("resolver_solicitud_crew", { p_crew: id, p_usuario: p.id, p_aceptar: false })} className="btn btn-borde !py-1">{t["crw.rechazar"]}</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activo ? (
        <>
          <section className="grid gap-3">
            <h3 className="text-xl">{t["crw.publicaciones"]}</h3>
            <form onSubmit={publicar} className="tarjeta grid gap-2">
              <textarea className="campo min-h-20" maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={t["crw.placeholder"]} aria-label={t["crw.placeholder"]} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-suave">{texto.length}/500</span>
                <button className="btn btn-lava !py-1.5" disabled={texto.trim().length === 0}>{t["crw.publicar"]}</button>
              </div>
            </form>
            {posts.length === 0 ? <p className="tarjeta text-suave">{t["crw.vacioPub"]}</p> : (
              <ul className="grid gap-3">
                {posts.map((it) => {
                  const nv = nivelDe(it.autor.nivel);
                  return (
                    <li key={it.id} className="tarjeta grid gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar alias={it.autor.alias} url={it.autor.avatar_url} nivel={it.autor.nivel} />
                        <div className="min-w-0 flex-1">
                          <Link href={`/panel/u/${it.autor.alias}`} className="font-bold hover:text-lava">@{it.autor.alias}</Link>
                          {nv && <span className="ml-2 text-xs" style={{ color: nv.color }}>{nv.nombre}</span>}
                          <p className="text-xs text-suave">{hace(it.creado_en, idioma)}</p>
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap break-words">{it.titulo}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <button onClick={() => reaccionar(it)} aria-pressed={it.yo_reaccione} className={`rounded-full border px-3 py-1 ${it.yo_reaccione ? "border-lava text-lava" : "border-borde text-suave"}`}>
                          💪 {it.reacciones > 0 ? it.reacciones : t["feed.fuerza"]}
                        </button>
                        {(it.es_mio || soyDueno) && <button onClick={() => borrarPub(it)} className="text-suave hover:text-lava">{t["crw.borrarPub"]}</button>}
                        {!it.es_mio && <button onClick={() => setReportando(reportando === it.id ? null : it.id)} className="text-suave hover:text-lava">{t["crw.reportar"]}</button>}
                      </div>
                      {reportando === it.id && (
                        <div className="flex flex-wrap gap-2" role="group">
                          {MOTIVOS_REPORTE.map((m, i) => <button key={m} onClick={() => reportar(it, m)} className="rounded-full border border-borde px-3 py-1 text-xs hover:border-lava">{t[`motivo.${i}` as ClaveTexto]}</button>)}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="grid gap-3">
            <h3 className="text-xl">{t["crw.juntadas"]}</h3>
            {d.eventos.length === 0 ? <p className="tarjeta text-suave">{t["crw.sinJuntadas"]}</p> : (
              <ul className="grid gap-3">
                {d.eventos.map((e) => {
                  const llena = e.cupo != null && e.voy >= e.cupo && !e.yo_voy;
                  return (
                    <li key={e.id} className="tarjeta grid gap-1">
                      <p className="text-sm capitalize text-lava">{new Date(e.inicia_en).toLocaleString(idioma, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>
                      <p className="font-bold">{e.titulo}</p>
                      <p className="text-sm text-suave">📍 {e.lugar} · {e.ciudad}</p>
                      <div className="flex items-center gap-3 text-sm">
                        <button onClick={() => asistir(e.id)} disabled={llena} aria-pressed={e.yo_voy} className={`rounded-full border px-3 py-1 ${e.yo_voy ? "border-lava text-lava" : "border-borde"} disabled:opacity-50`}>
                          {llena ? t["jun.completa"] : e.yo_voy ? t["jun.voyOk"] : t["jun.voy"]}{!llena && e.voy > 0 ? ` · ${e.voy}` : ""}
                        </button>
                        {e.cupo != null && <span className="text-suave">{rellenar(t["jun.plazas"], { n: String(e.voy), max: String(e.cupo) })}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {soyDueno && <Link href="/panel/eventos" className="btn btn-borde justify-self-start !py-1.5">{t["jun.nueva"]}</Link>}
          </section>

          <section className="grid gap-2">
            <h3 className="text-xl">{t["crw.integrantes"]}</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {d.miembros.map((p) => (
                <li key={p.id} className="tarjeta flex items-center gap-3 !py-2">
                  <Avatar alias={p.alias} url={p.avatar_url} nivel={p.nivel} />
                  <Link href={`/panel/u/${p.alias}`} className="flex-1 font-bold hover:text-lava">@{p.alias}</Link>
                  {p.rol === "dueno" && <span className="text-xs text-dorado">★</span>}
                  {soyDueno && p.rol !== "dueno" && <button onClick={() => llamar("expulsar_de_crew", { p_crew: id, p_usuario: p.id })} className="text-xs text-suave hover:text-lava">{t["crw.quitar"]}</button>}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <p className="tarjeta text-suave">{t["crw.integrantesOculto"]}</p>
      )}
    </div>
  );
}
