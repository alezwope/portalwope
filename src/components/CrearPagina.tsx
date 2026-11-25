"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";
import { TIPOS_PAGINA, type TipoPagina } from "@/lib/catalogos";
import SelectorUbicacion, { type Ubicacion } from "@/components/SelectorUbicacion";

export default function CrearPagina({ tipo }: { tipo: TipoPagina }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [ub, setUb] = useState<Ubicacion>({ pais: "", ciudad: "" });
  const [especialidad, setEspecialidad] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const info = TIPOS_PAGINA[tipo];

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (nombre.trim().length < 2) return setError("Escribe un nombre de al menos 2 caracteres.");
    setCargando(true);
    const { error } = await crearCliente().rpc("crear_pagina", {
      p_tipo: tipo,
      p_nombre: nombre,
      p_ciudad: ub.ciudad,
      p_pais: ub.pais,
      p_especialidad: especialidad,
    });
    setCargando(false);
    if (error) return setError(error.message);
    if (tipo === "entrenador") router.push("/panel/entrenador/escuela");
    router.refresh();
  }

  if (!abierto)
    return (
      <button type="button" onClick={() => setAbierto(true)} className="tarjeta grid gap-1 text-left hover:!border-lava">
        <span className="font-bold">{info.icono} Crear página de {info.nombre}</span>
        <span className="text-sm text-suave">{info.resumen}</span>
      </button>
    );

  return (
    <form onSubmit={crear} className="tarjeta grid gap-3">
      <p className="font-bold">{info.icono} Nueva página de {info.nombre}</p>
      <label className="grid gap-1 text-sm">
        Nombre público
        <input className="campo" required maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
      </label>
      {tipo === "wellness" && (
        <label className="grid gap-1 text-sm">
          Especialidad (ej.: nutrición, kinesiología)
          <input className="campo" maxLength={80} value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} />
        </label>
      )}
      <SelectorUbicacion valor={ub} onCambio={setUb} />
      {tipo === "wellness" && <p className="text-xs text-suave">Revisaremos tus credenciales antes de mostrar tu página.</p>}
      {tipo === "tienda" && <p className="text-xs text-suave">El catálogo de productos llega en la fase del marketplace.</p>}
      {error && <p className="aviso-error" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-lava" disabled={cargando}>{cargando ? "Creando…" : "Crear página"}</button>
        <button type="button" className="btn btn-borde" onClick={() => setAbierto(false)}>Cancelar</button>
      </div>
    </form>
  );
}
