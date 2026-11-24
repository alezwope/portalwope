import type { Metadata } from "next";
import Cabecera from "@/components/Cabecera";
import FormularioAcceso from "@/components/FormularioAcceso";
import { rutaSegura } from "@/lib/sesion";

export const metadata: Metadata = { title: "Entrar" };

export default async function Entrar(props: PageProps<"/entrar">) {
  const sp = await props.searchParams;
  const siguiente = rutaSegura(typeof sp.siguiente === "string" ? sp.siguiente : null);
  const error = sp.error ? "El enlace venció o ya fue usado. Pide uno nuevo." : undefined;

  return (
    <>
      <Cabecera />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <FormularioAcceso siguiente={siguiente} errorInicial={error} />
      </main>
    </>
  );
}
