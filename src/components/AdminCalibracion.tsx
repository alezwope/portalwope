"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";
import { cargarMotor, type ArenaPose } from "@/lib/pose";
import { CAMARA } from "@/lib/nivelador";
import { UMBRALES, proponerCamara, proponerUmbral, type EstCamara, type Par } from "@/lib/calibracion";
import type { EstNivel } from "@/app/admin/calibracion/page";

type Guardado = { ejercicio: string; valores: Record<string, number>; version: number; nota: string | null; actualizado_en: string };
const EJERCICIOS = [...new Set(Object.values(CAMARA).map((c) => c.ejercicio))];
const NIVELES = ["genesis", "fenix", "guerrero", "maestro", "titan"] as const;

function Ejercicio({ ej, motor, guardado, est }: { ej: string; motor: ArenaPose; guardado?: Guardado; est?: EstCamara }) {
  const router = useRouter();
  const par = (motor.par[ej] ?? []) as Par[];
  const fabrica = motor.def[ej] ?? {};
  const actual = useMemo(() => ({ ...fabrica, ...(guardado?.valores ?? {}) }), [fabrica, guardado]);
  const [vals, setVals] = useState<Record<string, number>>(actual);
  const [nota, setNota] = useState("");
  const [msg, setMsg] = useState("");
  const sostenido = motor.sostenido(ej);
  const prop = proponerCamara(est, par, actual, sostenido);

  async function guardar(v: Record<string, number>) {
    const { error } = await crearCliente().rpc("admin_calibracion", { p_ejercicio: ej, p_valores: v, p_nota: nota });
    setMsg(error ? error.message : "Guardado ✓ (el motor lo usa desde la próxima vez que alguien abra la cámara)");
    if (!error) router.refresh();
  }

  return (
    <section className="tarjeta grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg">{ej}{sostenido ? " · sostenido" : ""}</h3>
        <span className="text-xs text-suave">{guardado ? `versión ${guardado.version} · ${new Date(guardado.actualizado_en).toLocaleDateString()}` : "valores de fábrica"}</span>
      </div>
      {est ? (
        <p className="text-sm">
          <span className="num">{est.n}</span> pruebas · <span className="num">{est.personas}</span> personas · acierta <span className="num">{est.dentro_pct}%</span> · exacto <span className="num">{est.exacto_pct}%</span> · sesgo <span className="num">{est.sesgo_pct ?? 0}%</span> · error medio <span className="num">{est.error_abs}</span> · móvil {est.movil_pct}%
        </p>
      ) : <p className="text-sm text-suave">Sin pruebas con cámara todavía.</p>}
      <p className={prop.tipo === "ajuste" ? "aviso-error" : "text-sm text-suave"}>{prop.texto}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {par.map(([k, etiqueta, min, max, paso]) => (
          <label key={k} className="grid gap-1 text-sm">
            <span>{etiqueta} <span className="text-xs text-suave">({k} · fábrica {fabrica[k]} · {min}–{max})</span></span>
            <input className="campo num !py-1" type="number" min={min} max={max} step={paso} value={vals[k] ?? ""}
              onChange={(e) => setVals((p) => ({ ...p, [k]: Number(e.target.value) }))} />
            {prop.tipo === "ajuste" && prop.valores[k] != null && <span className="text-xs text-dorado">Propuesta: {prop.valores[k]}</span>}
          </label>
        ))}
      </div>
      <input className="campo !py-1 text-sm" maxLength={300} placeholder="Nota del cambio (por qué)" value={nota} onChange={(e) => setNota(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {prop.tipo === "ajuste" && <button type="button" className="btn btn-borde !py-1" onClick={() => setVals((p) => ({ ...p, ...prop.valores }))}>Cargar propuesta</button>}
        <button type="button" className="btn btn-lava !py-1" onClick={() => guardar(vals)}>Guardar</button>
        <button type="button" className="btn btn-borde !py-1" onClick={() => { setVals(fabrica); }}>Volver a fábrica</button>
      </div>
      {guardado?.nota && <p className="text-xs text-suave">Última nota: {guardado.nota}</p>}
      {msg && <p className="text-sm" role="status">{msg}</p>}
    </section>
  );
}

export default function AdminCalibracion({ guardados, camara, nivel, soloCamara }: { guardados: Guardado[]; camara: EstCamara[]; nivel: EstNivel[]; soloCamara: boolean }) {
  const [motor, setMotor] = useState<ArenaPose | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { cargarMotor().then(setMotor, () => setError("No se pudo cargar el motor de cámara.")); }, []);
  const g = (ej: string) => guardados.find((x) => x.ejercicio === ej);
  const est = (ej: string) => camara.find((x) => x.ejercicio === ej);
  const celda = (campo: string, nv: string) => nivel.find((x) => x.campo === campo && x.nivel === nv);

  return (
    <div className="grid gap-5">
      <section className="tarjeta grid gap-2">
        <h2 className="text-xl">Calibración</h2>
        <p className="text-sm text-suave">
          La cámara y el nivelador <strong>nunca se ajustan solos</strong>: aquí ves los datos y una propuesta; tú decides y guardas. Cada cambio queda con versión y en la auditoría. Nadie pierde un nivel ya ganado.
        </p>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl">1. Cámara (últimos 90 días)</h2>
        <p className="text-sm text-suave">Se compara lo que contó la cámara con lo que la persona confirmó («¿Fue así?»). Solo números, sin imágenes. Propuesta desde {20} pruebas de {5} personas.</p>
        {error && <p className="aviso-error">{error}</p>}
        {!motor && !error && <p className="text-sm text-suave">Cargando el motor…</p>}
        {motor && EJERCICIOS.map((ej) => <Ejercicio key={ej} ej={ej} motor={motor} guardado={g(ej)} est={est(ej)} />)}
      </section>

      <section className="tarjeta grid gap-3 overflow-x-auto">
        <h2 className="text-xl">2. Nivelador: qué hace la gente de cada nivel</h2>
        <p className="text-sm text-suave">
          Percentiles 25/50/75 de la última prueba de cada persona. Datos anónimos y agregados. Mientras casi todo sea declarado, tómalo como orientación: lo fiable llega con las pruebas por cámara y los verificados (fase 1.3).
        </p>
        <div className="flex gap-2">
          <Link href="/admin/calibracion" className={`btn !py-1 ${soloCamara ? "btn-borde" : "btn-lava"}`}>Todas las pruebas</Link>
          <Link href="/admin/calibracion?camara=1" className={`btn !py-1 ${soloCamara ? "btn-lava" : "btn-borde"}`}>Solo con cámara</Link>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-suave"><tr><th className="py-1">Prueba</th>{NIVELES.map((n) => <th key={n} className="px-2 capitalize">{n}</th>)}</tr></thead>
          <tbody>
            {Object.keys(UMBRALES).map((campo) => (
              <tr key={campo} className="border-t border-borde align-top">
                <td className="py-2 font-mono text-xs">{campo}</td>
                {NIVELES.map((nv) => {
                  const c = celda(campo, nv);
                  const u = (UMBRALES[campo] as Record<string, number | undefined>)[nv];
                  return (
                    <td key={nv} className="px-2 py-2">
                      {u != null && <span className="block text-xs text-suave">umbral {u}</span>}
                      {c ? <span className="num block">{Math.round(c.p25)} · <strong>{Math.round(c.p50)}</strong> · {Math.round(c.p75)} <span className="text-xs text-suave">(n {c.n})</span></span> : <span className="text-xs text-suave">sin datos</span>}
                      {c && <span className="block text-xs">{proponerUmbral(u, c.n, c.p25, c.p50)}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
