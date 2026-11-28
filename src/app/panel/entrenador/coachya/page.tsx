import type { Metadata } from "next";
import { requerirEntrenador } from "@/lib/entrenador";
import CoachYaEntrenador from "@/components/CoachYaEntrenador";

export const metadata: Metadata = { title: "CoachYa!" };

export default async function CoachYaEntrenadorPage() {
  const { pagina } = await requerirEntrenador();
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">CoachYa!</h1>
      <p className="text-suave">Personas que buscan entrenador. Envía tu oferta: ellas comparan y eligen. No ves su nombre hasta que te eligen.</p>
      <CoachYaEntrenador paginaId={pagina.id} />
    </div>
  );
}
