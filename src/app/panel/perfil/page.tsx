import type { Metadata } from "next";
import { requerirPerfil } from "@/lib/sesion";
import FormularioPerfil from "@/components/FormularioPerfil";

export const metadata: Metadata = { title: "Perfil" };

export default async function PaginaPerfil() {
  const { perfil } = await requerirPerfil();
  return (
    <div className="grid max-w-xl gap-4">
      <h1 className="text-3xl">Tu perfil</h1>
      <FormularioPerfil perfil={perfil} />
    </div>
  );
}
