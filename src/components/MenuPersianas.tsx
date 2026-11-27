"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MENU, type ItemMenu } from "@/lib/menu";
import { useTextos } from "@/components/Idioma";

function rutaDe(i: ItemMenu, alias: string) {
  return i.href.replace("/panel/u/@", `/panel/u/${encodeURIComponent(alias)}`);
}

function estaActivo(ruta: string, href: string) {
  const base = href.split("#")[0];
  if (base === "/panel") return ruta === "/panel";
  return ruta === base || ruta.startsWith(base + "/");
}

/** Menú de persianas (estilo WordPress de la plantilla): una sección abierta a la vez. */
export default function MenuPersianas({ alias, entrenador, alNavegar }: { alias: string; entrenador: boolean; alNavegar?: () => void }) {
  const { t } = useTextos();
  const ruta = usePathname();
  const activa = MENU.find((s) => s.items.some((i) => estaActivo(ruta, rutaDe(i, alias))))?.clave ?? "universo";
  const [abierta, setAbierta] = useState<string | null>(activa);

  return (
    <nav aria-label={t["app.menu"]} className="grid gap-1">
      {MENU.map((s) => {
        const abiertaEsta = abierta === s.clave;
        const items = s.items.filter((i) => (i.soloEntrenador ? entrenador : i.sinEntrenador ? !entrenador : true));
        return (
          <div key={s.clave} className={`rounded-xl border ${s.clave === activa ? "border-lava/30 bg-lava/5" : "border-transparent"}`}>
            <button
              type="button"
              onClick={() => setAbierta(abiertaEsta ? null : s.clave)}
              aria-expanded={abiertaEsta}
              className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-card-hover"
            >
              <span className="flex items-center gap-2.5">
                <span aria-hidden className="text-base">{s.icono}</span>
                <span className={s.clave === activa ? "text-lava" : ""}>{t[s.texto]}</span>
              </span>
              <span aria-hidden className={`text-[10px] text-suave transition-transform ${abiertaEsta ? "rotate-180" : ""}`}>▼</span>
            </button>
            <div className={`grid overflow-hidden transition-all duration-300 ${abiertaEsta ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <ul className="min-h-0 pb-1.5">
                {items.map((i) => {
                  const href = rutaDe(i, alias);
                  const on = estaActivo(ruta, href);
                  return (
                    <li key={i.clave}>
                      <Link
                        href={href}
                        onClick={alNavegar}
                        tabIndex={abiertaEsta ? 0 : -1}
                        aria-current={on ? "page" : undefined}
                        className={`ml-4 flex items-center justify-between gap-2 border-l py-1.5 pl-4 pr-3 text-sm ${
                          on ? "border-lava font-bold text-lava" : "border-borde text-suave hover:text-texto"
                        }`}
                      >
                        <span>{t[i.texto]}</span>
                        {i.pronto && <span className="rounded-full border border-borde px-1.5 text-[10px] uppercase tracking-wide">{t["comun.pronto"]}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
