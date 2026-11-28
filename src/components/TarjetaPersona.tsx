"use client";

import { nomCat } from "@/lib/i18n/diccionarios";
import { useTextos } from "@/components/Idioma";
import type { Tarjeta } from "@/lib/entrenador";
import { OBJETIVOS, nivelDe, type Objetivo } from "@/lib/catalogos";

const UNIDAD: Record<string, string> = { reps: "reps", seg: "s", kg: "kg" };

/** Lo que el entrenador ve de una persona: siempre lo básico; medidas y salud solo si ella las comparte. */
export default function TarjetaPersona({ t, completa = false, atiende = [] }: { t: Tarjeta; completa?: boolean; atiende?: string[] }) {
  const { t: tx } = useTextos();
  const nivel = nivelDe(t.nivel);
  const fueraDeNivel = atiende.length > 0 && t.nivel && !atiende.includes(t.nivel);
  // Mejor marca por ejercicio.
  const mejores = new Map<string, { valor: number; unidad: string }>();
  for (const m of t.marcas ?? []) {
    const actual = mejores.get(m.ejercicio);
    if (!actual || Number(m.valor) > actual.valor) mejores.set(m.ejercicio, { valor: Number(m.valor), unidad: m.unidad });
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-bold">@{t.alias}</span>
        {nivel ? (
          <span className="rounded-full border px-2 text-xs" style={{ borderColor: nivel.color, color: nivel.color }}>{nivel.nombre}</span>
        ) : (
          <span className="rounded-full border border-borde px-2 text-xs text-suave">{tx["tarj.sinNivel"]}</span>
        )}
        {t.objetivo && <span className="text-sm text-suave">· {nomCat(tx, "obj", t.objetivo, OBJETIVOS[t.objetivo as Objetivo])}</span>}
        {(t.ciudad || t.pais) && <span className="text-sm text-suave">· {[t.ciudad, t.pais].filter(Boolean).join(", ")}</span>}
      </div>
      {fueraDeNivel && <p className="text-xs text-dorado">{tx["tarj.fuera"]}</p>}
      {t.mensaje && <p className="rounded-lg bg-bg p-2 text-sm">“{t.mensaje}”</p>}
      {mejores.size > 0 ? (
        <ul className="flex flex-wrap gap-2 text-sm">
          {[...mejores].slice(0, completa ? 50 : 6).map(([ej, m]) => (
            <li key={ej} className="rounded-lg border border-borde px-2 py-0.5">{ej}: <strong>{m.valor} {UNIDAD[m.unidad]}</strong></li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-suave">{tx["tarj.sinMarcas"]}</p>
      )}
      {t.comparte_medidas ? (
        <p className="text-sm">
          {t.peso_kg ? `${t.peso_kg} kg` : tx["tarj.sinPeso"]} · {t.estatura_cm ? `${t.estatura_cm} cm` : tx["tarj.sinEstatura"]}
          {t.imc ? ` · IMC ${t.imc}` : ""}
        </p>
      ) : (
        <p className="text-xs text-suave">{tx["tarj.noMedidas"]}</p>
      )}
      {t.comparte_salud ? (
        (t.lesiones || t.notas_salud) && (
          <p className="text-sm"><strong>{tx["tarj.salud"]}</strong> {[t.lesiones, t.notas_salud].filter(Boolean).join(" · ")}</p>
        )
      ) : (
        <p className="text-xs text-suave">{tx["tarj.noSalud"]}</p>
      )}
      {completa && t.bio && <p className="text-sm text-suave">{t.bio}</p>}
    </div>
  );
}
