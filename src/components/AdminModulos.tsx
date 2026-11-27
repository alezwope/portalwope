"use client";

import { useState } from "react";
import { crearCliente } from "@/lib/supabase/client";

export type Modulo = { clave: string; nombre: string; descripcion: string | null; etapa: number; activo: boolean; paises: string[] | null };

function Fila({ m }: { m: Modulo }) {
  const [activo, setActivo] = useState(m.activo);
  const [paises, setPaises] = useState((m.paises ?? []).join(", "));
  const [estado, setEstado] = useState<"" | "ok" | "error">("");
  const [detalle, setDetalle] = useState("");

  async function guardar(nuevoActivo: boolean, textoPaises: string) {
    const lista = textoPaises.split(/[,\s]+/).map((p) => p.trim().toUpperCase()).filter(Boolean);
    const { error } = await crearCliente().rpc("admin_modulo", {
      p_clave: m.clave, p_activo: nuevoActivo, p_paises: lista.length ? lista : null,
    });
    if (error) { setEstado("error"); setDetalle(error.message); return false; }
    setEstado("ok");
    return true;
  }

  async function alternar() {
    const nuevo = !activo;
    setActivo(nuevo);
    if (!(await guardar(nuevo, paises))) setActivo(!nuevo);
  }

  return (
    <tr className="border-t border-borde align-top">
      <td className="py-2 pr-2">
        <p>{m.nombre}</p>
        {m.descripcion && <p className="text-xs text-suave">{m.descripcion}</p>}
      </td>
      <td className="px-2">Etapa {m.etapa}</td>
      <td className="px-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={activo} onChange={alternar} aria-label={`Activar ${m.nombre}`} />
          {activo ? "Activo" : "Apagado"}
        </label>
      </td>
      <td className="px-2">
        <div className="flex items-center gap-2">
          <input className="campo !w-40 !py-1" value={paises} onChange={(e) => setPaises(e.target.value)} placeholder="Todos (AR, CL…)" aria-label={`Países de ${m.nombre}`} />
          <button type="button" className="btn btn-borde !py-1" onClick={() => guardar(activo, paises)}>Guardar</button>
          {estado === "ok" && <span className="text-xs text-suave">✓</span>}
          {estado === "error" && <span className="text-xs text-lava">{detalle || "Error"}</span>}
        </div>
      </td>
    </tr>
  );
}

export default function AdminModulos({ modulos }: { modulos: Modulo[] }) {
  return (
    <section className="tarjeta overflow-x-auto">
      <h2 className="text-xl mb-1">Módulos</h2>
      <p className="mb-3 text-sm text-suave">Enciende o apaga funciones completas. Si pones países (códigos de 2 letras), el módulo solo funciona allí.</p>
      <table className="w-full text-left text-sm">
        <thead className="text-suave"><tr><th className="py-2">Módulo</th><th>Etapa</th><th>Estado</th><th>Países</th></tr></thead>
        <tbody>{modulos.map((m) => <Fila key={m.clave} m={m} />)}</tbody>
      </table>
    </section>
  );
}
