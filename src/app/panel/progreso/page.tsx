import type { Metadata } from "next";
import Link from "next/link";
import { requerirPerfil } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";
import { rellenar } from "@/lib/i18n/diccionarios";
import { nivelDe } from "@/lib/catalogos";
import { armarArbol, sugerenciaNivelador, type Habilidad, type MarcaDiario } from "@/lib/habilidades";
import ArbolHabilidades from "@/components/ArbolHabilidades";
import Diario from "@/components/Diario";
import RachaSemanal, { type DatosProgreso } from "@/components/RachaSemanal";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["prog.titulo"] };
}

export default async function Progreso(props: PageProps<"/panel/progreso">) {
  const { hab } = await props.searchParams;
  const { supabase, perfil } = await requerirPerfil();
  const { t } = await textos();
  const [{ data: habs }, { data: diario }, { data: prog }, { data: ultimaNiv }] = await Promise.all([
    supabase.from("habilidades").select("clave, patron, unidad, ventana, orden, campo_camara, hitos"),
    supabase.rpc("mi_diario", { p_limite: 200 }),
    supabase.rpc("mi_progreso", { p_zona: perfil.zona_horaria || "UTC" }),
    supabase.from("nivelaciones").select("creado_en").eq("usuario_id", perfil.id).order("creado_en", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const habilidades = (habs ?? []) as Habilidad[];
  const marcas = (diario ?? []) as MarcaDiario[];
  const arbol = armarArbol(habilidades, marcas);
  // Solo cuentan las marcas posteriores a la última vez que hizo el nivelador.
  const sug = sugerenciaNivelador(habilidades, ultimaNiv ? marcas.filter((m) => m.creado_en > ultimaNiv.creado_en) : marcas, perfil.nivel);
  const nv = nivelDe(perfil.nivel);
  const nvSug = sug ? nivelDe(sug.nivel) : null;
  const nombreHab = (c: string) => (t as Record<string, string>)[`hab.${c}`] ?? c;

  return (
    <div className="grid max-w-3xl gap-6">
      <header className="grid gap-1">
        <h1 className="text-3xl">{t["prog.titulo"]}</h1>
        <p className="text-suave">{t["prog.intro"]}</p>
        <p className="text-sm">
          {nv ? <>{t["prog.nivel"]}: <strong style={{ color: nv.color }}>{nv.nombre}</strong></> : <span className="text-suave">{t["prog.sinNivel"]}</span>}
          {" · "}
          <Link href="/nivelador" className="text-lava underline">{t["prog.hacerNivelador"]}</Link>
        </p>
      </header>

      {sug && nvSug && (
        <aside className="tarjeta !border-dorado grid gap-2" role="status">
          <p>{rellenar(t["prog.sugiere"], { habilidad: nombreHab(sug.habilidad), nivel: nvSug.nombre })}</p>
          <Link href="/nivelador" className="btn btn-lava justify-self-start">{t["prog.sugiereBtn"]}</Link>
        </aside>
      )}

      {prog && <RachaSemanal usuarioId={perfil.id} d={prog as DatosProgreso} />}

      <ArbolHabilidades arbol={arbol} t={t} />

      <Diario key={typeof hab === "string" ? hab : "x"} usuarioId={perfil.id} habilidades={habilidades} marcas={marcas} preseleccion={typeof hab === "string" ? hab : undefined} />

      <Link href="/panel/progreso/verificar" className="btn btn-borde justify-self-start">✓ {t["prog.verificar"]}</Link>
    </div>
  );
}
