import type { Metadata } from "next";
import { requerirEquipo } from "@/lib/permisos";
import AdminCalibracion from "@/components/AdminCalibracion";
import type { EstCamara } from "@/lib/calibracion";

export const metadata: Metadata = { title: "Consola · Calibración" };

export type EstNivel = { nivel: string; campo: string; n: number; p25: number; p50: number; p75: number };

export default async function PaginaCalibracion(props: PageProps<"/admin/calibracion">) {
  const { supabase } = await requerirEquipo("ajustes");
  const sp = await props.searchParams;
  const soloCamara = sp.camara === "1";
  const [cal, cam, niv] = await Promise.all([
    supabase.from("calibracion_camara").select("ejercicio, valores, version, nota, actualizado_en"),
    supabase.rpc("estadisticas_camara", { p_dias: 90 }),
    supabase.rpc("estadisticas_nivelador", { p_solo_camara: soloCamara }),
  ]);
  return (
    <AdminCalibracion
      guardados={(cal.data ?? []) as { ejercicio: string; valores: Record<string, number>; version: number; nota: string | null; actualizado_en: string }[]}
      camara={(cam.data ?? []) as EstCamara[]}
      nivel={(niv.data ?? []) as EstNivel[]}
      soloCamara={soloCamara}
    />
  );
}
