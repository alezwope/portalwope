"use client";

import { createContext, useContext } from "react";
import type { Idioma, Textos } from "@/lib/i18n/diccionarios";

const Ctx = createContext<{ idioma: Idioma; t: Textos } | null>(null);

export function ProveedorIdioma({ idioma, t, children }: { idioma: Idioma; t: Textos; children: React.ReactNode }) {
  return <Ctx.Provider value={{ idioma, t }}>{children}</Ctx.Provider>;
}

/** En componentes de cliente: const { t, idioma } = useTextos(); t["comun.entrar"] */
export function useTextos() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTextos fuera de ProveedorIdioma");
  return v;
}
