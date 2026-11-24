"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";

export default function FormularioEscuela() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [pais, setPais] = useState("AR");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (nombre.trim().length < 3) return setError("El nombre de la escuela debe tener al menos 3 caracteres.");
    setCargando(true);
    const { error } = await crearCliente().rpc("crear_escuela", { p_nombre: nombre, p_ciudad: ciudad, p_pais: pais });
    setCargando(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  return (
    <form onSubmit={crear} className="grid gap-3 max-w-lg">
      <label className="grid gap-1 text-sm">
        Nombre de tu escuela
        <input className="campo" required value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} />
      </label>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <label className="grid gap-1 text-sm">
          Ciudad
          <input className="campo" value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          País
          <input className="campo uppercase" value={pais} onChange={(e) => setPais(e.target.value.slice(0, 2))} maxLength={2} aria-label="Código de país, dos letras" />
        </label>
      </div>
      {error && <p className="aviso-error" role="alert">{error}</p>}
      <button className="btn btn-lava" disabled={cargando}>{cargando ? "Creando…" : "Crear escuela"}</button>
    </form>
  );
}
