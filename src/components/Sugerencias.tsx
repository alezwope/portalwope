"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTextos } from "@/components/Idioma";
import type { ClaveTexto } from "@/lib/i18n/diccionarios";
import { crearCliente } from "@/lib/supabase/client";

export type SugerenciaPublica = {
  id: string; titulo: string; texto: string; categoria: string; estado: string; respuesta: string | null;
  votos_favor: number; votos_contra: number; mio: number; propia: boolean;
};

function Item({ s, categorias }: { s: SugerenciaPublica; categorias: Record<string, string> }) {
  const router = useRouter();
  const { t } = useTextos();
  const [err, setErr] = useState<string | null>(null);

  async function votar(v: 1 | -1) {
    const nuevo = s.mio === v ? 0 : v;
    const { error } = await crearCliente().rpc("votar_sugerencia", { p_id: s.id, p_voto: nuevo });
    if (error) { setErr(error.message); return; }
    setErr(null); router.refresh();
  }

  return (
    <li className="tarjeta grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg">{s.titulo}</h3>
        <span className="rounded-full border border-borde px-2 py-0.5 text-xs">{t[`sug.${s.estado}` as ClaveTexto] ?? s.estado}</span>
      </div>
      <p className="text-xs text-suave">{categorias[s.categoria] ?? s.categoria}{s.propia ? t["sug.tuya"] : ""}</p>
      <p className="whitespace-pre-wrap">{s.texto}</p>
      {s.respuesta && <p className="rounded border border-borde p-2 text-sm"><strong>{t["sug.respuesta"]}</strong> {s.respuesta}</p>}
      <div className="flex items-center gap-2">
        <button type="button" className={`btn ${s.mio === 1 ? "btn-lava" : "btn-borde"} !py-1`} onClick={() => votar(1)} aria-pressed={s.mio === 1}>👍 {s.votos_favor}</button>
        <button type="button" className={`btn ${s.mio === -1 ? "btn-lava" : "btn-borde"} !py-1`} onClick={() => votar(-1)} aria-pressed={s.mio === -1}>👎 {s.votos_contra}</button>
        {err && <span className="text-xs text-lava">{err}</span>}
      </div>
    </li>
  );
}

export default function Sugerencias({ lista, categorias }: { lista: SugerenciaPublica[]; categorias: Record<string, string> }) {
  const router = useRouter();
  const { t } = useTextos();
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState("otra");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await crearCliente().rpc("sugerir", { p_titulo: titulo.trim(), p_texto: texto.trim(), p_categoria: categoria });
    if (error) { setMsg({ ok: false, texto: error.message }); return; }
    setTitulo(""); setTexto(""); setMsg({ ok: true, texto: t["sug.gracias"] });
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="titulo text-2xl">{t["sug.titulo"]}</h1>
        <p className="text-suave">{t["sug.intro"]}</p>
      </div>
      <form onSubmit={enviar} className="tarjeta grid gap-3">
        <h2 className="text-lg">{t["sug.proponer"]}</h2>
        <input className="campo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={t["sug.tituloPh"]} minLength={3} maxLength={120} required />
        <textarea className="campo" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={t["sug.ideaPh"]} minLength={3} maxLength={2000} required />
        <select className="campo" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label={t["sug.categoria"]}>
          {Object.entries(categorias).map(([k, c]) => <option key={k} value={k}>{c}</option>)}
        </select>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-lava">{t["sug.enviar"]}</button>
          {msg && <span className={msg.ok ? "aviso-ok" : "aviso-error"}>{msg.texto}</span>}
        </div>
      </form>
      {lista.length === 0 ? <p className="tarjeta text-suave">{t["sug.vacio"]}</p> : (
        <ul className="grid gap-3">{lista.map((s) => <Item key={s.id} s={s} categorias={categorias} />)}</ul>
      )}
    </div>
  );
}
