import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Cabecera from "@/components/Cabecera";
import FormularioOnboarding from "@/components/FormularioOnboarding";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bienvenido" };

export default async function Onboarding() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: perfil } = await supabase.from("profiles").select("nombre, onboarding_completo").eq("id", user.id).single();
  if (perfil?.onboarding_completo) redirect("/panel");

  return (
    <>
      <Cabecera />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-3xl mb-2">¡Bienvenido a UniBars!</h1>
        <p className="text-suave mb-6">Cuéntanos cómo quieres formar parte. Podrás ajustar tu perfil cuando quieras.</p>
        <FormularioOnboarding nombreInicial={perfil?.nombre ?? ""} />
      </main>
    </>
  );
}
