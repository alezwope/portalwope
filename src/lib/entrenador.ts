import { cache } from "react";
import { redirect } from "next/navigation";
import { misPaginas, requerirPerfil } from "@/lib/sesion";

export const requerirEntrenador = cache(async () => {
  const ctx = await requerirPerfil();
  const pagina = (await misPaginas()).find((p) => p.tipo === "entrenador");
  if (!pagina) redirect("/panel/perfil#paginas");
  return { ...ctx, pagina };
});

export type Tarjeta = {
  alias: string | null;
  avatar_url: string | null;
  nivel: string | null;
  objetivo: string | null;
  ciudad: string | null;
  pais: string | null;
  bio: string | null;
  estado: string;
  origen: string;
  mensaje: string | null;
  creado_en: string;
  comparte_medidas: boolean;
  comparte_salud: boolean;
  marcas?: { ejercicio: string; valor: number; unidad: string; fecha: string }[];
  peso_kg?: number | null;
  estatura_cm?: number | null;
  imc?: number | null;
  lesiones?: string | null;
  notas_salud?: string | null;
};
