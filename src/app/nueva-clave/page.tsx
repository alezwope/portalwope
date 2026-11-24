"use client";

import { useState } from "react";
import Cabecera from "@/components/Cabecera";
import { crearCliente } from "@/lib/supabase/client";

export default function NuevaClave() {
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (clave.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    setCargando(true);
    const { error } = await crearCliente().auth.updateUser({ password: clave });
    if (error) {
      setError("No pudimos cambiar la contraseña. Pide un enlace nuevo e inténtalo otra vez.");
      setCargando(false);
    } else window.location.assign("/panel");
  }

  return (
    <>
      <Cabecera />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <form onSubmit={guardar} className="tarjeta grid w-full max-w-md gap-3">
          <h1 className="text-2xl">Crea tu contraseña nueva</h1>
          <label className="grid gap-1 text-sm">
            Contraseña nueva (mínimo 8 caracteres)
            <input className="campo" type="password" required minLength={8} autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} />
          </label>
          {error && <p className="aviso-error" role="alert">{error}</p>}
          <button className="btn btn-lava" disabled={cargando}>{cargando ? "Guardando…" : "Guardar contraseña"}</button>
        </form>
      </main>
    </>
  );
}
