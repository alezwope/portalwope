"use client";

import { useTextos } from "@/components/Idioma";
import { rellenar } from "@/lib/i18n/diccionarios";
import type { ResumenVerif } from "@/lib/habilidades";

const COLOR: Record<string, string> = {
  ninguna: "border-borde text-suave",
  en_proceso: "border-dorado text-dorado",
  comunidad: "border-ok text-ok",
  entrenador: "border-ok text-ok",
  en_duda: "border-lava text-lava",
};
const ICONO: Record<string, string> = { ninguna: "○", en_proceso: "◔", comunidad: "✓", entrenador: "✓✓", en_duda: "!" };

/** Sello de confianza de una marca: autodeclarada, en verificación, por la comunidad (con contador) o por su entrenador. */
export default function InsigniaVerif({ v }: { v: ResumenVerif }) {
  const { t } = useTextos();
  let texto: string = t[`ver.${v.estado}` as "ver.ninguna"];
  if (v.estado === "comunidad" || v.estado === "en_proceso") {
    texto = v.validas === 1 ? t["ver.por1"] : rellenar(t["ver.porN"], { n: v.validas });
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${COLOR[v.estado] ?? COLOR.ninguna}`}>
      <span aria-hidden>{ICONO[v.estado]}</span>
      {texto}
    </span>
  );
}
