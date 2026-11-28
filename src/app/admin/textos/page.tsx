import type { Metadata } from "next";
import { requerirEquipo } from "@/lib/permisos";
import { DICCIONARIOS, IDIOMAS, esIdioma } from "@/lib/i18n/diccionarios";
import AdminTextos from "@/components/AdminTextos";

export const metadata: Metadata = { title: "Consola · Textos" };

export default async function PaginaTextos(props: PageProps<"/admin/textos">) {
  const { supabase } = await requerirEquipo("textos");
  const sp = await props.searchParams;
  const idioma = esIdioma(sp.idioma) ? sp.idioma : "es";
  const { data } = await supabase.from("textos").select("clave, valor").eq("idioma", idioma);
  const editados = Object.fromEntries((data ?? []).map((f) => [f.clave, f.valor as string]));
  const base = DICCIONARIOS[idioma];
  const filas = Object.keys(base).map((clave) => ({ clave, fabrica: base[clave as keyof typeof base], editado: editados[clave] ?? null }));
  return <AdminTextos key={idioma} idioma={idioma} idiomas={[...IDIOMAS]} filas={filas} />;
}
