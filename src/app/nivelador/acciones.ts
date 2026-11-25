"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { calcular, sanear } from "@/lib/nivelador";

const DIAS_ENTRE_PRUEBAS = 28;

export async function guardarNivelacion(entradasCrudas: unknown): Promise<{ ok: true; nivel: string } | { ok: false; error: string }> {
  const entradas = sanear(entradasCrudas);
  if (!entradas) return { ok: false, error: "No pudimos leer tus respuestas. Recarga la página e inténtalo de nuevo." };
  const calculo = calcular(entradas);
  if (!calculo.ok) return { ok: false, error: calculo.error };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Entra a tu cuenta para guardar tu nivel." };

  const { data: ultima } = await supabase
    .from("nivelaciones")
    .select("creado_en")
    .eq("usuario_id", user.id)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ultima) {
    const dias = (Date.now() - new Date(ultima.creado_en).getTime()) / 86_400_000;
    if (dias < DIAS_ENTRE_PRUEBAS) {
      const faltan = Math.ceil(DIAS_ENTRE_PRUEBAS - dias);
      return { ok: false, error: `Ya guardaste una prueba hace poco. Puedes repetirla en ${faltan} día${faltan === 1 ? "" : "s"}: tu cuerpo necesita tiempo para mejorar.` };
    }
  }

  const r = calculo.r;
  const { error } = await supabase.from("nivelaciones").insert({
    usuario_id: user.id,
    metodo: "declarado",
    nivel: r.nivel,
    subnivel: r.subnivel,
    entradas,
    resultado: r,
  });
  if (error) return { ok: false, error: "No pudimos guardar tu prueba. Inténtalo de nuevo." };

  const { error: e2 } = await supabase.from("profiles").update({ nivel: r.nivel }).eq("id", user.id);
  if (e2) return { ok: false, error: "Guardamos la prueba, pero no pudimos actualizar tu nivel en el perfil. Cámbialo desde Perfil." };

  revalidatePath("/panel", "layout");
  return { ok: true, nivel: r.nivel };
}
