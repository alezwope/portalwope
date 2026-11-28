import type { Metadata } from "next";
import { textos } from "@/lib/i18n/servidor";
import { requerirPerfil } from "@/lib/sesion";
import Conversaciones from "@/components/Conversaciones";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["msg.titulo"] };
}

export default async function Pagina() {
  await requerirPerfil();
  const { t } = await textos();
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl"><span className="texto-fuego">{t["msg.titulo"]}</span></h1>
      <p className="text-suave">{t["msg.intro"]}</p>
      <Conversaciones />
    </div>
  );
}
