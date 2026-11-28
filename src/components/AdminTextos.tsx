"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { guardarTexto } from "@/app/admin/textos/acciones";

type Fila = { clave: string; fabrica: string; editado: string | null };

function FilaTexto({ f, idioma }: { f: Fila; idioma: string }) {
  const [valor, setValor] = useState(f.editado ?? f.fabrica);
  const [editado, setEditado] = useState(f.editado !== null);
  const [estado, setEstado] = useState<"" | "ok" | "error">("");
  const [detalle, setDetalle] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function enviar(nuevo: string) {
    setOcupado(true);
    const r = await guardarTexto(f.clave, idioma, nuevo);
    setOcupado(false);
    if (!r.ok) { setEstado("error"); setDetalle(r.error ?? "Error"); return false; }
    setEstado("ok");
    return true;
  }

  async function guardar() {
    // Si queda igual al de fábrica, no hace falta guardar una copia.
    const igual = valor === f.fabrica;
    if (await enviar(igual ? "" : valor)) setEditado(!igual);
  }
  async function restaurar() {
    if (await enviar("")) { setValor(f.fabrica); setEditado(false); }
  }

  const largo = valor.length > 70 || f.fabrica.length > 70;
  return (
    <tr className="border-t border-borde align-top">
      <td className="py-2 pr-2">
        <p className="font-mono text-xs">{f.clave}</p>
        {editado && <span className="text-xs text-dorado">editado</span>}
      </td>
      <td className="px-2">
        {largo ? (
          <textarea className="campo !py-1" rows={3} value={valor} aria-label={f.clave}
            onChange={(e) => { setValor(e.target.value); setEstado(""); }} />
        ) : (
          <input className="campo !py-1" value={valor} aria-label={f.clave}
            onChange={(e) => { setValor(e.target.value); setEstado(""); }} />
        )}
        {estado === "error" && <p className="mt-1 text-xs text-lava">{detalle}</p>}
      </td>
      <td className="whitespace-nowrap px-2">
        <button type="button" className="btn btn-borde !py-1" disabled={ocupado} onClick={guardar}>Guardar</button>
        {editado && <button type="button" className="btn btn-borde ml-1 !py-1" disabled={ocupado} onClick={restaurar} title="Volver al texto de fábrica">↺</button>}
        {estado === "ok" && <span className="ml-2 text-xs text-suave">✓</span>}
      </td>
    </tr>
  );
}

export default function AdminTextos({ idioma, idiomas, filas }: { idioma: string; idiomas: string[]; filas: Fila[] }) {
  const [q, setQ] = useState("");
  const visibles = useMemo(() => {
    const b = q.trim().toLowerCase();
    return b ? filas.filter((f) => f.clave.toLowerCase().includes(b) || f.fabrica.toLowerCase().includes(b) || (f.editado ?? "").toLowerCase().includes(b)) : filas;
  }, [q, filas]);

  return (
    <section className="tarjeta overflow-x-auto">
      <h2 className="text-xl mb-1">Textos y traducciones</h2>
      <p className="mb-3 text-sm text-suave">
        Cambia cualquier texto de UniBars en cada idioma. Se ve al instante. «↺» vuelve al texto de fábrica. Respeta los marcadores como {"{alias}"}.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {idiomas.map((i) => (
          <Link key={i} href={`/admin/textos?idioma=${i}`} className={`btn !py-1 ${i === idioma ? "btn-lava" : "btn-borde"}`}>{i.toUpperCase()}</Link>
        ))}
        <input className="campo max-w-xs !py-1" placeholder="Buscar texto o clave…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar texto" />
        <span className="text-xs text-suave">{visibles.length} de {filas.length}</span>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="text-suave"><tr><th className="py-2">Clave</th><th>Texto</th><th /></tr></thead>
        <tbody>{visibles.map((f) => <FilaTexto key={f.clave} f={f} idioma={idioma} />)}</tbody>
      </table>
    </section>
  );
}
