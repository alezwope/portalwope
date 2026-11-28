"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { crearCliente } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/social";
import { NIVELES, OBJETIVOS, nivelDe } from "@/lib/catalogos";
import { nomCat, rellenar, type ClaveTexto } from "@/lib/i18n/diccionarios";
import { useTextos } from "@/components/Idioma";

export type CrewResumen = {
  id: string; tipo: "familia" | "club" | "crew"; nombre: string; descripcion: string | null; ciudad: string; pais: string; lugar: string | null;
  niveles: string[]; objetivo: string | null; abierto: boolean; miembros: number; estado: "ninguno" | "solicitud" | "activo"; rol: string | null; es_mio: boolean; encaja: boolean;
};
type Datos = { pais: string | null; ciudad: string | null; nivel: string | null; crews: CrewResumen[] };

export function EtiquetasNivel({ niveles }: { niveles: string[] }) {
  const { t } = useTextos();
  if (niveles.length === 0) return <span className="rounded-full border border-borde px-2 text-xs text-suave">{t["crw.todosNiveles"]}</span>;
  return (
    <>
      {niveles.map((n) => {
        const nv = nivelDe(n);
        return <span key={n} className="rounded-full border px-2 text-xs" style={{ borderColor: nv?.color, color: nv?.color }}>{nv?.nombre ?? n}</span>;
      })}
    </>
  );
}

export default function Crews() {
  const { t } = useTextos();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [formulario, setFormulario] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error } = await crearCliente().rpc("crews_zona");
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    setDatos(data as Datos);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  async function unirse(id: string) {
    setMsg(null);
    const { data, error } = await crearCliente().rpc("unirse_crew", { p_id: id });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    setMsg({ ok: true, texto: data === "activo" ? t["crw.sumado"] : t["crw.pendiente"] });
    await cargar();
  }

  if (!datos) return <p className="tarjeta text-suave">{msg ? msg.texto : t["crw.cargando"]}</p>;
  if (!datos.pais) {
    return (
      <div className="tarjeta grid gap-2">
        <p>{t["crw.completaPerfil"]}</p>
        <Link href="/panel/perfil" className="btn btn-lava justify-self-start">{t["crw.completarBtn"]}</Link>
      </div>
    );
  }
  const mios = datos.crews.filter((c) => c.es_mio);
  const otros = datos.crews.filter((c) => !c.es_mio);

  return (
    <div className="grid gap-5">
      {msg && <p className={msg.ok ? "aviso-ok" : "aviso-error"} role="status">{msg.texto}</p>}
      <div>
        <button className="btn btn-lava !py-1.5" onClick={() => setFormulario(!formulario)}>{t["crw.crear"]}</button>
      </div>
      {formulario && (
        <FormCrew pais={datos.pais} ciudad={datos.ciudad ?? ""} onError={(x) => setMsg({ ok: false, texto: x })}
          onListo={async () => { setFormulario(false); setMsg({ ok: true, texto: t["crw.creado"] }); await cargar(); }} />
      )}
      {mios.length > 0 && (
        <section className="grid gap-3">
          <h3 className="text-xl">{t["crw.mio"]}</h3>
          <ul className="grid gap-3 md:grid-cols-2">{mios.map((c) => <Tarjeta key={c.id} c={c} onUnirse={unirse} />)}</ul>
        </section>
      )}
      <section className="grid gap-3">
        {otros.length === 0 && mios.length === 0 ? (
          <p className="tarjeta text-suave">{t["crw.vacio"]}</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">{otros.map((c) => <Tarjeta key={c.id} c={c} onUnirse={unirse} />)}</ul>
        )}
      </section>
      <p className="text-xs text-suave">{t["crw.avisoPrivacidad"]}</p>
    </div>
  );
}

function Tarjeta({ c, onUnirse }: { c: CrewResumen; onUnirse: (id: string) => void }) {
  const { t } = useTextos();
  return (
    <li className="tarjeta grid content-start gap-2">
      <p className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-dorado px-2 text-xs text-dorado">{t[`crw.tipo.${c.tipo}` as ClaveTexto]}</span>
        <Link href={`/panel/crews/${c.id}`} className="font-bold hover:text-lava">{c.nombre}</Link>
      </p>
      <p className="flex flex-wrap gap-1"><EtiquetasNivel niveles={c.niveles} /></p>
      <p className="text-sm text-suave">
        {c.objetivo ? `🎯 ${nomCat(t, "obj", c.objetivo, OBJETIVOS[c.objetivo as keyof typeof OBJETIVOS])} · ` : ""}
        {rellenar(t["crw.miembros"], { n: c.miembros })} · {c.ciudad}
      </p>
      {c.lugar && <p className="text-sm text-suave">📍 {rellenar(t["crw.entrenanEn"], { lugar: c.lugar })}</p>}
      {c.descripcion && <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm">{c.descripcion}</p>}
      <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
        {c.es_mio ? (
          <Link href={`/panel/crews/${c.id}`} className="btn btn-borde !py-1">{t["crw.ver"]}</Link>
        ) : c.estado === "solicitud" ? (
          <span className="text-suave">{t["crw.pendiente"]}</span>
        ) : (
          <button onClick={() => onUnirse(c.id)} className="btn btn-lava !py-1">{c.abierto ? t["crw.unirme"] : t["crw.pedir"]}</button>
        )}
        {c.encaja && !c.es_mio && <span className="text-xs text-dorado">✓ {t["crw.encaja"]}</span>}
      </div>
    </li>
  );
}

function FormCrew({ pais, ciudad, onListo, onError }: { pais: string; ciudad: string; onListo: () => void; onError: (t: string) => void }) {
  const { t } = useTextos();
  const [v, setV] = useState({ tipo: "crew", nombre: "", descripcion: "", ciudad, lugar: "", contacto: "", objetivo: "", abierto: true });
  const [niveles, setNiveles] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const set = (k: keyof typeof v, x: string | boolean) => setV((p) => ({ ...p, [k]: x }));
  const alternar = (n: string) => setNiveles((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setCargando(true);
    const { error } = await crearCliente().rpc("crear_crew", {
      p_tipo: v.tipo, p_nombre: v.nombre, p_descripcion: v.descripcion, p_ciudad: v.ciudad, p_pais: pais, p_lugar: v.lugar, p_contacto: v.contacto,
      p_niveles: niveles, p_objetivo: v.objetivo, p_abierto: v.abierto,
    });
    setCargando(false);
    if (error) return onError(mensajeError(error));
    onListo();
  }
  return (
    <form onSubmit={enviar} className="tarjeta grid gap-3">
      <h3 className="text-lg">{t["crw.nuevo"]}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <select className="campo" value={v.tipo} onChange={(e) => set("tipo", e.target.value)} aria-label={t["crw.tipo"]}>
          {(["crew", "club", "familia"] as const).map((k) => <option key={k} value={k}>{t[`crw.tipo.${k}` as ClaveTexto]}</option>)}
        </select>
        <input className="campo" required minLength={3} maxLength={60} placeholder={t["crw.nombre"]} value={v.nombre} onChange={(e) => set("nombre", e.target.value)} />
        <input className="campo" required minLength={2} maxLength={80} placeholder={t["crw.ciudad"]} value={v.ciudad} onChange={(e) => set("ciudad", e.target.value)} />
        <input className="campo" maxLength={120} placeholder={t["crw.donde"]} value={v.lugar} onChange={(e) => set("lugar", e.target.value)} />
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm">{t["crw.nivelesTitulo"]}</legend>
        <div className="flex flex-wrap gap-2">
          {NIVELES.map((n) => (
            <button type="button" key={n.clave} onClick={() => alternar(n.clave)} aria-pressed={niveles.includes(n.clave)}
              className="rounded-full border px-3 py-1 text-sm" style={niveles.includes(n.clave) ? { borderColor: n.color, color: n.color } : undefined}>
              {n.nombre}
            </button>
          ))}
        </div>
        <p className="text-xs text-suave">{niveles.length === 0 ? t["crw.todosNiveles"] : ""}</p>
      </fieldset>
      <select className="campo" value={v.objetivo} onChange={(e) => set("objetivo", e.target.value)} aria-label={t["crw.objetivo"]}>
        <option value="">{t["crw.sinObjetivo"]}</option>
        {Object.entries(OBJETIVOS).map(([k, x]) => <option key={k} value={k}>{nomCat(t, "obj", k, x)}</option>)}
      </select>
      <textarea className="campo min-h-20" maxLength={400} placeholder={t["crw.desc"]} value={v.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
      <input className="campo" type="url" maxLength={200} placeholder={t["crw.contacto"]} value={v.contacto} onChange={(e) => set("contacto", e.target.value)} />
      <select className="campo" value={v.abierto ? "1" : "0"} onChange={(e) => set("abierto", e.target.value === "1")} aria-label={t["crw.abierto"]}>
        <option value="1">{t["crw.abierto"]}</option>
        <option value="0">{t["crw.cerrado"]}</option>
      </select>
      <button className="btn btn-lava justify-self-start" disabled={cargando}>{cargando ? t["crw.guardando"] : t["crw.guardar"]}</button>
    </form>
  );
}
