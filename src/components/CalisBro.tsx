"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { crearCliente } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/social";
import { OBJETIVOS, nivelDe } from "@/lib/catalogos";
import { nomCat, rellenar, type ClaveTexto } from "@/lib/i18n/diccionarios";
import { useTextos } from "@/components/Idioma";
import Avatar from "@/components/Avatar";

type Tarjeta = { id: string; alias: string; avatar_url: string | null; nivel: string | null; objetivo: string | null; ciudad: string | null; modalidad: string; horarios: string[]; nota: string | null };
type Mi = { activo: boolean; modalidad: string; horarios: string[]; nota: string | null };
type Persona = { id: string; alias: string; avatar_url: string | null; nivel: string | null; objetivo: string | null; ciudad: string | null };
type Tab = "descubrir" | "matches" | "perfil";

export default function CalisBro() {
  const { t } = useTextos();
  const [tab, setTab] = useState<Tab | null>(null);
  const [mi, setMi] = useState<Mi | null>(null);

  const cargarMi = useCallback(async () => {
    const { data } = await crearCliente().rpc("calisbro_mi");
    const m = data as Mi;
    setMi(m);
    setTab((x) => x ?? (m.activo ? "descubrir" : "perfil"));
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarMi();
  }, [cargarMi]);

  if (!mi || !tab) return <p className="tarjeta text-suave">{t["crw.cargando"]}</p>;
  const TABS: { id: Tab; texto: string }[] = [
    { id: "descubrir", texto: t["cb.tabDescubrir"] },
    { id: "matches", texto: t["cb.tabMatches"] },
    { id: "perfil", texto: t["cb.tabPerfil"] },
  ];
  return (
    <div className="grid gap-4">
      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((x) => (
          <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)}
            className={`rounded-full border px-3 py-1 text-sm ${tab === x.id ? "border-lava text-lava" : "border-borde text-suave"}`}>{x.texto}</button>
        ))}
      </div>
      {tab === "descubrir" && <Descubrir activo={mi.activo} irPerfil={() => setTab("perfil")} />}
      {tab === "matches" && <Matches />}
      {tab === "perfil" && <MiPerfil mi={mi} onGuardado={cargarMi} />}
    </div>
  );
}

function Descubrir({ activo, irPerfil }: { activo: boolean; irPerfil: () => void }) {
  const { t } = useTextos();
  const [cartas, setCartas] = useState<Tarjeta[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [match, setMatch] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error } = await crearCliente().rpc("calisbro_mazo");
    if (error) return setMsg(mensajeError(error));
    setCartas((data as { tarjetas: Tarjeta[] }).tarjetas);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activo) cargar();
  }, [activo, cargar]);

  async function votar(c: Tarjeta, voto: "interesa" | "paso") {
    setOcupado(true);
    setMsg(null);
    const { data, error } = await crearCliente().rpc("calisbro_votar", { p_a: c.id, p_voto: voto });
    setOcupado(false);
    if (error) return setMsg(mensajeError(error));
    if ((data as { match: boolean }).match) setMatch(c.alias);
    const resto = (cartas ?? []).filter((x) => x.id !== c.id);
    setCartas(resto);
    if (resto.length === 0) await cargar();
  }

  if (!activo) {
    return (
      <div className="tarjeta grid gap-2">
        <p>{t["cb.inactivo"]}</p>
        <button className="btn btn-lava justify-self-start" onClick={irPerfil}>{t["cb.irPerfil"]}</button>
      </div>
    );
  }
  if (match) {
    return (
      <div className="tarjeta grid gap-3 text-center">
        <p className="text-3xl" aria-hidden>🤝</p>
        <p className="text-lg font-bold">{rellenar(t["cb.matchTitulo"], { alias: match })}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={`/panel/mensajes/${match}`} className="btn btn-lava">{t["cb.escribir"]}</Link>
          <Link href="/panel/eventos" className="btn btn-borde">{t["cb.armarJuntada"]}</Link>
          <button className="btn btn-borde" onClick={() => setMatch(null)}>{t["cb.seguir"]}</button>
        </div>
      </div>
    );
  }
  if (!cartas) return <p className="tarjeta text-suave">{msg ?? t["crw.cargando"]}</p>;
  const c = cartas[0];
  if (!c) {
    return (
      <div className="tarjeta grid gap-2">
        <p className="text-suave">{t["cb.vacio"]}</p>
        <Link href="/panel/crews" className="btn btn-borde justify-self-start">{t["cb.verCrews"]}</Link>
      </div>
    );
  }
  const nv = nivelDe(c.nivel);
  return (
    <div className="grid gap-3">
      {msg && <p className="aviso-error" role="alert">{msg}</p>}
      <article className="tarjeta grid gap-3" aria-live="polite">
        <div className="flex items-center gap-3">
          <Avatar alias={c.alias} url={c.avatar_url} nivel={c.nivel} />
          <div className="min-w-0">
            <p className="text-xl font-bold">@{c.alias}</p>
            <p className="text-sm text-suave">
              {nv && <span style={{ color: nv.color }}>{nv.nombre}</span>}{c.ciudad ? ` · ${c.ciudad}` : ""}
            </p>
          </div>
        </div>
        <p className="flex flex-wrap gap-2 text-sm">
          {c.objetivo && <span className="rounded-full border border-borde px-2">🎯 {nomCat(t, "obj", c.objetivo, OBJETIVOS[c.objetivo as keyof typeof OBJETIVOS])}</span>}
          <span className="rounded-full border border-borde px-2">{t[`cb.mod.${c.modalidad}` as ClaveTexto]}</span>
          {c.horarios.map((h) => <span key={h} className="rounded-full border border-borde px-2">{t[`cb.hor.${h}` as ClaveTexto]}</span>)}
        </p>
        {c.nota && <p className="whitespace-pre-wrap break-words">“{c.nota}”</p>}
        <div className="flex gap-3">
          <button className="btn btn-borde flex-1" disabled={ocupado} onClick={() => votar(c, "paso")}>✕ {t["cb.paso"]}</button>
          <button className="btn btn-lava flex-1" disabled={ocupado} onClick={() => votar(c, "interesa")}>💪 {t["cb.interesa"]}</button>
        </div>
      </article>
    </div>
  );
}

function Matches() {
  const { t } = useTextos();
  const [lista, setLista] = useState<Persona[] | null>(null);
  useEffect(() => {
    crearCliente().rpc("calisbro_matches").then(({ data }) => setLista((data ?? []) as Persona[]));
  }, []);
  if (!lista) return <p className="tarjeta text-suave">{t["crw.cargando"]}</p>;
  if (lista.length === 0) return <p className="tarjeta text-suave">{t["cb.sinMatches"]}</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {lista.map((p) => (
        <li key={p.id} className="tarjeta flex items-center gap-3">
          <Avatar alias={p.alias} url={p.avatar_url} nivel={p.nivel} />
          <div className="min-w-0 flex-1">
            <Link href={`/panel/u/${p.alias}`} className="font-bold hover:text-lava">@{p.alias}</Link>
            <p className="text-xs text-suave">{p.ciudad}</p>
          </div>
          <Link href={`/panel/mensajes/${p.alias}`} className="btn btn-lava !py-1">{t["cb.escribir"]}</Link>
        </li>
      ))}
    </ul>
  );
}

function MiPerfil({ mi, onGuardado }: { mi: Mi; onGuardado: () => void }) {
  const { t } = useTextos();
  const [activo, setActivo] = useState(mi.activo);
  const [modalidad, setModalidad] = useState(mi.modalidad);
  const [horarios, setHorarios] = useState<string[]>(mi.horarios);
  const [nota, setNota] = useState(mi.nota ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const alternar = (h: string) => setHorarios((p) => (p.includes(h) ? p.filter((x) => x !== h) : [...p, h]));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const { error } = await crearCliente().rpc("calisbro_guardar", { p_activo: activo, p_modalidad: modalidad, p_horarios: horarios, p_nota: nota });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    setMsg({ ok: true, texto: t["cb.guardado"] });
    onGuardado();
  }
  return (
    <form onSubmit={guardar} className="tarjeta grid gap-3">
      <label className="flex items-start gap-2">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="mt-1" />
        <span><strong>{t["cb.activar"]}</strong><br /><span className="text-xs text-suave">{t["cb.activarAyuda"]}</span></span>
      </label>
      <label className="grid gap-1 text-sm">{t["cb.modalidad"]}
        <select className="campo" value={modalidad} onChange={(e) => setModalidad(e.target.value)}>
          {(["presencial", "distancia", "ambas"] as const).map((m) => <option key={m} value={m}>{t[`cb.mod.${m}` as ClaveTexto]}</option>)}
        </select>
      </label>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm">{t["cb.horarios"]}</legend>
        <div className="flex flex-wrap gap-2">
          {(["manana", "tarde", "noche"] as const).map((h) => (
            <button type="button" key={h} aria-pressed={horarios.includes(h)} onClick={() => alternar(h)}
              className={`rounded-full border px-3 py-1 text-sm ${horarios.includes(h) ? "border-lava text-lava" : "border-borde text-suave"}`}>{t[`cb.hor.${h}` as ClaveTexto]}</button>
          ))}
        </div>
      </fieldset>
      <input className="campo" maxLength={140} value={nota} onChange={(e) => setNota(e.target.value)} placeholder={t["cb.nota"]} aria-label={t["cb.nota"]} />
      {msg && <p className={msg.ok ? "aviso-ok" : "aviso-error"} role="status">{msg.texto}</p>}
      <button className="btn btn-lava justify-self-start">{t["cb.guardar"]}</button>
    </form>
  );
}
