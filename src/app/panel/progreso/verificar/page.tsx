import type { Metadata } from "next";
import Link from "next/link";
import { requerirPerfil } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";
import VerificarMarcas, { type ColaVerificar } from "@/components/VerificarMarcas";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["vp.titulo"] };
}

export default async function Verificar() {
  const { supabase } = await requerirPerfil();
  const { t } = await textos();
  const { data } = await supabase.rpc("para_verificar");
  const cola = (data ?? { alumnos: [], comunidad: [], puede_comunidad: false }) as ColaVerificar;

  return (
    <div className="grid max-w-3xl gap-5">
      <Link href="/panel/progreso" className="text-sm text-suave hover:text-lava">← {t["prog.titulo"]}</Link>
      <header className="grid gap-1">
        <h1 className="text-3xl">{t["vp.titulo"]}</h1>
        <p className="text-suave">{t["vp.intro"]}</p>
      </header>
      <VerificarMarcas cola={cola} />
    </div>
  );
}
