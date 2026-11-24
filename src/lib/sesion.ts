import { cache } from "react";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export type Perfil = {
  id: string;
  alias: string | null;
  nombre: string | null;
  avatar_url: string | null;
  bio: string | null;
  ciudad: string | null;
  pais: string | null;
  rol_principal: "super_admin" | "coach" | "alumno" | "atleta_libre" | "wellness" | null;
  onboarding_completo: boolean;
  modo_invisible: boolean;
};

export const requerirPerfil = cache(async () => {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!data) redirect("/entrar");
  if (!data.onboarding_completo) redirect("/onboarding");

  return { supabase, user, perfil: data as Perfil };
});

/** Solo permite rutas internas para evitar redirecciones a sitios ajenos. */
export function rutaSegura(valor: string | null | undefined, porDefecto = "/panel") {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) return porDefecto;
  return valor;
}

export function urlDelSitio(origenPeticion?: string) {
  return process.env.NEXT_PUBLIC_SITE_URL || origenPeticion || "http://localhost:3000";
}
