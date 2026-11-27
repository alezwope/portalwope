"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";

export type MiembroEquipo = { alias: string; rol: string; permisos: string[] };

export default function AdminEquipo({ miembros, permisosDisponibles }: { miembros: MiembroEquipo[]; permisosDisponibles: Record<string, string> }) {
  const router = useRouter();
  const [alias, setAlias] = useState("");
  const [rol, setRol] = useState("moderador");
  const [permisos, setPermisos] = useState<Set<string>>(new Set(["moderar"]));
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  function cargar(m: MiembroEquipo) {
    setAlias(m.alias); setRol(m.rol); setPermisos(new Set(m.permisos)); setMsg(null);
  }
  function alternar(p: string) {
    const c = new Set(permisos);
    if (c.has(p)) c.delete(p); else c.add(p);
    setPermisos(c);
  }
  async function enviar(quitar: boolean) {
    const limpio = alias.trim().toLowerCase().replace(/^@/, "");
    if (!limpio) { setMsg({ ok: false, texto: "Escribe el alias." }); return; }
    const { error } = await crearCliente().rpc("admin_equipo", {
      p_alias: limpio, p_rol: quitar ? null : rol, p_permisos: quitar ? [] : [...permisos],
    });
    if (error) { setMsg({ ok: false, texto: error.message }); return; }
    setMsg({ ok: true, texto: quitar ? "Quitado del equipo." : "Guardado." });
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <section className="tarjeta overflow-x-auto">
        <h2 className="text-xl mb-1">Equipo</h2>
        <p className="mb-3 text-sm text-suave">Personas que te ayudan a administrar UniBars, cada una con permisos propios. Solo tú (administrador general) puedes cambiar esto.</p>
        {miembros.length === 0 ? <p className="text-sm text-suave">Todavía no hay equipo.</p> : (
          <table className="w-full text-left text-sm">
            <thead className="text-suave"><tr><th className="py-2">Persona</th><th>Rol</th><th>Permisos</th><th /></tr></thead>
            <tbody>
              {miembros.map((m) => (
                <tr key={m.alias} className="border-t border-borde align-top">
                  <td className="py-2">@{m.alias}</td>
                  <td>{m.rol}</td>
                  <td className="text-xs text-suave">{m.permisos.map((p) => permisosDisponibles[p] ?? p).join(" · ") || "—"}</td>
                  <td><button type="button" className="btn btn-borde !py-1" onClick={() => cargar(m)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="tarjeta grid gap-3">
        <h2 className="text-xl">Agregar o cambiar</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">Alias de la persona
            <input className="campo" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="@alias" />
          </label>
          <label className="grid gap-1 text-sm">Rol
            <select className="campo" value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="moderador">Moderador</option>
              <option value="editor">Editor</option>
            </select>
          </label>
        </div>
        <div className="grid gap-1 sm:grid-cols-2">
          {Object.entries(permisosDisponibles).map(([k, t]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={permisos.has(k)} onChange={() => alternar(k)} /> {t}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-lava" onClick={() => enviar(false)}>Guardar</button>
          <button type="button" className="btn btn-borde" onClick={() => enviar(true)}>Quitar del equipo</button>
          {msg && <span className={msg.ok ? "aviso-ok" : "aviso-error"}>{msg.texto}</span>}
        </div>
      </section>
    </div>
  );
}
