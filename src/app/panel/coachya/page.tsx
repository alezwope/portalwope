import type { Metadata } from "next";
import { requerirPerfil } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";
import CoachYaPersona from "@/components/CoachYaPersona";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "CoachYa!" };
}

export default async function CoachYa() {
  const { supabase, perfil } = await requerirPerfil();
  const { t } = await textos();
  const { data: med } = await supabase.from("perfil_medidas").select("peso_kg, estatura_cm").eq("usuario_id", perfil.id).maybeSingle();
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">{t["cy.titulo"]}</h1>
      <CoachYaPersona ciudad={perfil.ciudad ?? ""} pais={perfil.pais ?? ""} peso={med?.peso_kg ?? null} estatura={med?.estatura_cm ?? null} />
    </div>
  );
}
