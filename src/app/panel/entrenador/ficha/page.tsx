import type { Metadata } from "next";
import { requerirEntrenador } from "@/lib/entrenador";
import FormularioFicha from "@/components/FormularioFicha";

export const metadata: Metadata = { title: "Ficha" };

export default async function Ficha() {
  const { pagina } = await requerirEntrenador();
  return (
    <div className="grid max-w-2xl gap-4">
      <h1 className="text-3xl">Tu ficha de entrenador</h1>
      <p className="text-suave">
        Es lo que ve la gente al buscarte. Indica a quién entrenas: si alguien de otro nivel te escribe, se le avisa antes de enviar.
      </p>
      <FormularioFicha pagina={pagina} />
    </div>
  );
}
