"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";
import type { Perfil } from "@/lib/sesion";

export default function FormularioPerfil({ perfil }: { perfil: Perfil }) {
  const router = useRouter();
  const [alias, setAlias] = useState(perfil.alias ?? "");
  const [nombre, setNombre] = useState(perfil.nombre ?? "");
  const [bio, setBio] = useState(perfil.bio ?? "");
  const [ciudad, setCiudad] = useState(perfil.ciudad ?? "");
  const [pais, setPais] = useState(perfil.pais ?? "");
  const [invisible, setInvisible] = useState(perfil.modo_invisible);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk(false);
    const a = alias.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(a)) return setError("El alias debe tener de 3 a 20 caracteres: letras sin tilde, números o guion bajo.");
    setCargando(true);
    const { error } = await crearCliente()
      .from("profiles")
      .update({
        alias: a,
        nombre: nombre.trim() || null,
        bio: bio.trim() || null,
        ciudad: ciudad.trim() || null,
        pais: pais.trim().toUpperCase() || null,
        modo_invisible: invisible,
      })
      .eq("id", perfil.id);
    setCargando(false);
    if (error) setError(error.message.includes("profiles_alias_key") ? "Ese alias ya está en uso. Elige otro." : "No pudimos guardar los cambios.");
    else {
      setOk(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={guardar} className="tarjeta grid gap-3">
      <label className="grid gap-1 text-sm">
        Alias
        <input className="campo" required value={alias} onChange={(e) => setAlias(e.target.value)} />
      </label>
      <label className="grid gap-1 text-sm">
        Nombre (privado)
        <input className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label className="grid gap-1 text-sm">
        Sobre ti
        <textarea className="campo" rows={3} maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} />
      </label>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <label className="grid gap-1 text-sm">
          Ciudad
          <input className="campo" value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          País
          <input className="campo uppercase" maxLength={2} value={pais} onChange={(e) => setPais(e.target.value)} />
        </label>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={invisible} onChange={(e) => setInvisible(e.target.checked)} className="mt-1 accent-[var(--lava)]" />
        <span>Modo invisible: no aparecer en búsquedas ni listados de la comunidad.</span>
      </label>
      {error && <p className="aviso-error" role="alert">{error}</p>}
      {ok && <p className="aviso-ok" role="status">Cambios guardados ✓</p>}
      <button className="btn btn-lava" disabled={cargando}>{cargando ? "Guardando…" : "Guardar cambios"}</button>
    </form>
  );
}
