import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirEntrenador, type Tarjeta } from "@/lib/entrenador";
import TarjetaPersona from "@/components/TarjetaPersona";
import TerminarVinculo from "@/components/TerminarVinculo";

export const metadata: Metadata = { title: "Alumno" };

export default async function Alumno(props: PageProps<"/panel/entrenador/alumno/[id]">) {
  const { id } = await props.params;
  const { supabase, pagina } = await requerirEntrenador();
  const { data: v } = await supabase.from("vinculos").select("id, estado").eq("id", id).eq("pagina_id", pagina.id).maybeSingle();
  if (!v) notFound();
  const { data } = await supabase.rpc("tarjeta_vinculo", { p_id: id });
  const t = data as Tarjeta;

  return (
    <div className="grid max-w-2xl gap-4">
      <Link href="/panel/entrenador/alumnos" className="text-sm text-suave hover:text-lava">← Mis alumnos</Link>
      <section className="tarjeta">
        <TarjetaPersona t={t} completa atiende={pagina.atiende_niveles} />
      </section>
      <p className="text-sm text-suave">Muy pronto: enviar entrenamientos, avisos y seguir su progreso desde aquí.</p>
      {v.estado === "aceptado" && <TerminarVinculo id={id} />}
    </div>
  );
}
