"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";
import { nivelDe } from "@/lib/catalogos";
import { mensajeError, type MisAmigos, type Persona, type Relacion } from "@/lib/social";
import Avatar from "@/components/Avatar";

function Fila({ p, children }: { p: Persona; children?: React.ReactNode }) {
  const nv = nivelDe(p.nivel);
  return (
    <li className="flex items-center gap-3 rounded-lg border border-borde p-2">
      <Avatar alias={p.alias} url={p.avatar_url} nivel={p.nivel} tam={36} />
      <Link href={`/panel/u/${p.alias}`} className="min-w-0 flex-1 truncate font-bold hover:text-lava">
        @{p.alias}
        {nv && <span className="ml-2 text-xs font-normal" style={{ color: nv.color }}>{nv.nombre}</span>}
        {p.ciudad && <span className="ml-2 text-xs font-normal text-suave">{p.ciudad}</span>}
      </Link>
      {children}
    </li>
  );
}

export default function Amigos({ inicial }: { inicial: MisAmigos }) {
  const router = useRouter();
  const [datos, setDatos] = useState(inicial);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Persona[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function recargar() {
    const { data } = await crearCliente().rpc("mis_amigos");
    if (data) setDatos(data as MisAmigos);
    router.refresh();
  }
  async function llamar(fn: string, args: Record<string, unknown>, ok?: string) {
    setMsg(null);
    const { error } = await crearCliente().rpc(fn, args);
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    if (ok) setMsg({ ok: true, texto: ok });
    await recargar();
  }
  async function buscar(ev: React.FormEvent) {
    ev.preventDefault();
    setMsg(null);
    const { data, error } = await crearCliente().rpc("buscar_personas", { p_q: q });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    setResultados((data ?? []) as Persona[]);
  }

  const yaRelacionados = new Set([...datos.amigos, ...datos.recibidas, ...datos.enviadas].map((r: Relacion) => r.persona.id));

  return (
    <section id="amigos" className="grid gap-4 scroll-mt-20">
      <h2 className="text-2xl">Compañeros de barra</h2>

      <form onSubmit={buscar} className="flex flex-wrap gap-2">
        <input className="campo max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca por alias (mín. 2 letras)" aria-label="Buscar personas por alias" />
        <button className="btn btn-borde" disabled={q.trim().length < 2}>Buscar</button>
      </form>
      {msg && <p className={msg.ok ? "aviso-ok" : "aviso-error"} role="status">{msg.texto}</p>}

      {resultados && (
        resultados.length === 0 ? (
          <p className="text-suave">No encontramos a nadie con ese alias.</p>
        ) : (
          <ul className="grid gap-2">
            {resultados.map((p) => (
              <Fila key={p.id} p={p}>
                {yaRelacionados.has(p.id) ? (
                  <span className="text-xs text-suave">Ya en tu lista</span>
                ) : (
                  <button className="btn btn-lava !py-1 text-sm" onClick={() => llamar("amistad_enviar", { p_destino: p.id }, "Solicitud enviada ✓")}>Agregar</button>
                )}
              </Fila>
            ))}
          </ul>
        )
      )}

      {datos.recibidas.length > 0 && (
        <div className="grid gap-2">
          <h3 className="text-lg">Solicitudes para ti</h3>
          <ul className="grid gap-2">
            {datos.recibidas.map((r) => (
              <Fila key={r.amistad_id} p={r.persona}>
                <button className="btn btn-lava !py-1 text-sm" onClick={() => llamar("amistad_resolver", { p_id: r.amistad_id, p_aceptar: true })}>Aceptar</button>
                <button className="btn btn-borde !py-1 text-sm" onClick={() => llamar("amistad_resolver", { p_id: r.amistad_id, p_aceptar: false })}>Rechazar</button>
              </Fila>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-2">
        <h3 className="text-lg">Tus compañeros ({datos.amigos.length})</h3>
        {datos.amigos.length === 0 ? (
          <p className="text-suave">Aún no tienes compañeros. Busca a quien entrena contigo y agrégalo.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {datos.amigos.map((r) => (
              <Fila key={r.amistad_id} p={r.persona}>
                <button className="text-xs text-suave hover:text-lava" onClick={() => llamar("amistad_quitar", { p_otro: r.persona.id })}>Quitar</button>
              </Fila>
            ))}
          </ul>
        )}
      </div>

      {datos.enviadas.length > 0 && (
        <div className="grid gap-2">
          <h3 className="text-lg">Solicitudes enviadas</h3>
          <ul className="grid gap-2">
            {datos.enviadas.map((r) => (
              <Fila key={r.amistad_id} p={r.persona}>
                <button className="text-xs text-suave hover:text-lava" onClick={() => llamar("amistad_quitar", { p_otro: r.persona.id })}>Cancelar</button>
              </Fila>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
