"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { crearCliente } from "@/lib/supabase/client";
import { MOTIVOS_REPORTE, mensajeError } from "@/lib/social";
import { useTextos } from "@/components/Idioma";
import { rellenar, type ClaveTexto } from "@/lib/i18n/diccionarios";

type Evento = { id: string; titulo: string; descripcion: string | null; ciudad: string; lugar: string; inicia_en: string; organiza: string; crew_id: string | null; es_mio: boolean; cupo: number | null; voy: number; yo_voy: boolean };
type MiCrew = { id: string; tipo: string; nombre: string };
type Datos = { requiere_ubicacion: boolean; pais?: string; ciudad?: string | null; eventos: Evento[]; agrupaciones: MiCrew[] };

export default function Juntadas() {
  const { t, idioma } = useTextos();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [formulario, setFormulario] = useState(false);
  const [reportando, setReportando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data, error } = await crearCliente().rpc("mi_zona");
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    setDatos(data as Datos);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const cuando = (iso: string) => new Date(iso).toLocaleString(idioma, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  async function asistir(id: string) {
    setMsg(null);
    const { data, error } = await crearCliente().rpc("asistir", { p_evento: id });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    const r = data as { voy: number; yo_voy: boolean };
    setDatos((d) => (d ? { ...d, eventos: d.eventos.map((e) => (e.id === id ? { ...e, voy: r.voy, yo_voy: r.yo_voy } : e)) } : d));
  }
  async function borrar(id: string) {
    const { error } = await crearCliente().rpc("borrar_evento", { p_id: id });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    setMsg({ ok: true, texto: t["jun.borrada"] });
    await cargar();
  }
  async function reportar(id: string, motivo: string) {
    const { error } = await crearCliente().rpc("reportar", { p_tipo: "evento", p_id: id, p_motivo: motivo });
    setReportando(null);
    setMsg(error ? { ok: false, texto: mensajeError(error) } : { ok: true, texto: t["jun.gracias"] });
  }

  if (!datos) return <p className="tarjeta text-suave">{msg ? msg.texto : t["crw.cargando"]}</p>;
  if (datos.requiere_ubicacion) {
    return (
      <div className="tarjeta grid gap-2">
        <p>{t["crw.completaPerfil"]}</p>
        <Link href="/panel/perfil" className="btn btn-lava justify-self-start">{t["crw.completarBtn"]}</Link>
      </div>
    );
  }
  const zona = `${datos.ciudad ? `${datos.ciudad}, ` : ""}${datos.pais}`;

  return (
    <div className="grid gap-5">
      <p className="text-sm text-suave">{rellenar(t["jun.intro"], { zona })}</p>
      {msg && <p className={msg.ok ? "aviso-ok" : "aviso-error"} role="status">{msg.texto}</p>}
      <div>
        <button className="btn btn-lava !py-1.5" onClick={() => setFormulario(!formulario)}>{t["jun.nueva"]}</button>
      </div>
      {formulario && (
        <FormJuntada pais={datos.pais!} ciudad={datos.ciudad ?? ""} crews={datos.agrupaciones} onError={(x) => setMsg({ ok: false, texto: x })}
          onListo={async () => { setFormulario(false); setMsg({ ok: true, texto: t["jun.publicada"] }); await cargar(); }} />
      )}
      <section className="grid gap-3" aria-label={t["jun.proximas"]}>
        <h3 className="text-xl">{t["jun.proximas"]}</h3>
        {datos.eventos.length === 0 ? (
          <p className="tarjeta text-suave">{t["jun.vacio"]}</p>
        ) : (
          <ul className="grid gap-3">
            {datos.eventos.map((e) => {
              const llena = e.cupo != null && e.voy >= e.cupo && !e.yo_voy;
              return (
                <li key={e.id} className="tarjeta grid gap-1">
                  <p className="text-sm capitalize text-lava">{cuando(e.inicia_en)}</p>
                  <p className="text-lg font-bold">{e.titulo}</p>
                  <p className="text-sm text-suave">
                    📍 {e.lugar}{e.ciudad ? ` · ${e.ciudad}` : ""} · {rellenar(t["jun.organiza"], { quien: e.organiza })}
                    {e.crew_id && <> · <Link href={`/panel/crews/${e.crew_id}`} className="underline hover:text-lava">{t["crw.ver"]}</Link></>}
                  </p>
                  {e.descripcion && <p className="whitespace-pre-wrap break-words text-sm">{e.descripcion}</p>}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
                    <button onClick={() => asistir(e.id)} disabled={llena} aria-pressed={e.yo_voy} className={`rounded-full border px-3 py-1 ${e.yo_voy ? "border-lava text-lava" : "border-borde"} disabled:opacity-50`}>
                      {llena ? t["jun.completa"] : e.yo_voy ? t["jun.voyOk"] : t["jun.voy"]}{!llena && e.voy > 0 ? ` · ${e.voy}` : ""}
                    </button>
                    {e.cupo != null && <span className="text-suave">{rellenar(t["jun.plazas"], { n: String(e.voy), max: String(e.cupo) })}</span>}
                    {e.es_mio ? (
                      <button onClick={() => borrar(e.id)} className="text-suave hover:text-lava">{t["jun.borrar"]}</button>
                    ) : (
                      <button onClick={() => setReportando(reportando === e.id ? null : e.id)} className="text-suave hover:text-lava">{t["jun.reportar"]}</button>
                    )}
                  </div>
                  {reportando === e.id && (
                    <div className="flex flex-wrap gap-2" role="group">
                      {MOTIVOS_REPORTE.map((m, i) => (
                        <button key={m} onClick={() => reportar(e.id, m)} className="rounded-full border border-borde px-3 py-1 text-xs hover:border-lava">{t[`motivo.${i}` as ClaveTexto]}</button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function FormJuntada({ pais, ciudad, crews, onListo, onError }: { pais: string; ciudad: string; crews: MiCrew[]; onListo: () => void; onError: (t: string) => void }) {
  const { t } = useTextos();
  const [v, setV] = useState({ titulo: "", descripcion: "", ciudad, lugar: "", cuando: "", crew: "", cupo: "" });
  const [cargando, setCargando] = useState(false);
  const set = (k: keyof typeof v, x: string) => setV((p) => ({ ...p, [k]: x }));
  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!v.cuando) return onError(t["jun.elegirFecha"]);
    setCargando(true);
    const { error } = await crearCliente().rpc("crear_juntada", {
      p_titulo: v.titulo, p_descripcion: v.descripcion, p_ciudad: v.ciudad, p_pais: pais, p_lugar: v.lugar,
      p_inicia: new Date(v.cuando).toISOString(), p_agrupacion: v.crew || null, p_cupo: v.cupo ? Number(v.cupo) : null,
    });
    setCargando(false);
    if (error) return onError(mensajeError(error));
    onListo();
  }
  return (
    <form onSubmit={enviar} className="tarjeta grid gap-3">
      <h3 className="text-lg">{t["jun.formTitulo"]}</h3>
      <input className="campo" required minLength={3} maxLength={80} placeholder={t["jun.campoTitulo"]} value={v.titulo} onChange={(e) => set("titulo", e.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="campo" required minLength={3} maxLength={120} placeholder={t["jun.lugar"]} value={v.lugar} onChange={(e) => set("lugar", e.target.value)} />
        <input className="campo" required minLength={2} maxLength={80} placeholder={t["jun.ciudad"]} value={v.ciudad} onChange={(e) => set("ciudad", e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">{t["jun.cuando"]}
          <input className="campo" type="datetime-local" required value={v.cuando} onChange={(e) => set("cuando", e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">{t["jun.cupo"]}
          <input className="campo" type="number" min={2} max={500} value={v.cupo} onChange={(e) => set("cupo", e.target.value)} />
        </label>
      </div>
      <textarea className="campo min-h-20" maxLength={500} placeholder={t["jun.detalles"]} value={v.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
      {crews.length > 0 && (
        <select className="campo" value={v.crew} onChange={(e) => set("crew", e.target.value)} aria-label={t["jun.aNombre"]}>
          <option value="">{t["jun.aNombre"]}</option>
          {crews.map((a) => <option key={a.id} value={a.id}>{rellenar(t["jun.aNombreDe"], { nombre: a.nombre })}</option>)}
        </select>
      )}
      <p className="text-xs text-suave">{t["jun.publico"]}</p>
      <button className="btn btn-lava justify-self-start" disabled={cargando}>{cargando ? t["jun.publicando"] : t["jun.publicar"]}</button>
    </form>
  );
}
