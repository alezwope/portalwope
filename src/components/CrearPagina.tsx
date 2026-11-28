"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTextos } from "@/components/Idioma";
import { crearCliente } from "@/lib/supabase/client";
import { TIPOS_PAGINA, type TipoPagina } from "@/lib/catalogos";
import SelectorUbicacion, { type Ubicacion } from "@/components/SelectorUbicacion";

export default function CrearPagina({ tipo, abiertoInicial = false }: { tipo: TipoPagina; abiertoInicial?: boolean }) {
  const router = useRouter();
  const { t } = useTextos();
  const [abierto, setAbierto] = useState(abiertoInicial);
  const [nombre, setNombre] = useState("");
  const [ub, setUb] = useState<Ubicacion>({ pais: "", ciudad: "" });
  const [especialidad, setEspecialidad] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const info = TIPOS_PAGINA[tipo];

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (nombre.trim().length < 2) return setError(t["pag.errNombre"]);
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
        <span className="font-bold">{info.icono} {t["pag.crearDe"]} {info.nombre}</span>
        <span className="text-sm text-suave">{info.resumen}</span>
      </button>
    );

  return (
    <form onSubmit={crear} className="tarjeta grid gap-3">
      <p className="font-bold">{info.icono} {t["pag.nuevaDe"]} {info.nombre}</p>
      <label className="grid gap-1 text-sm">
        {t["pag.nombre"]}
        <input className="campo" required maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
      </label>
      {tipo === "wellness" && (
        <label className="grid gap-1 text-sm">
          {t["pag.especialidad"]}
          <input className="campo" maxLength={80} value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} />
        </label>
      )}
      <SelectorUbicacion valor={ub} onCambio={setUb} />
      {tipo === "wellness" && <p className="text-xs text-suave">{t["pag.revisamos"]}</p>}
      {tipo === "tienda" && <p className="text-xs text-suave">{t["pag.catalogo"]}</p>}
      {error && <p className="aviso-error" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-lava" disabled={cargando}>{cargando ? t["pag.creando"] : t["pag.crear"]}</button>
        <button type="button" className="btn btn-borde" onClick={() => setAbierto(false)}>{t["comun.cancelar"]}</button>
      </div>
    </form>
  );
}
