import type { Metadata } from "next";
import Cabecera from "@/components/Cabecera";
import FormularioAcceso from "@/components/FormularioAcceso";
import { rutaSegura } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";

export const metadata: Metadata = { title: "Entrar" };

export default async function Entrar(props: PageProps<"/entrar">) {
  const sp = await props.searchParams;
  const siguiente = rutaSegura(typeof sp.siguiente === "string" ? sp.siguiente : null);
  const { t } = await textos();
  const error = sp.error ? t["acceso.errEnlace"] : undefined;

  return (
    <>
      <Cabecera />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <FormularioAcceso siguiente={siguiente} errorInicial={error} modoInicial={sp.crear ? "crear" : "entrar"} />
      </main>
    </>
  );
}
