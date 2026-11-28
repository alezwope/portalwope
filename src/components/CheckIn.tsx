"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { crearCliente } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/social";
import { nivelDe } from "@/lib/catalogos";
import { rellenar } from "@/lib/i18n/diccionarios";
import { useTextos } from "@/components/Idioma";
import Avatar from "@/components/Avatar";

type Presente = { alias: string; nivel: string | null; avatar_url: string | null; es_yo: boolean };
type Actividad = { n7: number; n30: number; n365: number; personas30: number; ahora: number; yo_hoy: boolean; yo_visible: boolean; presentes: Presente[] };
type Resultado = { nuevo: boolean; racha: number; parques: number };

const CLAVE_VISIBLE = "unibars-mostrarme-parque";

export default function CheckIn({ parqueId }: { parqueId: string }) {
  const { t } = useTextos();
  const [act, setAct] = useState<Actividad | null>(null);
  const [logueado, setLogueado] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(() => {
    try { return typeof window !== "undefined" && localStorage.getItem(CLAVE_VISIBLE) === "1"; } catch { return false; }
  });
  const [estado, setEstado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    const c = crearCliente();
    const [{ data: a }, { data: s }] = await Promise.all([c.rpc("parque_actividad", { p_id: parqueId }), c.auth.getSession()]);
    if (a) setAct(a as Actividad);
    setLogueado(!!s.session);
  }, [parqueId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  async function cambiarVisible(v: boolean) {
    setVisible(v);
    try { localStorage.setItem(CLAVE_VISIBLE, v ? "1" : "0"); } catch {}
    if (act?.yo_hoy) {
      await crearCliente().rpc("checkin_visibilidad", { p_parque: parqueId, p_visible: v });
      await cargar();
    }
  }

  function marcar() {
    setEstado(null);
    if (!navigator.geolocation) return setEstado({ ok: false, texto: t["parque.sinGeo"] });
    setCargando(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // La ubicación se envía solo para comprobar la distancia y no se guarda.
        const zona = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const { data, error } = await crearCliente().rpc("checkin", {
          p_parque: parqueId, p_lat: pos.coords.latitude, p_lng: pos.coords.longitude, p_zona: zona, p_visible: visible,
        });
        setCargando(false);
        if (error) return setEstado({ ok: false, texto: mensajeError(error) });
        const r = data as Resultado;
        setEstado({ ok: true, texto: r.nuevo ? rellenar(t["parque.hecho"], { racha: r.racha, parques: r.parques }) : t["parque.yaHoy"] });
        await cargar();
      },
      () => {
        setCargando(false);
        setEstado({ ok: false, texto: t["parque.errGeo"] });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const cifras = act ? [
    { n: act.n7, txt: t["parque.semana"] },
    { n: act.n30, txt: t["parque.mes"] },
    { n: act.n365, txt: t["parque.anio"] },
    { n: act.personas30, txt: t["parque.personas"] },
  ] : [];

  return (
    <div className="grid gap-4">
      <section className="tarjeta grid gap-3" aria-label={t["parque.entrenarAqui"]}>
        <h2 className="text-xl text-lava">{t["parque.entrenarAqui"]}</h2>
        {act && act.ahora > 0 && <p className="text-sm">🔥 {rellenar(t["parque.ahora"], { n: act.ahora })}</p>}
        {logueado === null ? null : logueado === false ? (
          <Link href={`/entrar?siguiente=${encodeURIComponent(`/parque/${parqueId}`)}`} className="btn btn-lava justify-self-start">{t["parque.entraParaMarcar"]}</Link>
        ) : (
          <>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--lava)]" checked={visible} onChange={(e) => cambiarVisible(e.target.checked)} />
              <span>
                <span className="font-bold">{t["parque.mostrarme"]}</span>
                <span className="block text-xs text-suave">{t["parque.mostrarmeD"]}</span>
              </span>
            </label>
            <button onClick={marcar} disabled={cargando || act?.yo_hoy} className="btn btn-lava justify-self-start">
              {act?.yo_hoy ? t["parque.marcado"] : cargando ? t["parque.comprobando"] : t["parque.marcar"]}
            </button>
          </>
        )}
        {estado && <p className={estado.ok ? "aviso-ok" : "aviso-error"} role="status">{estado.texto}</p>}
        <p className="text-xs text-suave">{t["parque.privacidad"]}</p>
      </section>

      {logueado && act && (
        <section className="tarjeta grid gap-3" aria-label={t["parque.quien"]}>
          <h2 className="text-xl">{t["parque.quien"]}</h2>
          {act.presentes.length === 0 ? (
            <p className="text-sm text-suave">{t["parque.nadieVisible"]}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {act.presentes.map((p) => {
                const nv = nivelDe(p.nivel);
                return (
                  <li key={p.alias}>
                    <Link href={`/panel/u/${p.alias}`} className="flex items-center gap-2 rounded-full border border-borde py-1 pl-1 pr-3 text-sm hover:border-lava">
                      <Avatar alias={p.alias} url={p.avatar_url} nivel={p.nivel} tam={28} />
                      @{p.alias}{p.es_yo ? ` (${t["parque.tu"]})` : ""}
                      {nv && <span className="text-xs" style={{ color: nv.color }}>{nv.nombre}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {act && (
        <section className="tarjeta grid gap-3" aria-label={t["parque.estadisticas"]}>
          <h2 className="text-xl">{t["parque.estadisticas"]}</h2>
          {act.n365 === 0 ? (
            <p className="text-sm text-suave">{t["parque.primero"]}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              {cifras.map((c) => (
                <div key={c.txt}>
                  <p className="num text-3xl text-dorado">{c.n}</p>
                  <p className="text-xs text-suave">{c.txt}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
