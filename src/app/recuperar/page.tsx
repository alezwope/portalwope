"use client";

import { useState } from "react";
import Link from "next/link";
import Cabecera from "@/components/Cabecera";
import Captcha, { CLAVE_CAPTCHA } from "@/components/Captcha";
import { crearCliente } from "@/lib/supabase/client";

export default function Recuperar() {
  const [correo, setCorreo] = useState("");
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (CLAVE_CAPTCHA && !captcha) return setError("Confirma que no eres un robot.");
    setCargando(true);
    const { error } = await crearCliente().auth.resetPasswordForEmail(correo.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?siguiente=/nueva-clave`,
      captchaToken: captcha ?? undefined,
    });
    setCargando(false);
    if (error) setError("No pudimos enviar el correo ahora. Inténtalo en unos minutos.");
    else setAviso("Si el correo tiene una cuenta, te enviamos un enlace para crear una contraseña nueva.");
  }

  return (
    <>
      <Cabecera />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <form onSubmit={enviar} className="tarjeta grid w-full max-w-md gap-3">
          <h1 className="text-2xl">Recuperar contraseña</h1>
          <label className="grid gap-1 text-sm">
            Correo de tu cuenta
            <input className="campo" type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </label>
          <Captcha alCambiar={setCaptcha} idioma="es" />
          {error && <p className="aviso-error" role="alert">{error}</p>}
          {aviso && <p className="aviso-ok" role="status">{aviso}</p>}
          <button className="btn btn-lava" disabled={cargando}>{cargando ? "Enviando…" : "Enviarme el enlace"}</button>
          <Link href="/entrar" className="text-center text-sm text-dorado underline">Volver a entrar</Link>
        </form>
      </main>
    </>
  );
}
