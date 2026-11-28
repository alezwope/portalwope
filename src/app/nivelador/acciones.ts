"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { calcular, sanear } from "@/lib/nivelador";
import { textos } from "@/lib/i18n/servidor";
import { rellenar } from "@/lib/i18n/diccionarios";

const DIAS_ENTRE_PRUEBAS = 28;

export async function guardarNivelacion(entradasCrudas: unknown): Promise<{ ok: true; nivel: string } | { ok: false; error: string }> {
  const { t } = await textos();
  const T = t as Record<string, string>;
  const entradas = sanear(entradasCrudas);
  if (!entradas) return { ok: false, error: t["niv.err.leer"] };
  const calculo = calcular(entradas);
  if (!calculo.ok) return { ok: false, error: T[calculo.error] ?? calculo.error };

  const supabase = await crearClienteServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return { ok: false, error: t["niv.err.sesion"] };

  const { data: ultima } = await supabase
    .from("nivelaciones")
    .select("creado_en")
    .eq("usuario_id", uid)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ultima) {
    const dias = (Date.now() - new Date(ultima.creado_en).getTime()) / 86_400_000;
    if (dias < DIAS_ENTRE_PRUEBAS) return { ok: false, error: rellenar(t["niv.err.espera"], { dias: Math.ceil(DIAS_ENTRE_PRUEBAS - dias) }) };
  }

  const r = calculo.r;
  const { error } = await supabase.from("nivelaciones").insert({
    usuario_id: uid,
    metodo: (entradas.camara ?? []).length > 0 ? "mixto" : "declarado",
    nivel: r.nivel,
    subnivel: r.subnivel,
    entradas,
    resultado: r,
  });
  if (error) return { ok: false, error: t["niv.err.guardar"] };

  const { error: e2 } = await supabase.from("profiles").update({ nivel: r.nivel }).eq("id", uid);
  if (e2) return { ok: false, error: t["niv.err.perfil"] };

  revalidatePath("/panel", "layout");
  return { ok: true, nivel: r.nivel };
}
