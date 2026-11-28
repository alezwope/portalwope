"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTextos } from "@/components/Idioma";
import { crearCliente } from "@/lib/supabase/client";
import { cargarMotor, tipoDispositivo, VERSION_MOTOR, type ContadorPose } from "@/lib/pose";
import { rellenar, type Textos } from "@/lib/i18n/diccionarios";

type Fase = "intro" | "preparando" | "cuenta" | "midiendo" | "resultado" | "error";
const tx = (t: Textos, k: string) => (t as Record<string, string>)[k] ?? k;

/**
 * Mide una prueba del nivelador con la cámara.
 * - ejercicio: clave del motor (sentadilla, silla, burpee…)
 * - sostenido: cuenta segundos en postura válida en vez de repeticiones
 * - duracion: segundos de la prueba con tiempo (p. ej. 60 para sentadillas o burpees)
 */
export default function CamaraPrueba({ ejercicio, titulo, sostenido = false, duracion, conSesion, onUsar, onCerrar }: {
  ejercicio: string; titulo: string; sostenido?: boolean; duracion?: number; conSesion: boolean;
  onUsar: (valor: number) => void; onCerrar: () => void;
}) {
  const { t } = useTextos();
  const video = useRef<HTMLVideoElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const contador = useRef<ContadorPose | null>(null);
  const flujo = useRef<MediaStream | null>(null);
  const base = useRef(0);
  const fueraDesde = useRef<number | null>(null);
  const [fase, setFase] = useState<Fase>("intro");
  const [n, setN] = useState(0);
  const [estado, setEstado] = useState("");
  const [resta, setResta] = useState(0);
  const [final, setFinal] = useState(0);
  const [corregido, setCorregido] = useState<string>("");
  const faseRef = useRef<Fase>("intro");
  const ponerFase = (f: Fase) => { faseRef.current = f; setFase(f); };

  function apagar() {
    contador.current?.parar();
    contador.current = null;
    flujo.current?.getTracks().forEach((p) => p.stop());
    flujo.current = null;
  }
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; apagar(); };
  }, []);

  function terminar() {
    const valor = Math.max(0, (contador.current?.n ?? 0) - base.current);
    apagar();
    setFinal(valor);
    setCorregido(String(valor));
    ponerFase("resultado");
  }

  async function empezar() {
    ponerFase("preparando");
    setEstado(t["cam.cargando"]);
    try {
      const [motor, f] = await Promise.all([
        cargarMotor(),
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }),
      ]);
      flujo.current = f;
      const v = video.current!;
      v.srcObject = f;
      await v.play();
      contador.current = new motor.Contador(v, lienzo.current, ejercicio, (cuenta, est, texto) => {
        setN(Math.max(0, cuenta - base.current));
        if (est === "error") { setEstado(texto ?? t["cam.error"]); ponerFase("error"); return; }
        if (texto !== undefined) setEstado(texto);
        // Sostenido: si sale de la postura más de 1,5 s después de empezar, se termina.
        if (sostenido && faseRef.current === "midiendo") {
          if (est === "fuera" || est === "sin-cuerpo") fueraDesde.current ??= performance.now();
          else fueraDesde.current = null;
        }
      });
      // Cuenta regresiva para acomodarse.
      ponerFase("cuenta");
      for (let s = 5; s > 0; s--) {
        setResta(s);
        await new Promise((r) => setTimeout(r, 1000));
        if (faseRef.current !== "cuenta") return;
      }
      base.current = contador.current?.n ?? 0;
      setN(0);
      ponerFase("midiendo");
      const fin = duracion ? Date.now() + duracion * 1000 : null;
      const tic = setInterval(() => {
        if (faseRef.current !== "midiendo") return clearInterval(tic);
        if (fin) {
          const r = Math.ceil((fin - Date.now()) / 1000);
          setResta(Math.max(0, r));
          if (r <= 0) { clearInterval(tic); terminar(); }
        }
        if (sostenido && fueraDesde.current && performance.now() - fueraDesde.current > 1500 && (contador.current?.n ?? 0) - base.current >= 3) {
          clearInterval(tic); terminar();
        }
      }, 250);
    } catch (e) {
      apagar();
      const nombre = (e as { name?: string })?.name;
      setEstado(nombre === "NotAllowedError" ? t["cam.permiso"] : t["cam.error"]);
      ponerFase("error");
    }
  }

  async function usar() {
    const persona = Math.max(0, Math.min(3600, Math.floor(Number(corregido) || 0)));
    if (conSesion) {
      // Solo dos números para mejorar el contador. Sin imagen.
      crearCliente().rpc("validar_camara", {
        p_ejercicio: ejercicio, p_camara: final, p_persona: persona, p_sostenido: sostenido,
        p_dispositivo: tipoDispositivo(), p_version: VERSION_MOTOR,
      }).then(() => {}, () => {});
    }
    onUsar(persona);
  }

  const vista = tx(t, `cam.vista.${ejercicio}`) !== `cam.vista.${ejercicio}` ? tx(t, `cam.vista.${ejercicio}`) : "";
  const unidad = sostenido ? t["niv.seg"] : t["niv.reps"];

  return createPortal(
    <div className="fixed inset-0 z-[80] grid bg-bg/95 p-3 sm:place-items-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="tarjeta mx-auto grid w-full max-w-lg content-start gap-3 overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl text-lava">📷 {titulo}</h2>
          <button type="button" onClick={() => { apagar(); onCerrar(); }} className="text-suave hover:text-lava" aria-label={t["comun.cerrar"]}>✕</button>
        </div>

        {fase === "intro" && (
          <>
            <ul className="grid gap-1 text-sm">
              {vista && <li>📐 {vista}</li>}
              <li>🧍 {t["cam.cuerpo"]}</li>
              <li>💡 {t["cam.luz"]}</li>
              <li>📱 {t["cam.apoyo"]}</li>
              {duracion ? <li>⏱️ {rellenar(t["cam.duracion"], { s: duracion })}</li> : null}
              {sostenido ? <li>⏱️ {t["cam.sostenido"]}</li> : null}
            </ul>
            <p className="text-xs text-suave">{t["cam.privacidad"]}</p>
            <button type="button" className="btn btn-lava" onClick={empezar}>{t["cam.activar"]}</button>
          </>
        )}

        <div className={`relative overflow-hidden rounded-xl bg-black ${fase === "intro" || fase === "resultado" || fase === "error" ? "hidden" : ""}`} style={{ aspectRatio: "4 / 3" }}>
          <video ref={video} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
          <canvas ref={lienzo} className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
            <span className="num rounded-lg bg-black/60 px-3 py-1 text-4xl text-dorado">{fase === "cuenta" ? resta : n}</span>
            {fase === "midiendo" && duracion ? <span className="num rounded-lg bg-black/60 px-2 py-1 text-xl text-white">{resta}s</span> : null}
          </div>
          {fase === "cuenta" && <p className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-center text-sm text-white">{t["cam.acomodate"]}</p>}
          {estado && fase !== "cuenta" && <p className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-center text-sm text-white">{estado}</p>}
        </div>

        {fase === "midiendo" && (
          <button type="button" className="btn btn-borde" onClick={terminar}>{t["cam.terminar"]}</button>
        )}

        {fase === "resultado" && (
          <>
            <p className="text-center">
              <span className="block text-sm text-suave">{t["cam.conto"]}</span>
              <span className="num text-5xl text-dorado">{final}</span> <span className="text-suave">{unidad}</span>
            </p>
            <label className="grid gap-1 text-sm">
              {t["cam.fueAsi"]}
              <input className="campo num" type="number" inputMode="numeric" min={0} value={corregido} onChange={(e) => setCorregido(e.target.value)} />
              <span className="text-xs text-suave">{t["cam.fueAsiD"]}</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-lava" onClick={usar}>{t["cam.usar"]}</button>
              <button type="button" className="btn btn-borde" onClick={() => { setN(0); ponerFase("intro"); }}>{t["cam.repetir"]}</button>
            </div>
          </>
        )}

        {fase === "error" && (
          <>
            <p className="aviso-error">{estado}</p>
            <button type="button" className="btn btn-borde" onClick={() => ponerFase("intro")}>{t["cam.reintentar"]}</button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
