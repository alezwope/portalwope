"use client";

import { useState } from "react";
import Link from "next/link";
import Captcha, { CLAVE_CAPTCHA } from "@/components/Captcha";
import { claveFiltrada } from "@/lib/claveFiltrada";
import { crearCliente } from "@/lib/supabase/client";
import { useTextos } from "@/components/Idioma";
import type { Textos } from "@/lib/i18n/diccionarios";

function traducir(mensaje: string, t: Textos) {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login")) return t["acceso.errDatos"];
  if (m.includes("email not confirmed")) return t["acceso.errConfirmar"];
  if (m.includes("already registered")) return t["acceso.errExiste"];
  if (m.includes("password should be")) return t["acceso.errClave"];
  if (m.includes("unsupported provider") || m.includes("not enabled")) return t["acceso.errGoogle"];
  if (m.includes("rate limit")) return t["acceso.errLimite"];
  return t["acceso.errGeneral"];
}

/** Lo que eligió al registrarse; el panel lo usa para llevarle a crear su página. */
export const CLAVE_INTENCION = "unibars-crear-pagina";
const ROLES = [
  { v: "", k: "acceso.soyNada", i: "💪" },
  { v: "entrenador", k: "acceso.soyEntrenador", i: "🏋️" },
  { v: "entrenador", k: "acceso.soyEscuela", i: "🏛️" },
  { v: "wellness", k: "acceso.soyWellness", i: "🌿" },
  { v: "tienda", k: "acceso.soyTienda", i: "🛒" },
] as const;

export default function FormularioAcceso({
  siguiente, errorInicial, modoInicial = "entrar",
}: { siguiente: string; errorInicial?: string; modoInicial?: "entrar" | "crear" }) {
  const { t, idioma } = useTextos();
  const [modo, setModo] = useState<"entrar" | "crear">(modoInicial);
  const [rol, setRol] = useState(0);
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState(errorInicial ?? "");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);

  const destino = () =>
    `${window.location.origin}/auth/callback?siguiente=${encodeURIComponent(siguiente)}`;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAviso("");
    if (clave.length < 8) return setError(t["acceso.errClave"]);
    if (CLAVE_CAPTCHA && !captcha) return setError(t["acceso.errCaptcha"]);
    setCargando(true);
    const supabase = crearCliente();
    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave, options: { captchaToken: captcha ?? undefined } });
      if (error) setError(traducir(error.message, t));
      else window.location.assign(siguiente);
    } else {
      if (await claveFiltrada(clave)) { setCargando(false); return setError(t["acceso.errFiltrada"]); }
      try {
        if (ROLES[rol].v) localStorage.setItem(CLAVE_INTENCION, ROLES[rol].v);
        else localStorage.removeItem(CLAVE_INTENCION);
      } catch {}
      const { data, error } = await supabase.auth.signUp({
        email: correo.trim(),
        password: clave,
        options: { emailRedirectTo: destino(), captchaToken: captcha ?? undefined },
      });
      if (error) setError(traducir(error.message, t));
      else if (data.session) window.location.assign(siguiente);
      else setAviso(t["acceso.okCorreo"]);
    }
    setCaptcha(null);
    try { window.turnstile?.reset(); } catch {}
    setCargando(false);
  }

  async function conGoogle() {
    setError("");
    const { error } = await crearCliente().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: destino() },
    });
    if (error) setError(traducir(error.message, t));
  }

  return (
    <div className="tarjeta w-full max-w-md !p-6 shadow-2xl shadow-black/30">
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
            {m === "entrar" ? t["comun.entrar"] : t["comun.crearCuenta"]}
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
        {t["acceso.google"]}
      </button>

      <div className="flex items-center gap-3 mb-4 text-suave text-sm">
        <span className="h-px flex-1 bg-borde" /> {t["acceso.o"]} <span className="h-px flex-1 bg-borde" />
      </div>

      <form onSubmit={enviar} className="grid gap-3">
        <label className="grid gap-1 text-sm">
          {t["acceso.correo"]}
          <input className="campo" type="email" required autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          {t["acceso.clave"]}
          <input
            className="campo"
            type="password"
            required
            minLength={8}
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder={modo === "crear" ? t["acceso.clave8"] : undefined}
          />
        </label>
        {modo === "crear" && (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm">{t["acceso.soy"]}</legend>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((r, i) => (
                <button
                  key={r.k}
                  type="button"
                  onClick={() => setRol(i)}
                  aria-pressed={rol === i}
                  className={`rounded-full border px-3 py-1.5 text-sm ${rol === i ? "border-lava bg-lava/15 font-bold text-lava" : "border-borde text-suave hover:text-texto"}`}
                >
                  <span aria-hidden>{r.i}</span> {t[r.k]}
                </button>
              ))}
            </div>
            {rol > 0 && <p className="text-xs text-suave">{t["acceso.soyAyuda"]}</p>}
          </fieldset>
        )}
        {error && <p className="aviso-error" role="alert">{error}</p>}
        {aviso && <p className="aviso-ok" role="status">{aviso}</p>}
        <Captcha alCambiar={setCaptcha} idioma={idioma} />
        <button className="btn btn-lava" disabled={cargando}>
          {cargando ? t["acceso.esperar"] : modo === "entrar" ? t["comun.entrar"] : t["comun.crearCuenta"]}
        </button>
        {modo === "crear" && <p className="text-center text-xs text-suave">{t["acceso.terminos"]}</p>}
      </form>

      {modo === "entrar" && (
        <p className="text-center text-sm mt-4">
          <Link href="/recuperar" className="text-dorado underline">{t["acceso.olvide"]}</Link>
        </p>
      )}
    </div>
  );
}
