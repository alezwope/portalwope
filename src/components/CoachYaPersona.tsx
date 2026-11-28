"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTextos } from "@/components/Idioma";
import { rellenar, nomCat } from "@/lib/i18n/diccionarios";
import { crearCliente } from "@/lib/supabase/client";

type Oferta = { id: string; nombre: string; slug: string; bio: string | null; ciudad: string | null; precio: number; moneda: string; modalidad: string; mensaje: string | null; estado: string };
type Pedido = { id: string; objetivo: string; estado: string; max_ofertas: number; vence_en: string; ofertas: Oferta[] };

const OBJ = ["fuerza", "habilidades", "salud", "masa_muscular", "bajar_grasa", "movilidad"];
const TIEMPOS = ["nunca", "menos_6m", "6m_2a", "mas_2a"];
const FORMATOS = ["individual", "grupal", "indistinto"];
const MODS = ["presencial_individual", "presencial_grupal", "domicilio", "distancia_individual", "distancia_grupal"];

export default function CoachYaPersona({ ciudad, pais, peso, estatura }: { ciudad: string; pais: string; peso: number | null; estatura: number | null }) {
  const { t, idioma } = useTextos();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [cargando, setCargando] = useState(false);
  const [f, setF] = useState({
    peso: peso ? String(peso) : "", estatura: estatura ? String(estatura) : "", objetivo: "fuerza", tiempo: "menos_6m",
    formato: "indistinto", mods: [] as string[], ciudad, dias: "", max: "3", mensaje: "",
  });

  const cargar = useCallback(async () => {
    const { data } = await crearCliente().rpc("coachya_mis_pedidos");
    setPedidos((data ?? []) as Pedido[]);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const textoError = (m: string) => (t as Record<string, string>)[`cy.err.${m}`] ?? t["cy.err"];

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg(""); setCargando(true);
    const { error } = await crearCliente().rpc("coachya_crear", {
      p_peso: f.peso ? Number(f.peso) : null, p_estatura: f.estatura ? Number(f.estatura) : null, p_objetivo: f.objetivo, p_tiempo: f.tiempo,
      p_formato: f.formato, p_modalidades: f.mods, p_ciudad: f.ciudad, p_pais: pais, p_dias: f.dias, p_max: Number(f.max), p_mensaje: f.mensaje,
    });
    setCargando(false);
    if (error) return setErr(textoError(error.message));
    setF({ ...f, mensaje: "", dias: "" });
    cargar();
  }
  async function elegir(id: string) {
    if (!confirm(t["cy.confirmar"])) return;
    setErr(""); setMsg("");
    const { error } = await crearCliente().rpc("coachya_elegir", { p_oferta: id });
    if (error) return setErr(textoError(error.message));
    setMsg(t["cy.okElegido"]);
    cargar();
  }
  async function cancelar(id: string) {
    setErr("");
    const { error } = await crearCliente().rpc("coachya_cancelar", { p_pedido: id });
    if (error) return setErr(textoError(error.message));
    cargar();
  }
  const fecha = (s: string) => new Date(s).toLocaleDateString(idioma);
  const tog = (m: string) => setF({ ...f, mods: f.mods.includes(m) ? f.mods.filter((x) => x !== m) : [...f.mods, m] });

  return (
    <div className="grid gap-6">
      <p className="text-suave">{t["cy.intro"]}</p>
      {err && <p className="aviso-error" role="alert">{err}</p>}
      {msg && <p className="aviso-ok" role="status">{msg}</p>}

      <form onSubmit={crear} className="tarjeta grid gap-3">
        <h2 className="text-xl">{t["cy.nuevo"]}</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">{t["cy.peso"]}<input className="campo" type="number" step="0.1" min="20" max="400" value={f.peso} onChange={(e) => setF({ ...f, peso: e.target.value })} /></label>
          <label className="grid gap-1 text-sm">{t["cy.estatura"]}<input className="campo" type="number" step="0.1" min="80" max="250" value={f.estatura} onChange={(e) => setF({ ...f, estatura: e.target.value })} /></label>
        </div>
        <label className="grid gap-1 text-sm">{t["cy.objetivo"]}
          <select className="campo" value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.value })}>
            {OBJ.map((o) => <option key={o} value={o}>{nomCat(t, "obj", o, o)}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">{t["cy.tiempo"]}
          <select className="campo" value={f.tiempo} onChange={(e) => setF({ ...f, tiempo: e.target.value })}>
            {TIEMPOS.map((o) => <option key={o} value={o}>{t[`cy.t.${o}` as keyof typeof t]}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">{t["cy.formato"]}
          <select className="campo" value={f.formato} onChange={(e) => setF({ ...f, formato: e.target.value })}>
            {FORMATOS.map((o) => <option key={o} value={o}>{t[`cy.f.${o}` as keyof typeof t]}</option>)}
          </select>
        </label>
        <fieldset className="grid gap-1 text-sm"><legend>{t["cy.modalidades"]}</legend>
          <div className="flex flex-wrap gap-2">
            {MODS.map((m) => (
              <label key={m} className={`cursor-pointer rounded-full border px-3 py-1 ${f.mods.includes(m) ? "border-lava text-lava" : "border-white/20"}`}>
                <input type="checkbox" className="sr-only" checked={f.mods.includes(m)} onChange={() => tog(m)} />{t[`cy.m.${m}` as keyof typeof t]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="grid gap-1 text-sm">{t["cy.ciudad"]}<input className="campo" maxLength={80} value={f.ciudad} onChange={(e) => setF({ ...f, ciudad: e.target.value })} /></label>
        <label className="grid gap-1 text-sm">{t["cy.dias"]}<input className="campo" maxLength={120} value={f.dias} onChange={(e) => setF({ ...f, dias: e.target.value })} /></label>
        <label className="grid gap-1 text-sm">{t["cy.max"]}
          <select className="campo" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })}>
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">{t["cy.mensaje"]}<textarea className="campo" rows={3} maxLength={600} value={f.mensaje} onChange={(e) => setF({ ...f, mensaje: e.target.value })} /></label>
        <p className="text-xs text-suave">{t["cy.privado"]}</p>
        <button className="btn btn-lava" disabled={cargando || f.mods.length === 0}>{t["cy.enviar"]}</button>
      </form>

      <section className="grid gap-3">
        <h2 className="text-xl">{t["cy.mis"]}</h2>
        {pedidos.length === 0 && <p className="text-suave">{t["cy.sinPedidos"]}</p>}
        {pedidos.map((p) => (
          <article key={p.id} className="tarjeta grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p><strong>{nomCat(t, "obj", p.objetivo, p.objetivo)}</strong> · <span className="text-dorado">{t[`cy.e.${p.estado}` as keyof typeof t]}</span></p>
              <p className="text-xs text-suave">{p.estado === "abierto" && rellenar(t["cy.vence"], { f: fecha(p.vence_en) })}</p>
            </div>
            <p className="text-sm text-suave">{rellenar(t["cy.ofertas"], { n: p.ofertas.length, m: p.max_ofertas })}</p>
            {p.ofertas.length === 0 && p.estado === "abierto" && <p className="text-sm text-suave">{t["cy.sinOfertas"]}</p>}
            {p.ofertas.map((o) => (
              <div key={o.id} className="rounded-lg border border-white/15 p-3 grid gap-1">
                <p className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{o.nombre}</strong>
                  <span>{t["cy.precio"]}: <strong>{o.precio} {o.moneda}</strong></span>
                </p>
                <p className="text-sm text-suave">{t[`cy.m.${o.modalidad}` as keyof typeof t] ?? o.modalidad}{o.ciudad ? ` · ${o.ciudad}` : ""}</p>
                {o.mensaje && <p className="text-sm">{o.mensaje}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href={`/e/${o.slug}`} className="btn btn-borde !py-1">{t["cy.ficha"]}</Link>
                  {p.estado === "abierto" && <button type="button" className="btn btn-lava !py-1" onClick={() => elegir(o.id)}>{t["cy.elegir"]}</button>}
                  {o.estado === "elegida" && <span className="text-dorado">{t["cy.elegida"]}</span>}
                  {o.estado === "descartada" && <span className="text-suave">{t["cy.descartada"]}</span>}
                </div>
              </div>
            ))}
            {p.estado === "abierto" && <button type="button" className="btn btn-borde !py-1 justify-self-start" onClick={() => cancelar(p.id)}>{t["cy.cancelar"]}</button>}
          </article>
        ))}
      </section>
    </div>
  );
}
