import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirEntrenador, type Tarjeta } from "@/lib/entrenador";
import TarjetaPersona from "@/components/TarjetaPersona";
import TerminarVinculo from "@/components/TerminarVinculo";
import AsignarPlan from "@/components/AsignarPlan";
import CerrarAsignacion from "@/components/CerrarAsignacion";
import Revisiones from "@/components/Revisiones";

export const metadata: Metadata = { title: "Alumno" };

type Resumen = {
  asignadas: number; hechas: number; rpe_prom: number | null;
  planes: { asignacion_id: string; plan: string; total: number; hechos: number; por_grupo: boolean }[];
  ultimas: { plan: string; entreno: string; hecho_en: string; rpe: number | null; comentario: string | null }[];
};

export default async function Alumno(props: PageProps<"/panel/entrenador/alumno/[id]">) {
  const { id } = await props.params;
  const { supabase, pagina } = await requerirEntrenador();
  const { data: v } = await supabase.from("vinculos").select("id, estado, persona_id").eq("id", id).eq("pagina_id", pagina.id).maybeSingle();
  if (!v) notFound();
  const { data } = await supabase.rpc("tarjeta_vinculo", { p_id: id });
  const t = data as Tarjeta;
  const activo = v.estado === "aceptado";

  const [{ data: res }, { data: planes }] = activo
    ? await Promise.all([
        supabase.rpc("alumno_resumen", { p_pagina: pagina.id, p_persona: v.persona_id }),
        supabase.from("planes").select("id, nombre, orden_fijo").eq("pagina_id", pagina.id).order("nombre"),
      ])
    : [{ data: null }, { data: [] }];
  const r = res as Resumen | null;
  const pct = r && r.asignadas > 0 ? Math.round((r.hechas / r.asignadas) * 100) : null;
  const { data: directas } = activo
    ? await supabase.from("asignaciones").select("id, planes(nombre)").eq("pagina_id", pagina.id).eq("persona_id", v.persona_id).eq("activa", true)
    : { data: [] };

  return (
    <div className="grid max-w-2xl gap-4">
      <Link href="/panel/entrenador/alumnos" className="text-sm text-suave hover:text-lava">← Mis alumnos</Link>
      <section className="tarjeta">
        <TarjetaPersona t={t} completa atiende={pagina.atiende_niveles} />
      </section>

      {activo && r && (
        <section className="tarjeta grid gap-3">
          <h2 className="text-xl text-lava">Seguimiento</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="titulo text-3xl text-dorado">{pct === null ? "—" : `${pct}%`}</p><p className="text-xs text-suave">Cumplimiento</p></div>
            <div><p className="titulo text-3xl text-dorado">{r.hechas}/{r.asignadas}</p><p className="text-xs text-suave">Entrenos hechos</p></div>
            <div><p className="titulo text-3xl text-dorado">{r.rpe_prom ?? "—"}</p><p className="text-xs text-suave">Esfuerzo (RPE) reciente</p></div>
          </div>
          {r.ultimas.length > 0 && (
            <ul className="grid gap-1 text-sm">
              {r.ultimas.map((u, i) => (
                <li key={i} className="rounded-lg border border-borde px-2 py-1">
                  <strong>{u.entreno}</strong> <span className="text-suave">· {u.plan} · {new Date(u.hecho_en).toLocaleDateString("es")}{u.rpe ? ` · RPE ${u.rpe}` : ""}</span>
                  {u.comentario && <span className="block text-suave">“{u.comentario}”</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activo && (
        <section className="tarjeta grid gap-3">
          <h2 className="text-xl text-lava">Plan de entrenamiento</h2>
          {(directas ?? []).length > 0 && (
            <ul className="grid gap-1 text-sm">
              {(directas ?? []).map((a) => {
                const prog = r?.planes.find((p) => p.asignacion_id === a.id);
                return (
                  <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-borde px-2 py-1">
                    <span>📋 {(a.planes as unknown as { nombre: string }).nombre}{prog ? <span className="text-suave"> · {prog.hechos}/{prog.total}</span> : null}</span>
                    <CerrarAsignacion id={a.id} />
                  </li>
                );
              })}
            </ul>
          )}
          {(r?.planes ?? []).some((p) => p.por_grupo) && <p className="text-xs text-suave">También recibe planes por su grupo (los ves en «Grupos»).</p>}
          <AsignarPlan planes={planes ?? []} personaId={v.persona_id} />
          <Link href="/panel/entrenador/planes" className="text-sm text-lava underline">Administrar mis planes</Link>
        </section>
      )}

      {activo && <Revisiones paginaId={pagina.id} personaId={v.persona_id} soy="entrenador" />}

      <Link href="/panel/progreso/verificar" className="btn btn-borde justify-self-start">✓ Verificar las marcas de mis alumnos</Link>
      {activo && <TerminarVinculo id={id} />}
    </div>
  );
}
