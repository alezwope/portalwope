"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Map as MapaMapLibre, GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CATEGORIAS, nombreParque, urlComoLlegar, type CategoriaParque, type PuntoParque } from "@/lib/parques";

const ORDEN: CategoriaParque[] = ["calistenia_oficial", "calistenia_etiquetada", "probable_calistenia", "estacion_fitness"];
const ESTILO = "https://tiles.openfreemap.org/styles/liberty";

type Seleccion = { id: string; nombre: string | null; categoria: CategoriaParque; aparatos: number | null; lat: number; lng: number };

function aGeoJSON(puntos: PuntoParque[], activas: Set<CategoriaParque>) {
  return {
    type: "FeatureCollection" as const,
    features: puntos
      .filter((p) => activas.has(p[3]))
      .map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p[2], p[1]] },
        properties: { id: p[0], categoria: p[3], aparatos: p[4], nombre: p[5] },
      })),
  };
}

export default function MapaParques({ alto = "calc(100dvh - 8rem)" }: { alto?: string }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaMapLibre | null>(null);
  const listo = useRef(false);
  const [puntos, setPuntos] = useState<PuntoParque[]>([]);
  const [error, setError] = useState("");
  const [activas, setActivas] = useState<Set<CategoriaParque>>(new Set(["calistenia_oficial", "calistenia_etiquetada", "probable_calistenia"]));
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [aviso, setAviso] = useState("");
  const [cargandoMapa, setCargandoMapa] = useState(true);

  // 1. Datos
  useEffect(() => {
    let vivo = true;
    fetch("/api/parques")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: PuntoParque[]) => vivo && setPuntos(d))
      .catch(() => vivo && setError("No pudimos cargar los parques. Recarga la página."));
    return () => {
      vivo = false;
    };
  }, []);

  const geojson = useMemo(() => aGeoJSON(puntos, activas), [puntos, activas]);
  const geojsonRef = useRef(geojson);
  useEffect(() => {
    geojsonRef.current = geojson;
  }, [geojson]);

  // 2. Mapa (se crea una sola vez)
  useEffect(() => {
    let cancelado = false;
    let instancia: MapaMapLibre | null = null;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      if (cancelado || !contenedor.current) return;
      const nuevo = new maplibregl.Map({
        container: contenedor.current,
        style: ESTILO,
        center: [-58.4, -34.6],
        zoom: 3,
        attributionControl: { compact: true },
        cooperativeGestures: false,
      });
      instancia = nuevo;
      mapa.current = nuevo;
      nuevo.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      nuevo.on("load", () => {
        const m = nuevo;
        m.addSource("parques", { type: "geojson", data: geojsonRef.current, cluster: true, clusterRadius: 45, clusterMaxZoom: 13 });
        m.addLayer({
          id: "grupos",
          type: "circle",
          source: "parques",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#E8540C",
            "circle-opacity": 0.88,
            "circle-radius": ["step", ["get", "point_count"], 16, 25, 21, 100, 27, 500, 34],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });
        m.addLayer({
          id: "grupos-n",
          type: "symbol",
          source: "parques",
          filter: ["has", "point_count"],
          layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 13, "text-font": ["Noto Sans Bold"] },
          paint: { "text-color": "#fff" },
        });
        const colores: unknown[] = ["match", ["get", "categoria"]];
        for (const c of ORDEN) colores.push(c, CATEGORIAS[c].color);
        colores.push("#8E8E93");
        m.addLayer({
          id: "puntos",
          type: "circle",
          source: "parques",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": colores as never,
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 5, 12, 8, 16, 11],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });

        m.on("click", "grupos", async (e: MapMouseEvent) => {
          const f = m.queryRenderedFeatures(e.point, { layers: ["grupos"] })[0];
          if (!f) return;
          const fuente = m.getSource("parques") as GeoJSONSource;
          const zoom = await fuente.getClusterExpansionZoom(f.properties.cluster_id);
          m.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: zoom + 0.5 });
        });
        m.on("click", "puntos", (e: MapMouseEvent) => {
          const f = m.queryRenderedFeatures(e.point, { layers: ["puntos"] })[0];
          if (!f) return;
          const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
          const p = f.properties;
          setSeleccion({ id: p.id, nombre: p.nombre || null, categoria: p.categoria, aparatos: p.aparatos ?? null, lat, lng });
        });
        for (const capa of ["grupos", "puntos"]) {
          m.on("mouseenter", capa, () => (m.getCanvas().style.cursor = "pointer"));
          m.on("mouseleave", capa, () => (m.getCanvas().style.cursor = ""));
        }
        m.on("click", (e) => {
          if (!m.queryRenderedFeatures(e.point, { layers: ["grupos", "puntos"] }).length) setSeleccion(null);
        });
        listo.current = true;
        setCargandoMapa(false);
        (m.getSource("parques") as GeoJSONSource).setData(geojsonRef.current);
      });
      nuevo.on("error", (ev) => {
        if (!listo.current) setAviso("El mapa base tarda en cargar. Revisa tu conexión.");
        console.warn("mapa", ev?.error?.message);
      });
    })();
    return () => {
      cancelado = true;
      listo.current = false;
      instancia?.remove();
      mapa.current = null;
    };
  }, []);

  // 3. Actualiza puntos al cambiar filtros o llegar los datos
  useEffect(() => {
    if (!listo.current || !mapa.current) return;
    (mapa.current.getSource("parques") as GeoJSONSource | undefined)?.setData(geojson);
  }, [geojson]);

  function alternar(c: CategoriaParque) {
    setActivas((previas) => {
      const n = new Set(previas);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });
  }

  function irA(lng: number, lat: number, zoom = 15) {
    mapa.current?.flyTo({ center: [lng, lat], zoom, essential: true });
  }

  function cercaDeMi() {
    setAviso("");
    if (!navigator.geolocation) return setAviso("Tu navegador no permite ubicarte.");
    setAviso("Buscando tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // La ubicación se usa solo en tu dispositivo: no se envía a ningún servidor.
        const { latitude: la, longitude: lo } = pos.coords;
        irA(lo, la, 12);
        const cerca = puntos
          .filter((p) => activas.has(p[3]))
          .map((p) => ({ p, d: Math.hypot((p[1] - la) * 111, (p[2] - lo) * 111 * Math.cos((la * Math.PI) / 180)) }))
          .sort((a, b) => a.d - b.d)[0];
        setAviso(cerca ? `El parque más cercano está a ${cerca.d < 1 ? "menos de 1" : Math.round(cerca.d)} km.` : "");
        if (cerca) {
          const [id, plat, plng, categoria, aparatos, nombre] = cerca.p;
          setSeleccion({ id, nombre, categoria, aparatos, lat: plat, lng: plng });
        }
      },
      () => setAviso("No pudimos obtener tu ubicación. Revisa el permiso del navegador."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (q.length < 2) return [];
    return puntos.filter((p) => p[5] && p[5].toLowerCase().includes(q)).slice(0, 6);
  }, [busqueda, puntos]);

  const conteo = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of puntos) c[p[3]] = (c[p[3]] ?? 0) + 1;
    return c;
  }, [puntos]);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <input
            className="campo"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar un parque por nombre"
            aria-label="Buscar un parque por nombre"
          />
          {resultados.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-borde bg-card shadow-lg">
              {resultados.map((p) => (
                <li key={p[0]}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-bg"
                    onClick={() => {
                      setBusqueda("");
                      irA(p[2], p[1]);
                      setSeleccion({ id: p[0], nombre: p[5], categoria: p[3], aparatos: p[4], lat: p[1], lng: p[2] });
                    }}
                  >
                    {p[5]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" onClick={cercaDeMi} className="btn btn-lava">📍 Cerca de mí</button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipos de parque">
        {ORDEN.map((c) => {
          const on = activas.has(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => alternar(c)}
              title={CATEGORIAS[c].detalle}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${on ? "border-texto" : "border-borde text-suave opacity-70"}`}
            >
              <span aria-hidden className="inline-block h-3 w-3 rounded-full border border-white" style={{ background: CATEGORIAS[c].color }} />
              {CATEGORIAS[c].nombre}
              {conteo[c] ? <span className="text-xs text-suave">{conteo[c].toLocaleString("es")}</span> : null}
            </button>
          );
        })}
      </div>

      {(aviso || error) && <p className={error ? "aviso-error" : "aviso-ok"} role="status">{error || aviso}</p>}

      <div className="relative overflow-hidden rounded-2xl border border-borde" style={{ height: alto, minHeight: 360 }}>
        <div ref={contenedor} className="absolute inset-0" aria-label="Mapa de parques de calistenia" />
        {cargandoMapa && (
          <div className="absolute inset-0 grid place-items-center bg-card text-suave">Cargando el mapa…</div>
        )}
        {seleccion && (
          <div className="absolute inset-x-3 bottom-8 z-10 mx-auto grid max-w-md gap-2 rounded-xl border border-borde bg-card p-4 shadow-xl">
            <button type="button" onClick={() => setSeleccion(null)} className="absolute right-3 top-2 text-suave hover:text-lava" aria-label="Cerrar">✕</button>
            <p className="flex items-center gap-2 text-xs text-suave">
              <span aria-hidden className="inline-block h-3 w-3 rounded-full" style={{ background: CATEGORIAS[seleccion.categoria].color }} />
              {CATEGORIAS[seleccion.categoria].nombre}
            </p>
            <p className="pr-6 text-lg font-bold">{nombreParque(seleccion.nombre, seleccion.categoria)}</p>
            {seleccion.aparatos ? <p className="text-sm text-suave">{seleccion.aparatos} aparato(s) registrados</p> : null}
            <div className="flex flex-wrap gap-2">
              <Link href={`/parque/${seleccion.id}`} className="btn btn-lava !py-1.5">Ver ficha</Link>
              <a href={urlComoLlegar(seleccion.lat, seleccion.lng)} target="_blank" rel="noopener noreferrer" className="btn btn-borde !py-1.5">Cómo llegar</a>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-suave">
        Mapa © OpenFreeMap, datos © colaboradores de OpenStreetMap (ODbL). Parques: OpenStreetMap y fuentes oficiales. Tu ubicación se usa solo en tu dispositivo.
      </p>
    </div>
  );
}
