"use client";

import { useEffect, useMemo, useState } from "react";
import { listaPaises, type CiudadDato } from "@/lib/paises";

export type Ubicacion = { pais: string; ciudad: string; lat?: number; lng?: number };

const sinTildes = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const cache = new Map<string, CiudadDato[]>();

async function ciudadesDe(pais: string): Promise<CiudadDato[]> {
  if (cache.has(pais)) return cache.get(pais)!;
  const r = await fetch(`/ciudades/${pais}.json`);
  const d: CiudadDato[] = r.ok ? await r.json() : [];
  cache.set(pais, d);
  return d;
}

/** País y ciudad elegidos de una lista (no escritos a mano), con coordenadas exactas. */
export default function SelectorUbicacion({ valor, onCambio, etiqueta = "Ubicación" }: { valor: Ubicacion; onCambio: (u: Ubicacion) => void; etiqueta?: string }) {
  const paises = useMemo(() => listaPaises(), []);
  const [lista, setLista] = useState<CiudadDato[]>([]);
  const [texto, setTexto] = useState(valor.ciudad);
  const [abierto, setAbierto] = useState(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    let vivo = true;
    if (valor.pais) ciudadesDe(valor.pais).then((d) => vivo && setLista(d));
    return () => {
      vivo = false;
    };
  }, [valor.pais]);

  const sugeridas = useMemo(() => {
    const q = sinTildes(texto.trim());
    if (q.length < 2) return [];
    const empieza: CiudadDato[] = [];
    const contiene: CiudadDato[] = [];
    for (const c of lista) {
      const n = sinTildes(c[0]);
      if (n.startsWith(q)) empieza.push(c);
      else if (n.includes(q)) contiene.push(c);
      if (empieza.length >= 8) break;
    }
    return [...empieza, ...contiene].slice(0, 8);
  }, [texto, lista]);

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm">{etiqueta}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          País
          <select
            className="campo"
            value={valor.pais}
            onChange={(e) => {
              setTexto("");
              setManual(false);
              onCambio({ pais: e.target.value, ciudad: "" });
            }}
          >
            <option value="">Elige tu país</option>
            {paises.map((p) => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
          </select>
        </label>
        <div className="relative grid gap-1 text-sm">
          <label htmlFor="ciudad-sel">Ciudad</label>
          <input
            id="ciudad-sel"
            className="campo"
            disabled={!valor.pais}
            value={texto}
            autoComplete="off"
            placeholder={valor.pais ? "Empieza a escribir y elige de la lista" : "Primero elige el país"}
            onChange={(e) => {
              setTexto(e.target.value);
              setAbierto(true);
              onCambio({ pais: valor.pais, ciudad: manual ? e.target.value : "" });
            }}
            onFocus={() => setAbierto(true)}
            onBlur={() => setTimeout(() => setAbierto(false), 150)}
            aria-describedby="ciudad-ayuda"
          />
          {abierto && sugeridas.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-borde bg-card shadow-lg" role="listbox">
              {sugeridas.map((c, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-bg"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setTexto(c[0]);
                      setAbierto(false);
                      onCambio({ pais: valor.pais, ciudad: c[0], lat: c[2], lng: c[3] });
                    }}
                  >
                    {c[0]}{c[1] ? <span className="text-suave"> · {c[1]}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p id="ciudad-ayuda" className="text-xs text-suave">
        {valor.ciudad && !manual ? `✓ ${valor.ciudad} seleccionada.` : "Elige tu ciudad de la lista para que la ubicación sea exacta."}{" "}
        {valor.pais && !manual && (
          <button type="button" className="underline" onClick={() => { setManual(true); onCambio({ pais: valor.pais, ciudad: texto }); }}>
            No encuentro mi ciudad
          </button>
        )}
      </p>
    </fieldset>
  );
}
