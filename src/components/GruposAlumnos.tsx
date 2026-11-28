"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/planes";
import AsignarPlan from "@/components/AsignarPlan";
import CerrarAsignacion from "@/components/CerrarAsignacion";

type Alumno = { persona_id: string; alias: string };
type Grupo = { id: string; nombre: string; miembros: string[]; asignaciones: { id: string; plan: string }[] };
type PlanMin = { id: string; nombre: string; orden_fijo: boolean };

export default function GruposAlumnos({ paginaId, alumnos, grupos, planes }: { paginaId: string; alumnos: Alumno[]; grupos: Grupo[]; planes: PlanMin[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | "nuevo" | null>(null);
  const [nombre, setNombre] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const alias = new Map(alumnos.map((a) => [a.persona_id, a.alias]));

  function abrir(g: Grupo | null) {
    setEditando(g ? g.id : "nuevo");
    setNombre(g?.nombre ?? "");
    setSel(g?.miembros ?? []);
    setError("");
  }
  async function guardar() {
    setCargando(true);
    const { error } = await crearCliente().rpc("grupo_guardar", { p_pagina: paginaId, p_grupo: editando === "nuevo" ? null : editando, p_nombre: nombre, p_miembros: sel });
    setCargando(false);
    if (error) return setError(mensajeError(error.message));
    setEditando(null);
    router.refresh();
  }
  async function borrar(id: string) {
    if (!window.confirm("¿Borrar este grupo? Sus asignaciones también se quitan (el historial de cada persona se conserva en su registro).")) return;
    await crearCliente().rpc("grupo_borrar", { p_grupo: id });
    router.refresh();
  }

  const formulario = (
    <div className="tarjeta grid gap-3">
      <input className="campo" maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del grupo (Ej.: Principiantes lunes)" />
      {alumnos.length === 0 ? (
        <p className="text-sm text-suave">Todavía no tienes alumnos para sumar.</p>
      ) : (
        <ul className="grid gap-1 sm:grid-cols-2">
          {alumnos.map((a) => (
            <li key={a.persona_id}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={sel.includes(a.persona_id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, a.persona_id] : s.filter((x) => x !== a.persona_id)))} />
                @{a.alias}
              </label>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="aviso-error" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn btn-lava" onClick={guardar} disabled={cargando}>Guardar grupo</button>
        <button type="button" className="btn btn-borde" onClick={() => setEditando(null)}>Cancelar</button>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4">
      {editando === "nuevo" ? formulario : <button type="button" className="btn btn-lava justify-self-start" onClick={() => abrir(null)}>+ Nuevo grupo</button>}
      {grupos.length === 0 && editando !== "nuevo" && <p className="tarjeta text-suave">Aún no tienes grupos. Un grupo recibe el mismo plan y cada integrante lo hace por su cuenta.</p>}
      <ul className="grid gap-3 md:grid-cols-2">
        {grupos.map((g) => (
          <li key={g.id} className="tarjeta grid gap-3">
            {editando === g.id ? formulario : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{g.nombre}</p>
                    <p className="text-sm text-suave">{g.miembros.map((m) => `@${alias.get(m) ?? "alumno"}`).join(", ") || "Sin integrantes"}</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="btn btn-borde !px-2 !py-1 text-xs" onClick={() => abrir(g)}>Editar</button>
                    <button type="button" className="btn btn-borde !px-2 !py-1 text-xs" onClick={() => borrar(g.id)}>Borrar</button>
                  </div>
                </div>
                {g.asignaciones.length > 0 && (
                  <ul className="grid gap-1 text-sm">
                    {g.asignaciones.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2"><span>📋 {a.plan}</span><CerrarAsignacion id={a.id} /></li>
                    ))}
                  </ul>
                )}
                <details>
                  <summary className="cursor-pointer text-sm text-lava">Asignar un plan al grupo</summary>
                  <div className="mt-2"><AsignarPlan planes={planes} grupoId={g.id} /></div>
                </details>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
