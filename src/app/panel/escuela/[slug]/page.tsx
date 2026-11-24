import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirPerfil } from "@/lib/sesion";
import BotonUnirse from "@/components/BotonUnirse";

export const metadata: Metadata = { title: "Escuela" };

export default async function VitrinaEscuela(props: PageProps<"/panel/escuela/[slug]">) {
  const { slug } = await props.params;
  const { supabase, perfil } = await requerirPerfil();

  const { data: escuela } = await supabase
    .from("escuelas")
    .select("id, nombre, descripcion, ciudad, pais")
    .eq("slug", slug)
    .eq("estado", "activa")
    .maybeSingle();
  if (!escuela) notFound();

  const { data: yaMiembro } = await supabase
    .from("escuela_miembros")
    .select("usuario_id")
    .eq("escuela_id", escuela.id)
    .eq("usuario_id", perfil.id)
    .maybeSingle();
  const { data: pendiente } = await supabase
    .from("solicitudes")
    .select("id")
    .eq("escuela_id", escuela.id)
    .eq("solicitante_id", perfil.id)
    .eq("estado", "pendiente")
    .maybeSingle();

  const puedeUnirse = perfil.rol_principal === "alumno" || perfil.rol_principal === "coach";

  return (
    <article className="tarjeta grid max-w-2xl gap-3">
      <h1 className="text-3xl text-lava">{escuela.nombre}</h1>
      <p className="text-suave">{[escuela.ciudad, escuela.pais].filter(Boolean).join(", ")}</p>
      {escuela.descripcion && <p>{escuela.descripcion}</p>}
      {yaMiembro ? (
        <p className="aviso-ok">Ya eres parte de esta escuela. <Link href="/panel/escuela" className="underline">Ver mi escuela</Link></p>
      ) : puedeUnirse ? (
        <BotonUnirse escuelaId={escuela.id} yaPedida={!!pendiente} />
      ) : (
        <p className="text-suave">Tu rol no puede unirse a una escuela.</p>
      )}
    </article>
  );
}
