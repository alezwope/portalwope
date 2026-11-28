import type { Metadata } from "next";
import { nomCat } from "@/lib/i18n/diccionarios";
import { textos } from "@/lib/i18n/servidor";
import Link from "next/link";
import { misPaginas, requerirPerfil } from "@/lib/sesion";
import FormularioPerfil from "@/components/FormularioPerfil";
import FormularioEntrenamiento from "@/components/FormularioEntrenamiento";
import CrearPagina from "@/components/CrearPagina";
import BotonSalir from "@/components/BotonSalir";
import PrivacidadSocial from "@/components/PrivacidadSocial";
import { ESTADOS_PAGINA, TIPOS_PAGINA, type TipoPagina } from "@/lib/catalogos";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["perfil.titulo"] };
}

export default async function PaginaPerfil(props: PageProps<"/panel/perfil">) {
  const sp = await props.searchParams;
  const crear = typeof sp.crear === "string" ? sp.crear : null;
  const { supabase, perfil } = await requerirPerfil();
  const paginas = await misPaginas();
  const { t: tx } = await textos();
  const [{ data: medidas }, { data: salud }, { data: bloqueados }] = await Promise.all([
    supabase.from("perfil_medidas").select("peso_kg, estatura_cm").eq("usuario_id", perfil.id).maybeSingle(),
    supabase.from("perfil_salud").select("lesiones, notas").eq("usuario_id", perfil.id).maybeSingle(),
    supabase.rpc("mis_bloqueos"),
  ]);
  const faltan = (Object.keys(TIPOS_PAGINA) as TipoPagina[]).filter((t) => !paginas.some((p) => p.tipo === t));

  return (
    <div className="grid max-w-3xl gap-10">
      <section className="grid gap-3">
        <h1 className="text-3xl">{tx["perfil.tuPerfil"]}</h1>
        <FormularioPerfil perfil={perfil} />
      </section>

      <section id="entrenamiento" className="grid gap-3 scroll-mt-20">
        <h2 className="text-2xl">{tx["perfil.entreno"]}</h2>
        <FormularioEntrenamiento usuarioId={perfil.id} medidas={medidas} salud={salud} />
      </section>

      <section id="privacidad" className="grid gap-3 scroll-mt-20">
        <h2 className="text-2xl">{tx["perfil.privacidad"]}</h2>
        <PrivacidadSocial usuarioId={perfil.id} actual={perfil.compartir_logros === "nadie" ? "nadie" : "amigos"} bloqueados={(bloqueados ?? []) as { id: string; alias: string }[]} />
      </section>

      <section id="paginas" className="grid gap-3 scroll-mt-20">
        <h2 className="text-2xl">{tx["perfil.paginas"]}</h2>
        <p className="text-suave">{tx["perfil.paginasTexto"]}</p>
        {paginas.map((p) => (
          <div key={p.id} className="tarjeta flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold">{TIPOS_PAGINA[p.tipo].icono} {p.nombre}</p>
              <p className="text-sm text-suave">{nomCat(tx, "tipo", p.tipo, TIPOS_PAGINA[p.tipo].nombre)} · {nomCat(tx, "estp", p.estado, ESTADOS_PAGINA[p.estado])}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/e/${p.slug}`} className="btn btn-borde !py-1.5">{tx["perfil.verPublica"]}</Link>
              {p.tipo === "entrenador" && <Link href="/panel/entrenador" className="btn btn-lava !py-1.5">{tx["perfil.abrirPanel"]}</Link>}
            </div>
          </div>
        ))}
        <div className="grid gap-3 sm:grid-cols-2">
          {faltan.map((t) => <CrearPagina key={t} tipo={t} abiertoInicial={crear === t} />)}
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/panel/notificaciones" className="btn btn-borde">{tx["perfil.avisos"]}</Link>
        <BotonSalir />
      </section>
    </div>
  );
}
