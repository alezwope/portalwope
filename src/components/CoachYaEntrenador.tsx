"use client";

import { useCallback, useEffect, useState } from "react";
import { crearCliente } from "@/lib/supabase/client";

type Pedido = { id: string; peso_kg: number | null; estatura_cm: number | null; objetivo: string; tiempo: string; formato: string; modalidades: string[]; ciudad: string | null; pais: string | null; dias: string | null; mensaje: string | null; max_ofertas: number; ofertas: number; vence_en: string; cupo: boolean };
type Mia = { id: string; objetivo: string; precio: number; moneda: string; modalidad: string; estado: string };

const OBJ: Record<string, string> = { fuerza: "Ganar fuerza", habilidades: "Aprender habilidades", salud: "Salud y bienestar", masa_muscular: "Ganar masa muscular", bajar_grasa: "Bajar grasa", movilidad: "Mejorar movilidad" };
const TIEMPO: Record<string, string> = { nunca: "Nunca ha entrenado", menos_6m: "Menos de 6 meses", "6m_2a": "6 meses a 2 años", mas_2a: "Más de 2 años" };
const MOD: Record<string, string> = { presencial_individual: "Presencial individual", presencial_grupal: "Presencial grupal", domicilio: "A domicilio", distancia_individual: "A distancia individual", distancia_grupal: "A distancia grupal" };
const ERR: Record<string, string> = { pedido_cerrado: "El pedido ya no está abierto.", pedido_lleno: "El pedido ya recibió todas las ofertas.", ya_ofertaste: "Ya enviaste una oferta.", sin_cupo: "Sin cupo gratuito: amplía tu plan para recibir más alumnos.", sin_permiso: "No tienes permiso." };

function Fila({ p, paginaId, alEnviar }: { p: Pedido; paginaId: string; alEnviar: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [precio, setPrecio] = useState("");
  const [moneda, setMoneda] = useState("USD");
  const [mod, setMod] = useState(p.modalidades[0] ?? "distancia_individual");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const { error } = await crearCliente().rpc("coachya_ofertar", { p_pedido: p.id, p_pagina: paginaId, p_precio: Number(precio), p_moneda: moneda, p_modalidad: mod, p_mensaje: msg });
    if (error) return setErr(ERR[error.message] ?? "No se pudo enviar.");
    alEnviar();
  }
  return (
    <article className="tarjeta grid gap-2">
      <p><strong>{OBJ[p.objetivo] ?? p.objetivo}</strong> · {TIEMPO[p.tiempo]} · {p.formato}</p>
      <p className="text-sm text-suave">
        {p.peso_kg ? `${p.peso_kg} kg` : ""}{p.estatura_cm ? ` · ${p.estatura_cm} cm` : ""}{p.ciudad ? ` · ${p.ciudad}` : ""}{p.dias ? ` · ${p.dias}` : ""}
      </p>
      <p className="text-sm">{p.modalidades.map((m) => MOD[m] ?? m).join(", ")}</p>
      {p.mensaje && <p className="text-sm">“{p.mensaje}”</p>}
      <p className="text-xs text-suave">Ofertas: {p.ofertas} de {p.max_ofertas} · vence {new Date(p.vence_en).toLocaleDateString()}</p>
      {!abierto && <button className="btn btn-lava !py-1 justify-self-start" disabled={!p.cupo} onClick={() => setAbierto(true)}>{p.cupo ? "Enviar oferta" : "Sin cupo gratuito"}</button>}
      {abierto && (
        <form onSubmit={enviar} className="grid gap-2">
          <div className="grid grid-cols-3 gap-2">
            <label className="col-span-2 grid gap-1 text-sm">Precio por mes<input className="campo" type="number" min="0" step="0.01" required value={precio} onChange={(e) => setPrecio(e.target.value)} /></label>
            <label className="grid gap-1 text-sm">Moneda<input className="campo" maxLength={4} value={moneda} onChange={(e) => setMoneda(e.target.value)} /></label>
          </div>
          <label className="grid gap-1 text-sm">Modalidad que ofreces
            <select className="campo" value={mod} onChange={(e) => setMod(e.target.value)}>{Object.entries(MOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
          <label className="grid gap-1 text-sm">Mensaje<textarea className="campo" rows={3} maxLength={600} value={msg} onChange={(e) => setMsg(e.target.value)} /></label>
          <p className="text-xs text-suave">El pago se acuerda fuera de UniBars.</p>
          {err && <p className="aviso-error" role="alert">{err}</p>}
          <button className="btn btn-lava">Enviar oferta</button>
        </form>
      )}
    </article>
  );
}

export default function CoachYaEntrenador({ paginaId }: { paginaId: string }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [mias, setMias] = useState<Mia[]>([]);
  const [listo, setListo] = useState(false);
  const cargar = useCallback(async () => {
    const c = crearCliente();
    const [a, b] = await Promise.all([c.rpc("coachya_pedidos_para_mi", { p_pagina: paginaId }), c.rpc("coachya_mis_ofertas", { p_pagina: paginaId })]);
    setPedidos((a.data ?? []) as Pedido[]); setMias((b.data ?? []) as Mia[]); setListo(true);
  }, [paginaId]);
  useEffect(() => { cargar(); }, [cargar]);
  const EST: Record<string, string> = { enviada: "Enviada", elegida: "¡Te eligieron!", descartada: "Eligieron a otro" };
  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <h2 className="text-xl">Pedidos abiertos</h2>
        {listo && pedidos.length === 0 && <p className="text-suave">No hay pedidos nuevos en tu zona por ahora.</p>}
        {pedidos.map((p) => <Fila key={p.id} p={p} paginaId={paginaId} alEnviar={cargar} />)}
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl">Mis ofertas</h2>
        {listo && mias.length === 0 && <p className="text-suave">Aún no enviaste ofertas.</p>}
        {mias.map((o) => (
          <div key={o.id} className="tarjeta flex flex-wrap justify-between gap-2 !py-2">
            <span>{OBJ[o.objetivo] ?? o.objetivo} · {o.precio} {o.moneda} · {MOD[o.modalidad] ?? o.modalidad}</span>
            <span className={o.estado === "elegida" ? "text-dorado" : "text-suave"}>{EST[o.estado]}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
