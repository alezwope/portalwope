"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { crearCliente } from "@/lib/supabase/client";
import { hace, mensajeError } from "@/lib/social";
import { useTextos } from "@/components/Idioma";
import Avatar from "@/components/Avatar";

type Datos = {
  otro: { id: string; alias: string; avatar_url: string | null; nivel: string | null };
  puede: boolean;
  mensajes: { id: string; mio: boolean; texto: string; creado_en: string }[];
};

export default function Chat({ alias }: { alias: string }) {
  const { t, idioma } = useTextos();
  const [d, setD] = useState<Datos | null | undefined>(undefined);
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const fin = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    const { data, error } = await crearCliente().rpc("mensajes_con", { p_alias: alias });
    if (error) return setMsg(mensajeError(error));
    setD((data as Datos | null) ?? null);
  }, [alias]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    const id = setInterval(() => { if (!document.hidden) cargar(); }, 15000);
    return () => clearInterval(id);
  }, [cargar]);
  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" });
  }, [d?.mensajes.length]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!d || !texto.trim()) return;
    setMsg(null);
    const { error } = await crearCliente().rpc("enviar_mensaje", { p_a: d.otro.id, p_texto: texto });
    if (error) return setMsg(mensajeError(error));
    setTexto("");
    await cargar();
  }

  if (d === undefined) return <p className="tarjeta text-suave">{msg ?? t["crw.cargando"]}</p>;
  if (d === null) return <div className="tarjeta grid gap-2"><p>{t["msg.noEncontrado"]}</p><Link href="/panel/mensajes" className="btn btn-borde justify-self-start">{t["msg.volver"]}</Link></div>;

  return (
    <div className="grid gap-3">
      <Link href="/panel/mensajes" className="text-sm text-suave hover:text-lava">{t["msg.volver"]}</Link>
      <header className="tarjeta flex items-center gap-3 !py-2">
        <Avatar alias={d.otro.alias} url={d.otro.avatar_url} nivel={d.otro.nivel} />
        <Link href={`/panel/u/${d.otro.alias}`} className="font-bold hover:text-lava">@{d.otro.alias}</Link>
      </header>
      <ul className="tarjeta grid max-h-[55dvh] gap-2 overflow-y-auto" aria-live="polite">
        {d.mensajes.length === 0 && <li className="text-suave">{t["msg.primero"]}</li>}
        {d.mensajes.map((m) => (
          <li key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.mio ? "ml-auto bg-lava text-white" : "border border-borde"}`}>
            <p className="whitespace-pre-wrap break-words">{m.texto}</p>
            <p className={`text-[10px] ${m.mio ? "text-white/70" : "text-suave"}`}>{hace(m.creado_en, idioma)}</p>
          </li>
        ))}
        <div ref={fin} />
      </ul>
      {msg && <p className="aviso-error" role="alert">{msg}</p>}
      {d.puede ? (
        <form onSubmit={enviar} className="flex gap-2">
          <input className="campo flex-1" maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={t["msg.placeholder"]} aria-label={t["msg.placeholder"]} />
          <button className="btn btn-lava" disabled={!texto.trim()}>{t["msg.enviar"]}</button>
        </form>
      ) : (
        <p className="tarjeta text-suave">{t["msg.sinChat"]}</p>
      )}
    </div>
  );
}
