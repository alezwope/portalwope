"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { crearCliente } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/social";

type Actividad = { n30: number; ahora: number; yo_hoy: boolean };
type Resultado = { nuevo: boolean; racha: number; parques: number };

export default function CheckIn({ parqueId }: { parqueId: string }) {
  const [act, setAct] = useState<Actividad | null>(null);
  const [logueado, setLogueado] = useState<boolean | null>(null);
  const [estado, setEstado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  async function cargar() {
    const c = crearCliente();
    const [{ data: a }, { data: u }] = await Promise.all([c.rpc("parque_actividad", { p_id: parqueId }), c.auth.getUser()]);
    if (a) setAct(a as Actividad);
    setLogueado(!!u.user);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parqueId]);

  function marcar() {
    setEstado(null);
    if (!navigator.geolocation) return setEstado({ ok: false, texto: "Tu navegador no permite ubicarte." });
    setCargando(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // La ubicación se envía solo para comprobar la distancia y no se guarda.
        const zona = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const { data, error } = await crearCliente().rpc("checkin", { p_parque: parqueId, p_lat: pos.coords.latitude, p_lng: pos.coords.longitude, p_zona: zona });
        setCargando(false);
        if (error) return setEstado({ ok: false, texto: mensajeError(error) });
        const r = data as Resultado;
        setEstado({
          ok: true,
          texto: r.nuevo
            ? `¡Check-in hecho! Racha: ${r.racha} día(s) · Parques distintos: ${r.parques}.`
            : "Ya habías marcado este parque hoy. ¡Buen entrenamiento!",
        });
        await cargar();
      },
      () => {
        setCargando(false);
        setEstado({ ok: false, texto: "No pudimos obtener tu ubicación. Revisa el permiso del navegador." });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  return (
    <section className="tarjeta grid gap-2" aria-label="Actividad del parque">
      <h2 className="text-xl text-lava">Entrenar aquí</h2>
      {act && (
        <p className="text-sm text-suave">
          {act.n30 > 0 ? `${act.n30} entrenamiento(s) en los últimos 30 días` : "Nadie ha marcado este parque todavía: ¡puedes ser el primero!"}
          {act.ahora > 0 ? " · 🔥 hay gente entrenando ahora" : ""}
        </p>
      )}
      {logueado === false ? (
        <Link href={`/entrar?siguiente=${encodeURIComponent(`/parque/${parqueId}`)}`} className="btn btn-lava justify-self-start">Entra para marcar tu entrenamiento</Link>
      ) : (
        <button onClick={marcar} disabled={cargando || logueado === null || act?.yo_hoy} className="btn btn-lava justify-self-start">
          {act?.yo_hoy ? "✓ Ya marcaste hoy" : cargando ? "Comprobando…" : "📍 Estoy entrenando aquí"}
        </button>
      )}
      {estado && <p className={estado.ok ? "aviso-ok" : "aviso-error"} role="status">{estado.texto}</p>}
      <p className="text-xs text-suave">Debes estar a menos de 250 m del parque. Tu ubicación no se guarda: solo queda el día y el parque.</p>
    </section>
  );
}
