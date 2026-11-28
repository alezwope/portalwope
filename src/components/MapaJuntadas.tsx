"use client";

import { useEffect, useRef } from "react";
import type { Map as MapaMapLibre, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CiudadDato } from "@/lib/paises";

const ESTILO = "https://tiles.openfreemap.org/styles/liberty";
export type Punto = { lat: number; lng: number };

/** Coordenadas de una ciudad (de la lista local de ciudades) o null. */
export async function centroCiudad(pais: string | null | undefined, ciudad: string | null | undefined): Promise<Punto | null> {
  if (!pais || !ciudad) return null;
  try {
    const r = await fetch(`/ciudades/${pais}.json`);
    if (!r.ok) return null;
    const lista: CiudadDato[] = await r.json();
    const n = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
    const c = lista.find((x) => n(x[0]) === n(ciudad));
    return c ? { lat: c[2], lng: c[3] } : null;
  } catch {
    return null;
  }
}

async function crearMapa(el: HTMLElement, centro: Punto | null, zoom: number) {
  const ml = await import("maplibre-gl");
  ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
  const m = new ml.Map({
    container: el, style: ESTILO, center: centro ? [centro.lng, centro.lat] : [-58.4, -34.6], zoom: centro ? zoom : 3,
    attributionControl: { compact: true },
  });
  m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
  return { ml, m };
}

/** Mapa para marcar el lugar exacto de una juntada (toca el mapa y queda el pin). */
export function SelectorPin({ valor, centro, onCambio, alto = 280 }: { valor: Punto | null; centro: Punto | null; onCambio: (p: Punto) => void; alto?: number }) {
  const cont = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaMapLibre | null>(null);
  const pin = useRef<Marker | null>(null);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const cb = useRef(onCambio);
  useEffect(() => {
    cb.current = onCambio;
  });

  function poner(p: Punto) {
    const m = mapa.current;
    if (!m || !lib.current) return;
    if (!pin.current) pin.current = new lib.current.Marker({ color: "#E8540C" }).setLngLat([p.lng, p.lat]).addTo(m);
    else pin.current.setLngLat([p.lng, p.lat]);
  }

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!cont.current) return;
      const { ml, m } = await crearMapa(cont.current, valor ?? centro, valor ? 15 : 12);
      if (cancelado) return m.remove();
      lib.current = ml;
      mapa.current = m;
      if (valor) poner(valor);
      m.on("click", (e) => {
        const p = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        poner(p);
        cb.current(p);
      });
    })();
    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
      pin.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si cambia el valor desde afuera (ubicación actual) o el centro, el mapa lo sigue.
  useEffect(() => {
    if (valor) {
      poner(valor);
      mapa.current?.flyTo({ center: [valor.lng, valor.lat], zoom: 16 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor?.lat, valor?.lng]);
  useEffect(() => {
    if (!valor && centro) mapa.current?.flyTo({ center: [centro.lng, centro.lat], zoom: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centro?.lat, centro?.lng]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-borde" style={{ height: alto }}>
      <div ref={cont} className="absolute inset-0" style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}

export type PinEvento = { id: string; titulo: string; lat: number; lng: number };

/** Mapa con las juntadas cercanas (cada una es un pin). */
export function MapaEventos({ eventos, centro, seleccionado, onElegir, alto = 320 }: { eventos: PinEvento[]; centro: Punto | null; seleccionado: string | null; onElegir: (id: string) => void; alto?: number }) {
  const cont = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaMapLibre | null>(null);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const marcadores = useRef<Marker[]>([]);
  const cb = useRef(onElegir);
  useEffect(() => {
    cb.current = onElegir;
  });

  function dibujar() {
    const m = mapa.current;
    if (!m || !lib.current) return;
    marcadores.current.forEach((x) => x.remove());
    marcadores.current = eventos.map((e) => {
      const mk = new lib.current!.Marker({ color: e.id === seleccionado ? "#FFB703" : "#E8540C" }).setLngLat([e.lng, e.lat]).addTo(m);
      const el = mk.getElement();
      el.style.cursor = "pointer";
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", e.titulo);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        cb.current(e.id);
      });
      return mk;
    });
  }

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!cont.current) return;
      const primero = centro ?? (eventos[0] ? { lat: eventos[0].lat, lng: eventos[0].lng } : null);
      const { ml, m } = await crearMapa(cont.current, primero, 10);
      if (cancelado) return m.remove();
      lib.current = ml;
      mapa.current = m;
      dibujar();
    })();
    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
      marcadores.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dibujar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos, seleccionado]);
  useEffect(() => {
    if (centro) mapa.current?.flyTo({ center: [centro.lng, centro.lat], zoom: 10 });
  }, [centro?.lat, centro?.lng]);
  useEffect(() => {
    const e = eventos.find((x) => x.id === seleccionado);
    if (e) mapa.current?.flyTo({ center: [e.lng, e.lat], zoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionado]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-borde" style={{ height: alto }}>
      <div ref={cont} className="absolute inset-0" style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
