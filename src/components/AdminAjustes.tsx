"use client";

import { useState } from "react";
import { crearCliente } from "@/lib/supabase/client";

export type Ajuste = { clave: string; valor: unknown; descripcion: string | null; publico: boolean };

function Fila({ a }: { a: Ajuste }) {
  const [texto, setTexto] = useState(JSON.stringify(a.valor));
  const [estado, setEstado] = useState<"" | "ok" | "error">("");
  const [detalle, setDetalle] = useState("");

  async function guardar() {
    let valor: unknown;
    try { valor = JSON.parse(texto); } catch { setEstado("error"); setDetalle("Formato inválido. Números: 100 · texto: \"es\" · lista: [\"es\",\"en\"]"); return; }
    const { error } = await crearCliente().rpc("admin_ajuste", { p_clave: a.clave, p_valor: valor });
    if (error) { setEstado("error"); setDetalle(error.message); return; }
    setEstado("ok");
  }

  return (
    <tr className="border-t border-borde align-top">
      <td className="py-2 pr-2">
        <p className="font-mono text-xs">{a.clave}</p>
        {a.descripcion && <p className="text-xs text-suave">{a.descripcion}</p>}
      </td>
      <td className="px-2">
        <input className="campo !py-1" value={texto} onChange={(e) => { setTexto(e.target.value); setEstado(""); }} aria-label={`Valor de ${a.clave}`} />
        {estado === "error" && <p className="mt-1 text-xs text-lava">{detalle}</p>}
      </td>
      <td className="px-2">
        <button type="button" className="btn btn-borde !py-1" onClick={guardar}>Guardar</button>
        {estado === "ok" && <span className="ml-2 text-xs text-suave">✓</span>}
      </td>
    </tr>
  );
}

export default function AdminAjustes({ ajustes }: { ajustes: Ajuste[] }) {
  return (
    <section className="tarjeta overflow-x-auto">
      <h2 className="text-xl mb-1">Ajustes</h2>
      <p className="mb-3 text-sm text-suave">Números y reglas de la red (límites, edades mínimas, vencimientos). Cada cambio queda en el historial.</p>
      <table className="w-full text-left text-sm">
        <thead className="text-suave"><tr><th className="py-2">Ajuste</th><th>Valor</th><th /></tr></thead>
        <tbody>{ajustes.map((a) => <Fila key={a.clave} a={a} />)}</tbody>
      </table>
    </section>
  );
}
