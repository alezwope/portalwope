"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Map as MapaMapLibre, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { crearCliente } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/social";
import { nombreParque, type PuntoParque } from "@/lib/parques";
import SelectorUbicacion, { type Ubicacion } from "@/components/SelectorUbicacion";

export type Sede = { id: string; nombre: string; horario: string | null; ciudad: string | null; lat: number; lng: number; parque_id: string | null };

export default function Sedes({ paginaId, sedes, ubicacion }: { paginaId: string; sedes: Sede[]; ubicacion: Ubicacion }) {
  const router = useRouter();
  const [agregando, setAgregando] = useState(false);
  const [msg, setMsg] = useState("");

  async function borrar(id: string) {
    if (!window.confirm("¿Borrar esta sede?")) return;
    const { error } = await crearCliente().rpc("borrar_sede", { p_id: id });
    if (error) setMsg(mensajeError(error));
    else router.refresh();
  }

  return (
    <section className="tarjeta grid gap-3" aria-label="Sedes">
      <div>
        <h2 className="text-xl text-lava">Dónde das clase</h2>
        <p className="text-sm text-suave">Cada sede aparece como un pin de tu escuela en el mapa. Puedes tener hasta 10.</p>
      </div>
      {sedes.length === 0 && !agregando && <p className="text-suave">Aún no agregaste ninguna sede.</p>}
      <ul className="grid gap-2">
        {sedes.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-borde p-3">
            <div>
              <p className="font-bold">📍 {s.nombre}</p>
              <p className="text-sm text-suave">{[s.horario, s.ciudad].filter(Boolean).join(" · ")}</p>
            </div>
            <button onClick={() => borrar(s.id)} className="text-sm text-suave hover:text-lava">Borrar</button>
          </li>
        ))}
      </ul>
      {msg && <p className="aviso-error" role="alert">{msg}</p>}
      {agregando ? (
        <FormularioSede paginaId={paginaId} ubicacion={ubicacion} onListo={() => { setAgregando(false); router.refresh(); }} onCancelar={() => setAgregando(false)} />
      ) : (
        sedes.length < 10 && <button className="btn btn-lava justify-self-start" onClick={() => setAgregando(true)}>+ Agregar una sede</button>
      )}
    </section>
  );
}

function FormularioSede({ paginaId, ubicacion, onListo, onCancelar }: { paginaId: string; ubicacion: Ubicacion; onListo: () => void; onCancelar: () => void }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaMapLibre | null>(null);
  const marcador = useRef<Marker | null>(null);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const [nombre, setNombre] = useState("");
  const [horario, setHorario] = useState("");
  const [ciudad, setCiudad] = useState<Ubicacion>(ubicacion);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [parque, setParque] = useState<string | null>(null);
  const [parques, setParques] = useState<PuntoParque[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    fetch("/api/parques").then((r) => r.json()).then(setParques).catch(() => {});
  }, []);

  function ponerPin(lat: number, lng: number, idParque: string | null = null) {
    setPin({ lat, lng });
    setParque(idParque);
    const m = mapa.current;
    if (!m || !lib.current) return;
    if (!marcador.current) marcador.current = new lib.current.Marker({ color: "#E8540C" }).setLngLat([lng, lat]).addTo(m);
    else marcador.current.setLngLat([lng, lat]);
  }

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const ml = await import("maplibre-gl");
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      if (cancelado || !contenedor.current) return;
      lib.current = ml;
      const m = new ml.Map({
        container: contenedor.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: ubicacion.lng != null ? [ubicacion.lng, ubicacion.lat!] : [-58.4, -34.6],
        zoom: ubicacion.lng != null ? 11 : 3,
        attributionControl: { compact: true },
      });
      mapa.current = m;
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      m.on("click", (e) => ponerPin(e.lngLat.lat, e.lngLat.lng));
    })();
    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
      marcador.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al elegir la ciudad, el mapa se centra ahí.
  useEffect(() => {
    if (ciudad.lng != null) mapa.current?.flyTo({ center: [ciudad.lng, ciudad.lat!], zoom: 12 });
  }, [ciudad.lat, ciudad.lng]);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (q.length < 2) return [];
    const cerca = (p: PuntoParque) => (ciudad.lat != null ? Math.hypot(p[1] - ciudad.lat, p[2] - ciudad.lng!) : 0);
    return parques.filter((p) => p[5] && p[5].toLowerCase().includes(q)).sort((a, b) => cerca(a) - cerca(b)).slice(0, 6);
  }, [busqueda, parques, ciudad.lat, ciudad.lng]);

  function miUbicacion() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        ponerPin(pos.coords.latitude, pos.coords.longitude);
        mapa.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 16 });
      },
      () => setError("No pudimos obtener tu ubicación. Marca el lugar en el mapa."),
    );
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!pin) return setError("Marca el lugar en el mapa (toca el mapa o busca el parque).");
    setCargando(true);
    const { error } = await crearCliente().rpc("agregar_sede", {
      p_pagina: paginaId, p_nombre: nombre, p_horario: horario, p_ciudad: ciudad.ciudad, p_pais: ciudad.pais || null,
      p_lat: pin.lat, p_lng: pin.lng, p_parque: parque,
    });
    setCargando(false);
    if (error) return setError(mensajeError(error));
    onListo();
  }

  return (
    <form onSubmit={guardar} className="grid gap-3 rounded-lg border border-borde p-3">
      <p className="font-bold">Nueva sede</p>
      <SelectorUbicacion etiqueta="¿En qué ciudad?" valor={ciudad} onCambio={setCiudad} />
      <div className="relative">
        <input className="campo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Busca el parque por nombre (opcional)" aria-label="Buscar parque por nombre" />
        {resultados.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-borde bg-card shadow-lg">
            {resultados.map((p) => (
              <li key={p[0]}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-bg"
                  onClick={() => {
                    setBusqueda("");
                    ponerPin(p[1], p[2], p[0]);
                    mapa.current?.flyTo({ center: [p[2], p[1]], zoom: 16 });
                    if (!nombre) setNombre(nombreParque(p[5], p[3]));
                  }}
                >
                  {p[5]}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="relative overflow-hidden rounded-xl border border-borde" style={{ height: 300 }}>
        <div ref={contenedor} className="absolute inset-0" aria-label="Mapa para marcar la sede" />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button type="button" className="btn btn-borde !py-1" onClick={miUbicacion}>📍 Usar mi ubicación actual</button>
        <span className="text-suave">{pin ? `✓ Lugar marcado${parque ? " (parque del mapa)" : ""}. Toca el mapa para moverlo.` : "Toca el mapa para marcar el lugar exacto."}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">Nombre de la sede
          <input className="campo" required minLength={2} maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Parque Centenario" />
        </label>
        <label className="grid gap-1 text-sm">Días y horarios (opcional)
          <input className="campo" maxLength={120} value={horario} onChange={(e) => setHorario(e.target.value)} placeholder="Sábados 10:00" />
        </label>
      </div>
      {error && <p className="aviso-error" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-lava" disabled={cargando}>{cargando ? "Guardando…" : "Guardar sede"}</button>
        <button type="button" className="btn btn-borde" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
