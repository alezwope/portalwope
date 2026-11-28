"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTextos } from "@/components/Idioma";
import { rellenar } from "@/lib/i18n/diccionarios";
import { crearCliente } from "@/lib/supabase/client";

export type DatosProgreso = { meta: number; esta: number; racha: number; semanas: { inicio: string; dias: number }[] };

export default function RachaSemanal({ usuarioId, d }: { usuarioId: string; d: DatosProgreso }) {
  const { t, idioma } = useTextos();
  const router = useRouter();
  const [meta, setMeta] = useState(d.meta);
  const [error, setError] = useState(false);
  const max = Math.max(7, ...d.semanas.map((s) => s.dias));
  const LOCALE = { es: "es-AR", en: "en-US", pt: "pt-BR" }[idioma];

  async function cambiar(v: number) {
    setMeta(v);
    setError(false);
    const { error: e } = await crearCliente().from("profiles").update({ dias_semana: v }).eq("id", usuarioId);
    if (e) setError(true);
    else router.refresh();
  }

  return (
    <section className="tarjeta grid gap-3" aria-label={t["rach.titulo"]}>
      <h2 className="text-xl text-lava">{t["rach.titulo"]}</h2>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p><strong className="titulo text-2xl text-dorado">{d.racha}</strong> <span className="text-sm text-suave">{d.racha > 0 ? rellenar(t["rach.racha"], { n: d.racha }) : t["rach.rachaCero"]}</span></p>
        <p className="text-sm">{rellenar(t["rach.estaSemana"], { n: d.esta, meta })}</p>
      </div>
      <div className="flex h-24 items-end gap-1" role="img" aria-label={t["rach.titulo"]}>
        {d.semanas.map((s, i) => {
          const ok = s.dias >= meta;
          return (
            <div key={s.inicio} className="relative flex h-full flex-1 flex-col justify-end" title={`${new Date(s.inicio + "T12:00:00").toLocaleDateString(LOCALE, { day: "numeric", month: "short" })}: ${s.dias}`}>
              <div className={`rounded-t ${ok ? "bg-ok" : "bg-borde"} ${i === d.semanas.length - 1 ? "opacity-80" : ""}`} style={{ height: `${Math.max(4, (s.dias / max) * 100)}%` }} />
            </div>
          );
        })}
      </div>
      <label className="grid gap-1 text-sm">
        {t["rach.elige"]}
        <select className="campo w-24" value={meta} onChange={(e) => cambiar(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      {error && <p className="text-sm text-lava">{t["rach.error"]}</p>}
      <p className="text-xs text-suave">{t["rach.nota"]}</p>
    </section>
  );
}
