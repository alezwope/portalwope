"use client";

import { useState } from "react";
import { crearCliente } from "@/lib/supabase/client";
import { NIVELES, OBJETIVOS } from "@/lib/catalogos";
import SelectorUbicacion, { type Ubicacion } from "@/components/SelectorUbicacion";

export default function FormularioOnboarding({ nombreInicial, siguiente }: { nombreInicial: string; siguiente: string }) {
  const [alias, setAlias] = useState("");
  const [nombre, setNombre] = useState(nombreInicial);
  const [nivel, setNivel] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [mayor, setMayor] = useState(false);
  const [esEntrenador, setEsEntrenador] = useState(false);
  const [escuela, setEscuela] = useState("");
  const [ub, setUb] = useState<Ubicacion>({ pais: "", ciudad: "" });
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const a = alias.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(a)) return setError("El alias debe tener de 3 a 20 caracteres: letras sin tilde, números o guion bajo.");
    if (!mayor) return setError("UniBars es solo para mayores de 18 años.");
    if (esEntrenador && (!ub.pais || !ub.ciudad.trim())) return setError("Elige el país y la ciudad donde das clase.");
    setCargando(true);
    const { error } = await crearCliente().rpc("completar_onboarding", {
      p_alias: a,
      p_nombre: nombre,
      p_mayor: mayor,
      p_nivel: nivel || null,
      p_objetivo: objetivo || null,
    });
    if (error) {
      setError(error.message.includes("profiles_alias_key") ? "Ese alias ya está en uso. Elige otro." : error.message);
      setCargando(false);
      return;
    }
    if (!esEntrenador) return window.location.assign(siguiente);
    const c = crearCliente();
    await c.from("profiles").update({ ciudad: ub.ciudad.trim(), pais: ub.pais }).eq("id", (await c.auth.getUser()).data.user!.id);
    const { error: e2 } = await c.rpc("crear_pagina", {
      p_tipo: "entrenador", p_nombre: (escuela.trim() || nombre.trim() || a), p_ciudad: ub.ciudad, p_pais: ub.pais, p_especialidad: "",
    });
    if (e2) {
      setAviso("Tu cuenta quedó creada, pero no pudimos abrir tu escuela (" + e2.message + "). Puedes hacerlo desde Perfil.");
      setCargando(false);
      return;
    }
    window.location.assign("/panel/entrenador/escuela");
  }

  return (
    <form onSubmit={enviar} className="grid gap-5">
      <label className="grid gap-1 text-sm">
        Tu alias (así te verá la comunidad)
        <input className="campo" required value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="lobo_de_barra" autoComplete="off" />
      </label>
      <label className="grid gap-1 text-sm">
        Tu nombre (opcional, es privado)
        <input className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
      </label>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm">¿En qué nivel estás? (opcional)</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[{ clave: "", nombre: "No lo sé", etapa: "Lo descubrimos juntos", color: "var(--suave)" }, ...NIVELES].map((n) => (
            <label
              key={n.clave || "nose"}
              className={`tarjeta !p-3 cursor-pointer text-sm ${nivel === n.clave ? "!border-lava" : ""}`}
            >
              <input type="radio" name="nivel" className="sr-only" checked={nivel === n.clave} onChange={() => setNivel(n.clave)} />
              <span className="block font-bold" style={{ color: n.color }}>{n.nombre}</span>
              <span className="text-suave">{n.etapa}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="grid gap-1 text-sm">
        ¿Qué buscas? (opcional)
        <select className="campo" value={objetivo} onChange={(e) => setObjetivo(e.target.value)}>
          <option value="">Prefiero no decirlo ahora</option>
          {Object.entries(OBJETIVOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={mayor} onChange={(e) => setMayor(e.target.checked)} className="mt-1 accent-[var(--lava)]" />
        <span>Declaro que soy mayor de 18 años y acepto los términos de uso y la política de privacidad de UniBars.</span>
      </label>

      <div className="tarjeta grid gap-3">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={esEntrenador} onChange={(e) => setEsEntrenador(e.target.checked)} className="mt-1 accent-[var(--lava)]" />
          <span><strong>Soy entrenador y quiero abrir mi escuela</strong><br /><span className="text-suave">Se crea al instante: tu página de entrenador es tu escuela. Después agregas tus sedes en el mapa.</span></span>
        </label>
        {esEntrenador && (
          <>
            <label className="grid gap-1 text-sm">
              Nombre de tu escuela (opcional: si lo dejas vacío usamos tu nombre)
              <input className="campo" maxLength={60} value={escuela} onChange={(e) => setEscuela(e.target.value)} placeholder={nombre || "Alejandro Calistenia"} />
            </label>
            <SelectorUbicacion etiqueta="¿Dónde das clase? (ciudad principal)" valor={ub} onCambio={setUb} />
          </>
        )}
      </div>

      {error && <p className="aviso-error" role="alert">{error}</p>}
      {aviso && (
        <p className="aviso-error" role="alert">
          {aviso} <a className="underline" href={siguiente}>Continuar</a>
        </p>
      )}
      <button className="btn btn-lava" disabled={cargando}>{cargando ? "Guardando…" : esEntrenador ? "Crear cuenta y mi escuela" : "Entrar a UniBars"}</button>
      <p className="text-xs text-suave">¿Tienes una tienda o das servicios de salud? Lo activas después desde tu perfil.</p>
    </form>
  );
}
