"use client";

import { useState } from "react";
import { crearCliente } from "@/lib/supabase/client";
import { ROLES, ROLES_ELEGIBLES, type Rol } from "@/lib/roles";

export default function FormularioOnboarding({ nombreInicial }: { nombreInicial: string }) {
  const [rol, setRol] = useState<Rol>("alumno");
  const [alias, setAlias] = useState("");
  const [nombre, setNombre] = useState(nombreInicial);
  const [mayor, setMayor] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const a = alias.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(a)) return setError("El alias debe tener de 3 a 20 caracteres: letras sin tilde, números o guion bajo.");
    if (!mayor) return setError("UniBars es solo para mayores de 18 años.");
    setCargando(true);
    const { error } = await crearCliente().rpc("completar_onboarding", {
      p_rol: rol,
      p_alias: a,
      p_nombre: nombre,
      p_mayor: mayor,
    });
    if (error) {
      setError(error.message.includes("profiles_alias_key") ? "Ese alias ya está en uso. Elige otro." : error.message);
      setCargando(false);
    } else window.location.assign("/panel");
  }

  return (
    <form onSubmit={enviar} className="grid gap-5">
      <fieldset className="grid gap-3">
        <legend className="mb-2 font-bold">¿Cómo quieres participar?</legend>
        {ROLES_ELEGIBLES.map((r) => (
          <label key={r} className={`tarjeta flex cursor-pointer items-start gap-3 ${rol === r ? "!border-lava" : ""}`}>
            <input type="radio" name="rol" value={r} checked={rol === r} onChange={() => setRol(r)} className="mt-1 accent-[var(--lava)]" />
            <span>
              <span className="block font-bold">{ROLES[r].nombre}</span>
              <span className="text-sm text-suave">{ROLES[r].resumen}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="grid gap-1 text-sm">
        Tu alias (así te verá la comunidad; podrás usar tu nombre real si quieres)
        <input className="campo" required value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="lobo_solitario" autoComplete="off" />
      </label>
      <label className="grid gap-1 text-sm">
        Tu nombre (opcional, es privado)
        <input className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={mayor} onChange={(e) => setMayor(e.target.checked)} className="mt-1 accent-[var(--lava)]" />
        <span>Declaro que soy mayor de 18 años y acepto los términos de uso y la política de privacidad de UniBars.</span>
      </label>

      {error && <p className="aviso-error" role="alert">{error}</p>}
      <button className="btn btn-lava" disabled={cargando}>{cargando ? "Guardando…" : "Entrar a UniBars"}</button>
    </form>
  );
}
