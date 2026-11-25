import type { Metadata } from "next";
import Link from "next/link";
import Cabecera from "@/components/Cabecera";
import Nivelador from "@/components/Nivelador";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Nivelador: descubre tu nivel de calistenia",
  description: "Cuatro pruebas simples (piernas, empuje, core y tracción) para saber si eres Génesis, Fénix, Guerrero, Maestro o Titán. Gratis.",
};

export default async function PaginaNivelador() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <Cabecera>
        <Link href={user ? "/panel" : "/entrar"} className="btn btn-lava !py-1.5">{user ? "Mi panel" : "Entrar"}</Link>
      </Cabecera>
      <main className="mx-auto grid max-w-3xl gap-5 px-4 py-6">
        <div className="grid gap-2">
          <h1 className="text-3xl">Nivelador</h1>
          <p className="text-suave">Descubre tu nivel con cuatro pruebas simples. Tarda unos 5 minutos y no necesitas cuenta para ver tu resultado.</p>
        </div>
        <Nivelador conSesion={!!user} />
      </main>
    </>
  );
}
