"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";

type Marca = { id: string; ejercicio: string; valor: number; unidad: string; fecha: string };
const UNIDADES: Record<string, string> = { reps: "repeticiones", seg: "segundos", kg: "kg de lastre" };
const SUGERENCIAS = ["Dominadas", "Flexiones", "Fondos en paralelas", "Sentadillas", "Plancha", "L-sit", "Muscle up", "Pino"];

export default function FormularioEntrenamiento({
  usuarioId,
  medidas,
  salud,
  marcas,
}: {
  usuarioId: string;
  medidas: { peso_kg: number | null; estatura_cm: number | null } | null;
  salud: { lesiones: string | null; notas: string | null } | null;
  marcas: Marca[];
}) {
  const router = useRouter();
  const [peso, setPeso] = useState(medidas?.peso_kg?.toString() ?? "");
  const [estatura, setEstatura] = useState(medidas?.estatura_cm?.toString() ?? "");
  const [lesiones, setLesiones] = useState(salud?.lesiones ?? "");
  const [notas, setNotas] = useState(salud?.notas ?? "");
  const [ejercicio, setEjercicio] = useState("");
  const [valor, setValor] = useState("");
  const [unidad, setUnidad] = useState("reps");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  const p = parseFloat(peso);
  const e = parseFloat(estatura);
  const imc = p > 0 && e > 0 ? (p / Math.pow(e / 100, 2)).toFixed(1) : null;

  async function guardarDatos(ev: React.FormEvent) {
    ev.preventDefault();
    setMsg(null);
    if (peso && !(p >= 25 && p <= 300)) return setMsg({ ok: false, texto: "El peso debe estar entre 25 y 300 kg." });
    if (estatura && !(e >= 100 && e <= 250)) return setMsg({ ok: false, texto: "La estatura debe estar entre 100 y 250 cm." });
    setCargando(true);
    const sb = crearCliente();
    const ahora = new Date().toISOString();
    const r1 = await sb.from("perfil_medidas").upsert({ usuario_id: usuarioId, peso_kg: peso ? p : null, estatura_cm: estatura ? e : null, actualizado_en: ahora });
    const r2 = await sb.from("perfil_salud").upsert({ usuario_id: usuarioId, lesiones: lesiones.trim() || null, notas: notas.trim() || null, actualizado_en: ahora });
    setCargando(false);
    setMsg(r1.error || r2.error ? { ok: false, texto: "No pudimos guardar tus datos." } : { ok: true, texto: "Datos guardados ✓" });
  }

  async function agregarMarca(ev: React.FormEvent) {
    ev.preventDefault();
    setMsg(null);
    const v = parseFloat(valor);
    if (ejercicio.trim().length < 2 || !(v > 0)) return setMsg({ ok: false, texto: "Escribe el ejercicio y un valor mayor que cero." });
    setCargando(true);
    const { error } = await crearCliente().from("marcas").insert({ usuario_id: usuarioId, ejercicio: ejercicio.trim(), valor: v, unidad });
    setCargando(false);
    if (error) setMsg({ ok: false, texto: "No pudimos guardar la marca." });
    else {
      setEjercicio("");
      setValor("");
      router.refresh();
    }
  }

  async function borrar(id: string) {
    await crearCliente().from("marcas").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={agregarMarca} className="tarjeta grid gap-3">
        <h3 className="text-lg">Mis marcas</h3>
        <p className="text-sm text-suave">Tus máximos: cuántas repeticiones, segundos o lastre logras hoy.</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_6rem_9rem_auto]">
          <input className="campo" list="sugerencias" value={ejercicio} onChange={(ev) => setEjercicio(ev.target.value)} placeholder="Ejercicio" aria-label="Ejercicio" maxLength={60} />
          <datalist id="sugerencias">{SUGERENCIAS.map((s) => <option key={s} value={s} />)}</datalist>
          <input className="campo" type="number" step="0.5" min="0" value={valor} onChange={(ev) => setValor(ev.target.value)} placeholder="0" aria-label="Valor" />
          <select className="campo" value={unidad} onChange={(ev) => setUnidad(ev.target.value)} aria-label="Unidad">
            {Object.entries(UNIDADES).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
          <button className="btn btn-lava" disabled={cargando}>Agregar</button>
        </div>
        {marcas.length > 0 && (
          <ul className="grid gap-1 text-sm">
            {marcas.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 border-t border-borde pt-1">
                <span>
                  <strong>{m.ejercicio}</strong>: {m.valor} {UNIDADES[m.unidad]}{" "}
                  <span className="text-suave">· {new Date(m.fecha + "T12:00:00").toLocaleDateString("es")}</span>
                </span>
                <button type="button" onClick={() => borrar(m.id)} className="text-suave hover:text-lava" aria-label={`Borrar ${m.ejercicio}`}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </form>

      <form onSubmit={guardarDatos} className="tarjeta grid gap-3">
        <h3 className="text-lg">Medidas y salud</h3>
        <p className="text-sm text-suave">Privado. Solo lo ve un entrenador si tú decides compartirlo.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">
            Peso (kg)
            <input className="campo" type="number" step="0.1" value={peso} onChange={(ev) => setPeso(ev.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Estatura (cm)
            <input className="campo" type="number" step="0.5" value={estatura} onChange={(ev) => setEstatura(ev.target.value)} />
          </label>
        </div>
        {imc && <p className="text-sm">IMC calculado: <strong>{imc}</strong> <span className="text-suave">(orientativo; no mide masa muscular)</span></p>}
        <label className="grid gap-1 text-sm">
          Lesiones o molestias (opcional)
          <textarea className="campo" rows={2} maxLength={1000} value={lesiones} onChange={(ev) => setLesiones(ev.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          Notas de salud (opcional)
          <textarea className="campo" rows={2} maxLength={1000} value={notas} onChange={(ev) => setNotas(ev.target.value)} />
        </label>
        <button className="btn btn-lava justify-self-start" disabled={cargando}>Guardar datos</button>
      </form>
      {msg && <p className={msg.ok ? "aviso-ok" : "aviso-error"} role={msg.ok ? "status" : "alert"}>{msg.texto}</p>}
    </div>
  );
}
