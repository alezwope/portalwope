import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { DICCIONARIOS, esIdioma, type ClaveTexto, type Idioma, type Textos } from "./diccionarios";

export const COOKIE_IDIOMA = "unibars-idioma";

/** Idioma de esta visita: cookie elegida → idioma del navegador → español. */
export const idiomaActual = cache(async (): Promise<Idioma> => {
  const c = (await cookies()).get(COOKIE_IDIOMA)?.value;
  if (esIdioma(c)) return c;
  const acepta = (await headers()).get("accept-language") ?? "";
  for (const parte of acepta.split(",")) {
    const cod = parte.trim().slice(0, 2).toLowerCase();
    if (esIdioma(cod)) return cod;
  }
  return "es";
});

/** Textos que Alez editó desde la consola (se refrescan cada 5 minutos). */
const textosEditados = unstable_cache(
  async (idioma: Idioma): Promise<Record<string, string>> => {
    try {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const { data } = await sb.from("textos").select("clave, valor").eq("idioma", idioma);
      return Object.fromEntries((data ?? []).map((f) => [f.clave, f.valor]));
    } catch {
      return {};
    }
  },
  ["textos-editados"],
  { revalidate: 300, tags: ["textos"] },
);

/** Diccionario completo del idioma actual (fábrica + ediciones de la consola). */
export const textos = cache(async (): Promise<{ idioma: Idioma; t: Textos }> => {
  const idioma = await idiomaActual();
  const editados = await textosEditados(idioma);
  const base = DICCIONARIOS[idioma];
  const t = { ...base } as Textos;
  for (const k of Object.keys(editados)) if (k in base) t[k as ClaveTexto] = editados[k];
  return { idioma, t };
});
