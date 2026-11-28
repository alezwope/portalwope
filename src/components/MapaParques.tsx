"use client";

import { useTextos } from "@/components/Idioma";
import { nomCat, rellenar } from "@/lib/i18n/diccionarios";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Map as MapaMapLibre, GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CATEGORIAS, nombreParque, urlComoLlegar, type CategoriaParque, type PuntoParque } from "@/lib/parques";

const ORDEN: CategoriaParque[] = ["calistenia_oficial", "calistenia_etiquetada", "probable_calistenia", "estacion_fitness"];
const ESTILO = "https://tiles.openfreemap.org/styles/liberty";

type Calor = [string, number, number][];
type Escuela = [string, string, string, number, number]; // slug, escuela, sede, lat, lng
type EscuelaSel = { slug: string; nombre: string; sede: string };
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
  const { t, idioma } = useTextos();
  const nomC = (c: CategoriaParque) => nomCat(t, "cat", c, CATEGORIAS[c].nombre);
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
  const [calorOn, setCalorOn] = useState(false);
  const [calor, setCalor] = useState<Calor | null>(null);
  const [escuelasOn, setEscuelasOn] = useState(false);
  const [escuelas, setEscuelas] = useState<Escuela[] | null>(null);
  const [escuelaSel, setEscuelaSel] = useState<EscuelaSel | null>(null);
  const escuelasOnRef = useRef(false);

  // 1. Datos
  useEffect(() => {
    let vivo = true;
    fetch("/api/parques")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: PuntoParque[]) => vivo && setPuntos(d))
      .catch(() => vivo && setError(t["mapa.errParques"]));
    return () => {
      vivo = false;
    };
  }, []);

  const geojson = useMemo(() => aGeoJSON(puntos, activas), [puntos, activas]);
  const geojsonRef = useRef(geojson);
  useEffect(() => {
    geojsonRef.current = geojson;
  }, [geojson]);

  const calorGeo = useMemo(() => {
    const act = new Map((calor ?? []).map((c) => [c[0], c]));
    return {
      type: "FeatureCollection" as const,
      features: puntos
        .filter((p) => act.has(p[0]))
        .map((p) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [p[2], p[1]] },
          properties: { n30: act.get(p[0])![1], ahora: act.get(p[0])![2] },
        })),
    };
  }, [puntos, calor]);
  const calorRef = useRef(calorGeo);
  useEffect(() => {
    calorRef.current = calorGeo;
  }, [calorGeo]);
  const calorOnRef = useRef(false);
  const escuelasGeo = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: (escuelas ?? []).map((e) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [e[4], e[3]] },
        properties: { slug: e[0], nombre: e[1], sede: e[2] },
      })),
    }),
    [escuelas],
  );
  const escuelasRef = useRef(escuelasGeo);
  useEffect(() => {
    escuelasRef.current = escuelasGeo;
  }, [escuelasGeo]);

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
        const vis = calorOnRef.current ? "visible" : "none";
        m.addSource("calor", { type: "geojson", data: calorRef.current });
        m.addLayer(
          {
            id: "calor-mapa",
            type: "heatmap",
            source: "calor",
            layout: { visibility: vis },
            paint: {
              "heatmap-weight": ["interpolate", ["linear"], ["get", "n30"], 1, 0.3, 20, 1],
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 12, 2],
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 3, 14, 12, 40, 16, 60],
              "heatmap-opacity": 0.85,
              "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(232,84,12,0)", 0.25, "rgba(212,160,23,0.55)", 0.55, "rgba(232,84,12,0.8)", 1, "rgba(255,60,20,0.95)"],
            },
          },
          "grupos",
        );
        m.addLayer({
          id: "calor-ahora",
          type: "circle",
          source: "calor",
          filter: [">", ["get", "ahora"], 0],
          layout: { visibility: vis },
          paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 9, 14, 18], "circle-color": "rgba(0,0,0,0)", "circle-stroke-width": 3, "circle-stroke-color": "#D4A017" },
        });
        m.addSource("escuelas", { type: "geojson", data: escuelasRef.current });
        m.addLayer({
          id: "escuelas-pin",
          type: "circle",
          source: "escuelas",
          layout: { visibility: escuelasOnRef.current ? "visible" : "none" },
          paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 7, 14, 12], "circle-color": "#D4A017", "circle-stroke-width": 3, "circle-stroke-color": "#0D0B0A" },
        });
        m.on("click", "escuelas-pin", (e: MapMouseEvent) => {
          const f = m.queryRenderedFeatures(e.point, { layers: ["escuelas-pin"] })[0];
          if (!f) return;
          setSeleccion(null);
          setEscuelaSel({ slug: f.properties.slug, nombre: f.properties.nombre, sede: f.properties.sede });
        });
        m.on("mouseenter", "escuelas-pin", () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", "escuelas-pin", () => (m.getCanvas().style.cursor = ""));
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
          if (!m.queryRenderedFeatures(e.point, { layers: ["grupos", "puntos", "escuelas-pin"] }).length) {
            setSeleccion(null);
            setEscuelaSel(null);
          }
        });
        listo.current = true;
        setCargandoMapa(false);
        (m.getSource("parques") as GeoJSONSource).setData(geojsonRef.current);
      });
      nuevo.on("error", (ev) => {
        if (!listo.current) setAviso(t["mapa.lento"]);
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

  useEffect(() => {
    calorOnRef.current = calorOn;
    if (calorOn && !calor) {
      fetch("/api/calor")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: Calor) => setCalor(d))
        .catch(() => setAviso(t["mapa.errCalor"]));
    }
    const m = mapa.current;
    if (!listo.current || !m) return;
    for (const id of ["calor-mapa", "calor-ahora"]) m.setLayoutProperty(id, "visibility", calorOn ? "visible" : "none");
  }, [calorOn, calor]);
  useEffect(() => {
    escuelasOnRef.current = escuelasOn;
    if (escuelasOn && !escuelas) {
      fetch("/api/escuelas")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: Escuela[]) => setEscuelas(d))
        .catch(() => setAviso(t["mapa.errEscuelas"]));
    }
    const m = mapa.current;
    if (!listo.current || !m) return;
    m.setLayoutProperty("escuelas-pin", "visibility", escuelasOn ? "visible" : "none");
  }, [escuelasOn, escuelas]);
  useEffect(() => {
    if (!listo.current || !mapa.current) return;
    (mapa.current.getSource("escuelas") as GeoJSONSource | undefined)?.setData(escuelasGeo);
  }, [escuelasGeo]);
  useEffect(() => {
    if (!listo.current || !mapa.current) return;
    (mapa.current.getSource("calor") as GeoJSONSource | undefined)?.setData(calorGeo);
  }, [calorGeo]);

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
    if (!navigator.geolocation) return setAviso(t["parque.sinGeo"]);
    setAviso(t["mapa.buscandoUb"]);
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
      () => setAviso(t["parque.errGeo"]),
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
            placeholder={t["mapa.buscar"]}
            aria-label={t["mapa.buscar"]}
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
        <button type="button" onClick={cercaDeMi} className="btn btn-lava">{t["mapa.cerca"]}</button>
        <button type="button" aria-pressed={calorOn} onClick={() => setCalorOn((v) => !v)} className={`btn ${calorOn ? "btn-dorado" : "btn-borde"}`}>{t["mapa.calor"]}</button>
        <button type="button" aria-pressed={escuelasOn} onClick={() => { if (escuelasOn) setEscuelaSel(null); setEscuelasOn(!escuelasOn); }} className={`btn ${escuelasOn ? "btn-dorado" : "btn-borde"}`}>{t["mapa.escuelas"]}</button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t["mapa.tipos"]}>
        {ORDEN.map((c) => {
          const on = activas.has(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => alternar(c)}
              title={nomCat(t, "catD", c, CATEGORIAS[c].detalle)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${on ? "border-texto" : "border-borde text-suave opacity-70"}`}
            >
              <span aria-hidden className="inline-block h-3 w-3 rounded-full border border-white" style={{ background: CATEGORIAS[c].color }} />
              {nomC(c)}
              {conteo[c] ? <span className="text-xs text-suave">{conteo[c].toLocaleString(idioma)}</span> : null}
            </button>
          );
        })}
      </div>

      {calorOn && calor && (
        <p className="text-sm text-suave">
          {calor.length === 0
            ? t["mapa.sinCheckins"]
            : rellenar(t["mapa.calorTexto"], { n: calor.filter((c) => c[2] > 0).length })}
        </p>
      )}
      {(aviso || error) && <p className={error ? "aviso-error" : "aviso-ok"} role="status">{error || aviso}</p>}

      <div className="relative overflow-hidden rounded-2xl border border-borde" style={{ height: alto, minHeight: 360 }}>
        <div ref={contenedor} className="absolute inset-0" style={{ position: "absolute", inset: 0 }} aria-label={t["mapa.aria"]} />
        {cargandoMapa && (
          <div className="absolute inset-0 grid place-items-center bg-card text-suave">{t["mapa.cargando"]}</div>
        )}
        {escuelaSel && (
          <div className="absolute inset-x-3 bottom-8 z-10 mx-auto grid max-w-md gap-2 rounded-xl border border-borde bg-card p-4 shadow-xl">
            <button type="button" onClick={() => setEscuelaSel(null)} className="absolute right-3 top-2 text-suave hover:text-lava" aria-label={t["comun.cerrar"]}>✕</button>
            <p className="text-xs text-dorado">{t["mapa.escuela"]}</p>
            <p className="pr-6 text-lg font-bold">{escuelaSel.nombre}</p>
            <p className="text-sm text-suave">{t["mapa.sede"]} {escuelaSel.sede}</p>
            <Link href={`/e/${escuelaSel.slug}`} className="btn btn-lava justify-self-start !py-1.5">{t["mapa.verEscuela"]}</Link>
          </div>
        )}
        {seleccion && (
          <div className="absolute inset-x-3 bottom-8 z-10 mx-auto grid max-w-md gap-2 rounded-xl border border-borde bg-card p-4 shadow-xl">
            <button type="button" onClick={() => setSeleccion(null)} className="absolute right-3 top-2 text-suave hover:text-lava" aria-label={t["comun.cerrar"]}>✕</button>
            <p className="flex items-center gap-2 text-xs text-suave">
              <span aria-hidden className="inline-block h-3 w-3 rounded-full" style={{ background: CATEGORIAS[seleccion.categoria].color }} />
              {nomC(seleccion.categoria)}
            </p>
            <p className="pr-6 text-lg font-bold">{nombreParque(seleccion.nombre, seleccion.categoria, nomC(seleccion.categoria), t["parque.sinNombre"])}</p>
            {seleccion.aparatos ? <p className="text-sm text-suave">{rellenar(t["mapa.aparatos"], { n: seleccion.aparatos })}</p> : null}
            {calorOn && calor && (() => {
              const c = calor.find((x) => x[0] === seleccion.id);
              return c ? (
                <p className="text-sm text-dorado">{rellenar(t["mapa.entrenos30"], { n: c[1] })}{c[2] > 0 ? t["mapa.genteAhora"] : ""}</p>
              ) : (
                <p className="text-sm text-suave">{t["mapa.sinEntrenos"]}</p>
              );
            })()}
            <div className="flex flex-wrap gap-2">
              <Link href={`/parque/${seleccion.id}`} className="btn btn-lava !py-1.5">{t["mapa.verFicha"]}</Link>
              <a href={urlComoLlegar(seleccion.lat, seleccion.lng)} target="_blank" rel="noopener noreferrer" className="btn btn-borde !py-1.5">{t["parque.comoLlegar"]}</a>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-suave">
        {t["mapa.creditos"]}
      </p>
    </div>
  );
}
