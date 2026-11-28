import Link from "next/link";
import { NIVELES } from "@/lib/catalogos";
import { PATRONES, formatoValor, idxNivel, type NodoArbol, type PatronClave } from "@/lib/habilidades";
import type { Textos } from "@/lib/i18n/diccionarios";

const tx = (t: Textos, k: string) => (t as Record<string, string>)[k] ?? k;

/** Árbol de habilidades: por patrón, cada habilidad muestra sus hitos por nivel y se ilumina al alcanzarlos. */
export default function ArbolHabilidades({ arbol, t }: { arbol: Record<PatronClave, NodoArbol[]>; t: Textos }) {
  return (
    <section className="grid gap-3" aria-label={t["arb.titulo"]}>
      <div>
        <h2 className="text-2xl">{t["arb.titulo"]}</h2>
        <p className="text-sm text-suave">{t["arb.intro"]}</p>
      </div>
      {PATRONES.map((p) => (
        <div key={p} className="tarjeta grid gap-2">
          <h3 className="text-lg text-dorado">{t[`arb.pat.${p}` as "arb.pat.core"]}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {arbol[p].map((n) => (
              <li key={n.h.clave} className="grid gap-2 rounded-xl border border-borde p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold leading-tight">
                    {tx(t, `hab.${n.h.clave}`)}
                    {n.h.ventana ? <span className="ml-1 text-xs font-normal text-suave">({t["arb.en60"]})</span> : null}
                  </p>
                  <Link href={`/panel/progreso?hab=${n.h.clave}#diario`} className="shrink-0 text-sm text-lava underline">{t["arb.anotar"]}</Link>
                </div>
                <ul className="flex flex-wrap gap-1" aria-label="hitos">
                  {n.h.hitos.map((h) => {
                    const lv = NIVELES[idxNivel(h.nivel)];
                    const logrado = n.mejor ? n.mejor.valor >= h.meta : false;
                    return (
                      <li
                        key={h.nivel}
                        title={`${lv.nombre} · ${t["arb.desde"]} ${formatoValor(h.meta, n.h.unidad)} ${n.h.unidad === "seg" ? "s" : "reps"}`}
                        className="rounded-full border px-2 py-0.5 text-xs"
                        style={logrado ? { background: lv.color, borderColor: lv.color, color: "#0b0b0d" } : { borderColor: "var(--borde)", opacity: 0.6 }}
                      >
                        {lv.nombre} {formatoValor(h.meta, n.h.unidad)}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-sm text-suave">
                  {n.mejor ? (
                    <>{t["arb.mejor"]}: <strong className="text-texto">{formatoValor(n.mejor.valor, n.mejor.unidad)} {n.mejor.unidad === "seg" ? "s" : "reps"}</strong></>
                  ) : (
                    t["arb.sinMarca"]
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
