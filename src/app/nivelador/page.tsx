import type { Metadata } from "next";
import Link from "next/link";
import Cabecera from "@/components/Cabecera";
import Nivelador from "@/components/Nivelador";
import { crearClienteServidor } from "@/lib/supabase/server";
import { textos } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t["niv.metaTitulo"], description: t["niv.metaDesc"] };
}

export default async function PaginaNivelador() {
  const supabase = await crearClienteServidor();
  const [{ data: claims }, { t }] = await Promise.all([supabase.auth.getClaims(), textos()]);
  const conSesion = !!claims?.claims?.sub;

  return (
    <>
      <Cabecera>
        <Link href={conSesion ? "/panel" : "/entrar"} className="btn btn-lava !py-1.5">{conSesion ? t["niv.miPanel"] : t["comun.entrar"]}</Link>
      </Cabecera>
      <main className="mx-auto grid max-w-3xl gap-5 px-4 py-6">
        <div className="grid gap-2">
          <h1 className="text-3xl">{t["niv.titulo"]}</h1>
          <p className="text-suave">{t["niv.intro"]}</p>
        </div>
        <Nivelador conSesion={conSesion} />
      </main>
    </>
  );
}
