"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { crearCliente } from "@/lib/supabase/client";
import { MOTIVOS_REPORTE, mensajeError } from "@/lib/social";

type Evento = { id: string; titulo: string; descripcion: string | null; ciudad: string; lugar: string; inicia_en: string; organiza: string; es_mio: boolean; voy: number; yo_voy: boolean };
type Agrupacion = { id: string; tipo: "familia" | "club" | "crew"; nombre: string; descripcion: string | null; ciudad: string; lugar: string | null; contacto_url: string | null; es_mio: boolean };
type Datos = { requiere_ubicacion: boolean; pais?: string; ciudad?: string | null; eventos: Evento[]; agrupaciones: Agrupacion[] };

const TIPOS = { familia: "Familia", club: "Club", crew: "Crew" } as const;

function cuando(iso: string) {
  return new Date(iso).toLocaleString("es", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}
function contactoDe(url: string) {
  try {
    const h = new URL(url).hostname.replace(/^(www|m)\./, "");
    if (h.includes("instagram")) return "Instagram";
    if (h.includes("whatsapp") || h === "wa.me") return "WhatsApp";
    if (h.startsWith("t.me")) return "Telegram";
    if (h.includes("youtube") || h === "youtu.be") return "YouTube";
    return "Facebook";
  } catch {
    return "Contacto";
  }
}

export default function Zona() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [formulario, setFormulario] = useState<"evento" | "agrupacion" | null>(null);
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

  async function llamar(fn: string, args: Record<string, unknown>, ok?: string) {
    setMsg(null);
    const { error } = await crearCliente().rpc(fn, args);
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    if (ok) setMsg({ ok: true, texto: ok });
    await cargar();
  }
  async function asistir(id: string) {
    setMsg(null);
    const { data, error } = await crearCliente().rpc("asistir", { p_evento: id });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    const r = data as { voy: number; yo_voy: boolean };
    setDatos((d) => (d ? { ...d, eventos: d.eventos.map((e) => (e.id === id ? { ...e, voy: r.voy, yo_voy: r.yo_voy } : e)) } : d));
  }
  async function reportar(tipo: "evento" | "agrupacion", id: string, motivo: string) {
    const { error } = await crearCliente().rpc("reportar", { p_tipo: tipo, p_id: id, p_motivo: motivo });
    setReportando(null);
    setMsg(error ? { ok: false, texto: mensajeError(error) } : { ok: true, texto: "Gracias. Revisaremos este contenido." });
  }

  if (!datos) return <p className="tarjeta text-suave">{msg ? msg.texto : "Cargando tu zona…"}</p>;
  if (datos.requiere_ubicacion) {
    return (
      <div className="tarjeta grid gap-2">
        <p>Para mostrarte lo que hay cerca, completa tu <strong>ciudad y país</strong> en tu perfil.</p>
        <Link href="/panel/perfil" className="btn btn-lava justify-self-start">Completar mi perfil</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <p className="text-sm text-suave">
        Lo que pasa en {datos.ciudad ? `${datos.ciudad}, ` : ""}{datos.pais}: juntadas y agrupaciones de calistenia. Aquí no se muestra nada personal de nadie.
      </p>
      {msg && <p className={msg.ok ? "aviso-ok" : "aviso-error"} role="status">{msg.texto}</p>}

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-lava !py-1.5" onClick={() => setFormulario(formulario === "evento" ? null : "evento")}>+ Publicar un evento</button>
        <button className="btn btn-borde !py-1.5" onClick={() => setFormulario(formulario === "agrupacion" ? null : "agrupacion")}>+ Registrar mi familia, club o crew</button>
      </div>

      {formulario === "evento" && (
        <FormEvento pais={datos.pais!} ciudad={datos.ciudad ?? ""} agrupaciones={datos.agrupaciones.filter((a) => a.es_mio)} onError={(t) => setMsg({ ok: false, texto: t })}
          onListo={async () => { setFormulario(null); setMsg({ ok: true, texto: "Evento publicado ✓" }); await cargar(); }} />
      )}
      {formulario === "agrupacion" && (
        <FormAgrupacion pais={datos.pais!} ciudad={datos.ciudad ?? ""} onError={(t) => setMsg({ ok: false, texto: t })}
          onListo={async () => { setFormulario(null); setMsg({ ok: true, texto: "Agrupación registrada ✓" }); await cargar(); }} />
      )}

      <section className="grid gap-3" aria-label="Eventos">
        <h3 className="text-xl">Próximos eventos</h3>
        {datos.eventos.length === 0 ? (
          <p className="tarjeta text-suave">Todavía no hay eventos en tu zona. ¡Organiza la primera juntada!</p>
        ) : (
          <ul className="grid gap-3">
            {datos.eventos.map((e) => (
              <li key={e.id} className="tarjeta grid gap-1">
                <p className="text-sm capitalize text-lava">{cuando(e.inicia_en)}</p>
                <p className="text-lg font-bold">{e.titulo}</p>
                <p className="text-sm text-suave">📍 {e.lugar}{e.ciudad ? ` · ${e.ciudad}` : ""} · Organiza: {e.organiza}</p>
                {e.descripcion && <p className="whitespace-pre-wrap break-words text-sm">{e.descripcion}</p>}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
                  <button onClick={() => asistir(e.id)} aria-pressed={e.yo_voy} className={`rounded-full border px-3 py-1 ${e.yo_voy ? "border-lava text-lava" : "border-borde"}`}>
                    {e.yo_voy ? "✓ Voy" : "Voy"}{e.voy > 0 ? ` · ${e.voy}` : ""}
                  </button>
                  {e.es_mio ? (
                    <button onClick={() => llamar("borrar_evento", { p_id: e.id }, "Evento borrado.")} className="text-suave hover:text-lava">Borrar</button>
                  ) : (
                    <button onClick={() => setReportando(reportando === e.id ? null : e.id)} className="text-suave hover:text-lava">Reportar</button>
                  )}
                </div>
                {reportando === e.id && <Motivos onElegir={(m) => reportar("evento", e.id, m)} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3" aria-label="Agrupaciones">
        <h3 className="text-xl">Familias, clubes y crews</h3>
        {datos.agrupaciones.length === 0 ? (
          <p className="tarjeta text-suave">Aún no hay agrupaciones registradas aquí. Si tienes una, ¡registra la tuya para que te encuentren!</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {datos.agrupaciones.map((a) => (
              <li key={a.id} className="tarjeta grid gap-1">
                <p className="flex items-center gap-2">
                  <span className="rounded-full border border-dorado px-2 text-xs text-dorado">{TIPOS[a.tipo]}</span>
                  <span className="font-bold">{a.nombre}</span>
                </p>
                {a.lugar && <p className="text-sm text-suave">📍 Entrenan en {a.lugar}</p>}
                {a.descripcion && <p className="whitespace-pre-wrap break-words text-sm">{a.descripcion}</p>}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
                  {a.contacto_url && (
                    <a href={a.contacto_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="btn btn-borde !py-1">Contactar en {contactoDe(a.contacto_url)}</a>
                  )}
                  {a.es_mio ? (
                    <button onClick={() => llamar("borrar_agrupacion", { p_id: a.id }, "Agrupación borrada.")} className="text-suave hover:text-lava">Borrar</button>
                  ) : (
                    <button onClick={() => setReportando(reportando === a.id ? null : a.id)} className="text-suave hover:text-lava">Reportar</button>
                  )}
                </div>
                {reportando === a.id && <Motivos onElegir={(m) => reportar("agrupacion", a.id, m)} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Motivos({ onElegir }: { onElegir: (m: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Motivo del reporte">
      {MOTIVOS_REPORTE.map((m) => (
        <button key={m} onClick={() => onElegir(m)} className="rounded-full border border-borde px-3 py-1 text-xs hover:border-lava">{m}</button>
      ))}
    </div>
  );
}

function FormEvento({ pais, ciudad, agrupaciones, onListo, onError }: { pais: string; ciudad: string; agrupaciones: Agrupacion[]; onListo: () => void; onError: (t: string) => void }) {
  const [v, setV] = useState({ titulo: "", descripcion: "", ciudad, lugar: "", cuando: "", agrupacion: "" });
  const [cargando, setCargando] = useState(false);
  const set = (k: keyof typeof v, x: string) => setV((p) => ({ ...p, [k]: x }));
  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!v.cuando) return onError("Elige fecha y hora.");
    setCargando(true);
    const { error } = await crearCliente().rpc("crear_evento", {
      p_titulo: v.titulo, p_descripcion: v.descripcion, p_ciudad: v.ciudad, p_pais: pais, p_lugar: v.lugar,
      p_inicia: new Date(v.cuando).toISOString(), p_agrupacion: v.agrupacion || null,
    });
    setCargando(false);
    if (error) return onError(mensajeError(error));
    onListo();
  }
  return (
    <form onSubmit={enviar} className="tarjeta grid gap-3">
      <h3 className="text-lg">Nuevo evento</h3>
      <input className="campo" required minLength={3} maxLength={80} placeholder="Título (ej. Juntada de calistenia en Plaza Italia)" value={v.titulo} onChange={(e) => set("titulo", e.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="campo" required minLength={3} maxLength={120} placeholder="Lugar (parque o plaza)" value={v.lugar} onChange={(e) => set("lugar", e.target.value)} />
        <input className="campo" required minLength={2} maxLength={80} placeholder="Ciudad" value={v.ciudad} onChange={(e) => set("ciudad", e.target.value)} />
      </div>
      <label className="grid gap-1 text-sm">Fecha y hora
        <input className="campo" type="datetime-local" required value={v.cuando} onChange={(e) => set("cuando", e.target.value)} />
      </label>
      <textarea className="campo min-h-20" maxLength={500} placeholder="Detalles (qué llevar, nivel, etc.) — opcional" value={v.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
      {agrupaciones.length > 0 && (
        <select className="campo" value={v.agrupacion} onChange={(e) => set("agrupacion", e.target.value)} aria-label="Organizar a nombre de">
          <option value="">Organizo yo (a mi nombre)</option>
          {agrupaciones.map((a) => <option key={a.id} value={a.id}>A nombre de {a.nombre}</option>)}
        </select>
      )}
      <p className="text-xs text-suave">Es público para quienes viven en tu zona. Solo calistenia, por favor.</p>
      <button className="btn btn-lava justify-self-start" disabled={cargando}>{cargando ? "Publicando…" : "Publicar evento"}</button>
    </form>
  );
}

function FormAgrupacion({ pais, ciudad, onListo, onError }: { pais: string; ciudad: string; onListo: () => void; onError: (t: string) => void }) {
  const [v, setV] = useState({ tipo: "crew", nombre: "", descripcion: "", ciudad, lugar: "", contacto: "" });
  const [cargando, setCargando] = useState(false);
  const set = (k: keyof typeof v, x: string) => setV((p) => ({ ...p, [k]: x }));
  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setCargando(true);
    const { error } = await crearCliente().rpc("crear_agrupacion", {
      p_tipo: v.tipo, p_nombre: v.nombre, p_descripcion: v.descripcion, p_ciudad: v.ciudad, p_pais: pais, p_lugar: v.lugar, p_contacto: v.contacto,
    });
    setCargando(false);
    if (error) return onError(mensajeError(error));
    onListo();
  }
  return (
    <form onSubmit={enviar} className="tarjeta grid gap-3">
      <h3 className="text-lg">Registrar mi agrupación</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <select className="campo" value={v.tipo} onChange={(e) => set("tipo", e.target.value)} aria-label="Tipo">
          <option value="crew">Crew</option><option value="club">Club</option><option value="familia">Familia</option>
        </select>
        <input className="campo" required minLength={3} maxLength={60} placeholder="Nombre" value={v.nombre} onChange={(e) => set("nombre", e.target.value)} />
        <input className="campo" required minLength={2} maxLength={80} placeholder="Ciudad" value={v.ciudad} onChange={(e) => set("ciudad", e.target.value)} />
        <input className="campo" maxLength={120} placeholder="Dónde entrenan (opcional)" value={v.lugar} onChange={(e) => set("lugar", e.target.value)} />
      </div>
      <textarea className="campo min-h-20" maxLength={400} placeholder="Cuéntanos quiénes son y cómo sumarse — opcional" value={v.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
      <input className="campo" type="url" maxLength={200} placeholder="Contacto: enlace de Instagram, WhatsApp, Facebook, YouTube o Telegram (opcional)" value={v.contacto} onChange={(e) => set("contacto", e.target.value)} />
      <p className="text-xs text-suave">No se muestran nombres de integrantes: solo la agrupación y su enlace de contacto.</p>
      <button className="btn btn-lava justify-self-start" disabled={cargando}>{cargando ? "Guardando…" : "Registrar"}</button>
    </form>
  );
}
