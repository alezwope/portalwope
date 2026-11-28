import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { textos } from "@/lib/i18n/servidor";
import { nomCat } from "@/lib/i18n/diccionarios";
import { requerirPerfil } from "@/lib/sesion";
import { OBJETIVOS, nivelDe, type Objetivo } from "@/lib/catalogos";
import { hace, type PerfilPublico } from "@/lib/social";
import Avatar from "@/components/Avatar";
import AccionesPerfil from "@/components/AccionesPerfil";
import InsigniaVerif from "@/components/InsigniaVerif";
import { formatoValor, type ResumenVerif } from "@/lib/habilidades";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["perfil.titulo"] };
}

export default async function PerfilDe({ params }: PageProps<"/panel/u/[alias]">) {
  const { alias } = await params;
  const { supabase } = await requerirPerfil();
  const { data } = await supabase.rpc("perfil_publico", { p_alias: decodeURIComponent(alias).slice(0, 40) });
  const p = data as PerfilPublico | null;
  if (!p) notFound();
  const nv = nivelDe(p.nivel);
  const { t, idioma } = await textos();
  const { data: recs } = await supabase.rpc("records_de", { p_alias: p.alias });
  const records = (recs ?? []) as { id: string; ejercicio: string; habilidad: string | null; valor: number; unidad: string; fecha: string; metodo: string; video_url: string | null; verif: ResumenVerif }[];
  const T = t as Record<string, string>;

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <section className="tarjeta grid gap-4">
        <div className="flex items-center gap-4">
          <Avatar alias={p.alias} url={p.avatar_url} nivel={p.nivel} tam={72} />
          <div>
            <h1 className="text-3xl">@{p.alias}</h1>
            {p.nombre && <p className="text-suave">{p.nombre}</p>}
            <p className="text-sm">
              {nv ? <strong style={{ color: nv.color }}>{nv.nombre}</strong> : <span className="text-suave">{t["pub.sinNivel"]}</span>}
              {p.ciudad && <span className="text-suave"> · {[p.ciudad, p.pais].filter(Boolean).join(", ")}</span>}
            </p>
          </div>
        </div>
        {p.bio && <p className="whitespace-pre-wrap break-words">{p.bio}</p>}
        {p.objetivo && <p className="text-sm text-suave">{t["pub.objetivo"]}: {nomCat(t, "obj", p.objetivo, OBJETIVOS[p.objetivo as Objetivo])}</p>}
        {p.es_yo ? (
          <Link href="/panel/perfil" className="btn btn-borde justify-self-start">{t["pub.editar"]}</Link>
        ) : (
          <AccionesPerfil p={p} />
        )}
      </section>

      <section className="tarjeta grid gap-2">
        <h2 className="text-xl">{t["pub.logros"]}</h2>
        {!p.logros_visibles ? (
          <p className="text-suave">{t["pub.logrosPriv"]}</p>
        ) : p.logros.length === 0 ? (
          <p className="text-suave">{t["pub.sinLogros"]}</p>
        ) : (
          <ul className="grid gap-2">
            {p.logros.map((l) => (
              <li key={l.id} className="flex items-baseline justify-between gap-2 rounded-lg border border-borde p-2">
                <span>🏅 {l.titulo}</span>
                <span className="shrink-0 text-xs text-suave">{hace(l.creado_en, idioma)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tarjeta grid gap-1">
        <h2 className="text-xl">🛡️ {t["pub.crews"]}</h2>
        <p className="text-suave">{t["pub.crewsTexto"]}</p>
      </section>

      <section className="tarjeta grid gap-1">
        <h2 className="text-xl">🏆 {t["pub.records"]}</h2>
        {records.length === 0 ? (
          <p className="text-suave">{t["pub.sinRecords"]}</p>
        ) : (
          <ul className="grid gap-2">
            {records.map((r) => (
              <li key={r.id} className="grid gap-1 rounded-lg border border-borde p-2">
                <p className="flex flex-wrap items-baseline justify-between gap-2">
                  <span><strong>{r.habilidad ? T[`hab.${r.habilidad}`] ?? r.ejercicio : r.ejercicio}</strong>{" "}
                    <span className="titulo text-xl text-dorado">{formatoValor(r.valor, r.unidad)}</span>{" "}
                    <span className="text-sm text-suave">{r.unidad === "seg" ? "s" : r.unidad === "kg" ? "kg" : "reps"}</span></span>
                  <span className="text-xs text-suave">{hace(r.fecha + "T12:00:00", idioma)}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <InsigniaVerif v={r.verif} />
                  {r.metodo === "camara" && <span className="rounded-full border border-borde px-2 py-0.5 text-xs">📷 {t["dia.camaraOk"]}</span>}
                  {r.video_url && <a href={r.video_url} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-lava underline">{t["dia.verVideo"]}</a>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
