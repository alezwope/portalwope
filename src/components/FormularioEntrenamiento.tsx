"use client";

import { useState } from "react";
import Link from "next/link";
import { useTextos } from "@/components/Idioma";
import { crearCliente } from "@/lib/supabase/client";


export default function FormularioEntrenamiento({
  usuarioId,
  medidas,
  salud,
}: {
  usuarioId: string;
  medidas: { peso_kg: number | null; estatura_cm: number | null } | null;
  salud: { lesiones: string | null; notas: string | null } | null;
}) {
  const { t } = useTextos();
  const [peso, setPeso] = useState(medidas?.peso_kg?.toString() ?? "");
  const [estatura, setEstatura] = useState(medidas?.estatura_cm?.toString() ?? "");
  const [lesiones, setLesiones] = useState(salud?.lesiones ?? "");
  const [notas, setNotas] = useState(salud?.notas ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  const p = parseFloat(peso);
  const e = parseFloat(estatura);
  const imc = p > 0 && e > 0 ? (p / Math.pow(e / 100, 2)).toFixed(1) : null;

  async function guardarDatos(ev: React.FormEvent) {
    ev.preventDefault();
    setMsg(null);
    if (peso && !(p >= 25 && p <= 300)) return setMsg({ ok: false, texto: t["ent2.errPeso"] });
    if (estatura && !(e >= 100 && e <= 250)) return setMsg({ ok: false, texto: t["ent2.errEstatura"] });
    setCargando(true);
    const sb = crearCliente();
    const ahora = new Date().toISOString();
    const r1 = await sb.from("perfil_medidas").upsert({ usuario_id: usuarioId, peso_kg: peso ? p : null, estatura_cm: estatura ? e : null, actualizado_en: ahora });
    const r2 = await sb.from("perfil_salud").upsert({ usuario_id: usuarioId, lesiones: lesiones.trim() || null, notas: notas.trim() || null, actualizado_en: ahora });
    setCargando(false);
    setMsg(r1.error || r2.error ? { ok: false, texto: t["ent2.errDatos"] } : { ok: true, texto: t["ent2.okDatos"] });
  }

  return (
    <div className="grid gap-4">
      <section className="tarjeta grid gap-2">
        <h3 className="text-lg">{t["ent2.marcas"]}</h3>
        <p className="text-sm text-suave">{t["ent2.marcasTexto"]}</p>
        <Link href="/panel/progreso#diario" className="btn btn-lava justify-self-start">{t["entrenar.marcas"]}</Link>
      </section>

      <form onSubmit={guardarDatos} className="tarjeta grid gap-3">
        <h3 className="text-lg">{t["ent2.medidas"]}</h3>
        <p className="text-sm text-suave">{t["ent2.privado"]}</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">
            {t["ent2.peso"]}
            <input className="campo" type="number" step="0.1" value={peso} onChange={(ev) => setPeso(ev.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            {t["ent2.estatura"]}
            <input className="campo" type="number" step="0.5" value={estatura} onChange={(ev) => setEstatura(ev.target.value)} />
          </label>
        </div>
        {imc && <p className="text-sm">{t["ent2.imc"]} <strong>{imc}</strong> <span className="text-suave">{t["ent2.imcNota"]}</span></p>}
        <label className="grid gap-1 text-sm">
          {t["ent2.lesiones"]}
          <textarea className="campo" rows={2} maxLength={1000} value={lesiones} onChange={(ev) => setLesiones(ev.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          {t["ent2.notas"]}
          <textarea className="campo" rows={2} maxLength={1000} value={notas} onChange={(ev) => setNotas(ev.target.value)} />
        </label>
        <button className="btn btn-lava justify-self-start" disabled={cargando}>{t["ent2.guardar"]}</button>
      </form>
      {msg && <p className={msg.ok ? "aviso-ok" : "aviso-error"} role={msg.ok ? "status" : "alert"}>{msg.texto}</p>}
    </div>
  );
}
