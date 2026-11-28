"use server";

import { updateTag } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { esIdioma } from "@/lib/i18n/diccionarios";

/** Guarda (o, con valor vacío, restaura) un texto editado. El permiso lo valida la base de datos. */
export async function guardarTexto(clave: string, idioma: string, valor: string): Promise<{ ok: boolean; error?: string }> {
  if (!esIdioma(idioma) || clave.length > 120) return { ok: false, error: "Datos inválidos" };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("admin_texto", { p_clave: clave, p_idioma: idioma, p_valor: valor });
  if (error) return { ok: false, error: error.message };
  updateTag("textos"); // los textos nuevos se ven de inmediato, sin esperar los 5 minutos
  return { ok: true };
}
