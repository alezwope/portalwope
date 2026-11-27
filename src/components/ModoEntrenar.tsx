"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTextos } from "@/components/Idioma";

const EVENTO = "unibars:modo-entrenar";
const PRESETS = [30, 60, 90, 120, 180];

/** Abre el Modo Entrenar desde cualquier botón. */
export function abrirModoEntrenar() {
  window.dispatchEvent(new Event(EVENTO));
}

function pitido() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.6);
  } catch {}
  try { navigator.vibrate?.([200, 100, 200]); } catch {}
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Pantalla completa sin distracciones: descanso con pitido y contador de series. */
export default function ModoEntrenar() {
  const { t } = useTextos();
  const [abierto, setAbierto] = useState(false);
  const [total, setTotal] = useState(90);
  const [queda, setQueda] = useState(90);
  const [corriendo, setCorriendo] = useState(false);
  const [series, setSeries] = useState(0);
  const fin = useRef<number | null>(null);

  useEffect(() => {
    const abrir = () => setAbierto(true);
    window.addEventListener(EVENTO, abrir);
    return () => window.removeEventListener(EVENTO, abrir);
  }, []);

  useEffect(() => {
    if (!corriendo) return;
    const id = setInterval(() => {
      const r = Math.max(0, Math.round(((fin.current ?? Date.now()) - Date.now()) / 1000));
      setQueda(r);
      if (r === 0) { setCorriendo(false); pitido(); }
    }, 250);
    return () => clearInterval(id);
  }, [corriendo]);

  const cerrar = useCallback(() => { setAbierto(false); setCorriendo(false); }, []);
  useEffect(() => {
    if (!abierto) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [abierto, cerrar]);

  function iniciar() {
    const desde = queda === 0 ? total : queda;
    setQueda(desde);
    fin.current = Date.now() + desde * 1000;
    setCorriendo(true);
  }
  function elegir(s: number) { setCorriendo(false); setTotal(s); setQueda(s); }

  if (!abierto) return null;
  const pct = total ? (queda / total) * 100 : 0;

  return (
    <div role="dialog" aria-modal="true" aria-label={t["entreno.titulo"]} className="fixed inset-0 z-[60] flex flex-col bg-bg">
      <div className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3">
        <div>
          <p className="text-xs font-bold tracking-widest text-lava">{t["entreno.titulo"]}</p>
          <p className="text-xs text-suave">{t["entreno.sub"]}</p>
        </div>
        <button type="button" onClick={cerrar} className="btn btn-borde !py-1.5 text-sm">✕ {t["entreno.salir"]}</button>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4">
        <p className="text-sm uppercase tracking-widest text-suave">{t["entreno.cronometro"]}</p>
        <div
          className="grid h-56 w-56 place-items-center rounded-full"
          style={{ background: `conic-gradient(#ff5500 ${pct}%, var(--borde) ${pct}% 100%)` }}
        >
          <div className="grid h-48 w-48 place-items-center rounded-full bg-bg">
            <span className="num text-6xl font-bold" aria-live="polite">{mmss(queda)}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {PRESETS.map((s) => (
            <button key={s} type="button" onClick={() => elegir(s)} aria-pressed={total === s}
              className={`num rounded-full border px-3 py-1 text-sm ${total === s ? "border-lava bg-lava/15 text-lava" : "border-borde text-suave"}`}>
              {s}s
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          {corriendo ? (
            <button type="button" onClick={() => setCorriendo(false)} className="btn btn-borde">{t["entreno.pausar"]}</button>
          ) : (
            <button type="button" onClick={iniciar} className="btn btn-lava px-8">{t["entreno.iniciar"]}</button>
          )}
          <button type="button" onClick={() => elegir(total)} className="btn btn-borde">{t["entreno.reiniciar"]}</button>
        </div>

        <div className="tarjeta flex w-full items-center justify-between">
          <span className="text-sm text-suave">{t["entreno.series"]}</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSeries((s) => Math.max(0, s - 1))} className="btn btn-borde !px-3 !py-1" aria-label="−1">−</button>
            <span className="num w-10 text-center text-3xl font-bold">{series}</span>
            <button type="button" onClick={() => { setSeries((s) => s + 1); iniciar(); }} className="btn btn-lava !px-3 !py-1" aria-label="+1">+</button>
          </div>
        </div>

        <Link href="/panel/entrenar" onClick={cerrar} className="text-sm text-suave underline">{t["entreno.irRutina"]}</Link>
      </div>
    </div>
  );
}

/** Botón flotante del bíceps (teléfono). */
export function BotonBiceps() {
  return (
    <button
      type="button"
      onClick={abrirModoEntrenar}
      className="fixed bottom-20 right-3 z-40 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg md:hidden"
      style={{ background: "linear-gradient(135deg,#e84a00,#ff7a00 55%,#ffa000)", boxShadow: "0 6px 24px rgba(255,85,0,.45)" }}
      aria-label="Modo Entrenar"
    >
      <span aria-hidden className="text-2xl leading-none">💪</span>
      <span className="-mt-2 text-[9px] font-black tracking-widest">TRAIN</span>
    </button>
  );
}

/** Botón «ENTRENAR YA» de la barra superior (computadora). */
export function BotonEntrenarYa({ texto }: { texto: string }) {
  return (
    <button type="button" onClick={abrirModoEntrenar} className="btn btn-lava hidden !py-1.5 text-sm tracking-wide md:inline-flex">
      ⚡ {texto}
    </button>
  );
}
