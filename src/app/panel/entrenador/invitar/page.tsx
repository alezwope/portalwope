import type { Metadata } from "next";
import { requerirEntrenador } from "@/lib/entrenador";
import { urlDelSitio } from "@/lib/sesion";
import Invitaciones from "@/components/Invitaciones";

export const metadata: Metadata = { title: "Invitar" };

export default async function Invitar() {
  const { supabase, pagina } = await requerirEntrenador();
  const [{ data: invitaciones }, { data: escuelas }] = await Promise.all([
    supabase.from("invitaciones").select("codigo, escuela_id, usos, creado_en").eq("pagina_id", pagina.id).eq("activa", true).order("creado_en", { ascending: false }),
    supabase.from("escuelas").select("id, nombre").eq("pagina_id", pagina.id).order("nombre"),
  ]);

  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Invitar alumnos</h1>
      <p className="text-suave">
        Comparte el link o el QR con tus alumnos. Al abrirlo crean su cuenta (o entran) y quedan conectados contigo, sin buscarte. Tú
        nunca envías solicitudes: la persona siempre decide.
      </p>
      <Invitaciones paginaId={pagina.id} sitio={urlDelSitio()} invitaciones={invitaciones ?? []} escuelas={escuelas ?? []} />
    </div>
  );
}
