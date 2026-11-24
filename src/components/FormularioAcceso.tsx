"use client";

import { useState } from "react";
import Link from "next/link";
import { crearCliente } from "@/lib/supabase/client";

function traducir(mensaje: string) {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Primero confirma tu correo: te enviamos un enlace.";
  if (m.includes("already registered")) return "Ese correo ya tiene una cuenta. Prueba entrar.";
  if (m.includes("password should be")) return "La contraseña debe tener al menos 8 caracteres.";
  if (m.includes("unsupported provider") || m.includes("not enabled")) return "El acceso con Google aún no está activado.";
  if (m.includes("rate limit")) return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
  return "No pudimos completar la acción. Inténtalo de nuevo.";
}

export default function FormularioAcceso({ siguiente, errorInicial }: { siguiente: string; errorInicial?: string }) {
  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState(errorInicial ?? "");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(false);

  const destino = () =>
    `${window.location.origin}/auth/callback?siguiente=${encodeURIComponent(siguiente)}`;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAviso("");
    if (clave.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    setCargando(true);
    const supabase = crearCliente();
    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
      if (error) setError(traducir(error.message));
      else window.location.assign(siguiente);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: correo.trim(),
        password: clave,
        options: { emailRedirectTo: destino() },
      });
      if (error) setError(traducir(error.message));
      else if (data.session) window.location.assign(siguiente);
      else setAviso("¡Listo! Te enviamos un correo para confirmar tu cuenta. Revisa también la carpeta de spam.");
    }
    setCargando(false);
  }

  async function conGoogle() {
    setError("");
    const { error } = await crearCliente().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: destino() },
    });
    if (error) setError(traducir(error.message));
  }

  return (
    <div className="tarjeta w-full max-w-md">
      <div className="grid grid-cols-2 gap-2 mb-5" role="tablist">
        {(["entrar", "crear"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={modo === m}
            onClick={() => {
              setModo(m);
              setError("");
              setAviso("");
            }}
            className={`btn ${modo === m ? "btn-lava" : "btn-borde"}`}
          >
            {m === "entrar" ? "Entrar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <button type="button" onClick={conGoogle} className="btn btn-borde w-full mb-4">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
          <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        Continuar con Google
      </button>

      <div className="flex items-center gap-3 mb-4 text-suave text-sm">
        <span className="h-px flex-1 bg-borde" /> o con tu correo <span className="h-px flex-1 bg-borde" />
      </div>

      <form onSubmit={enviar} className="grid gap-3">
        <label className="grid gap-1 text-sm">
          Correo
          <input className="campo" type="email" required autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          Contraseña
          <input
            className="campo"
            type="password"
            required
            minLength={8}
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
        </label>
        {error && <p className="aviso-error" role="alert">{error}</p>}
        {aviso && <p className="aviso-ok" role="status">{aviso}</p>}
        <button className="btn btn-lava" disabled={cargando}>
          {cargando ? "Un momento…" : modo === "entrar" ? "Entrar" : "Crear mi cuenta"}
        </button>
      </form>

      {modo === "entrar" && (
        <p className="text-center text-sm mt-4">
          <Link href="/recuperar" className="text-dorado underline">¿Olvidaste tu contraseña?</Link>
        </p>
      )}
    </div>
  );
}
