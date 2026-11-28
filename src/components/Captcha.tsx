"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void } }
}

/** Clave pública de Cloudflare Turnstile. Si no está cargada, no se muestra nada y no se exige CAPTCHA. */
export const CLAVE_CAPTCHA = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/** CAPTCHA gratis de Cloudflare (sin rastreo). Devuelve el token por alCambiar; null si vence. */
export default function Captcha({ alCambiar, idioma }: { alCambiar: (t: string | null) => void; idioma: string }) {
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!CLAVE_CAPTCHA || !caja.current) return;
    let id: string | undefined;
    const pintar = () => {
      if (!caja.current || !window.turnstile || id) return;
      id = window.turnstile.render(caja.current, {
        sitekey: CLAVE_CAPTCHA, language: idioma, theme: "auto",
        callback: (t: string) => alCambiar(t), "expired-callback": () => alCambiar(null), "error-callback": () => alCambiar(null),
      });
    };
    if (window.turnstile) pintar();
    else {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true; s.onload = pintar;
      document.head.appendChild(s);
    }
  }, [alCambiar, idioma]);
  if (!CLAVE_CAPTCHA) return null;
  return <div ref={caja} className="min-h-[65px]" />;
}
