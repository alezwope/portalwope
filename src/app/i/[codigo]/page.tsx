import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Cabecera from "@/components/Cabecera";
import UsarInvitacion from "@/components/UsarInvitacion";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Invitación" };

type Inv = { pagina: string; slug: string; ciudad: string | null; pais: string | null; escuela: string | null };

export default async function Invitacion(props: PageProps<"/i/[codigo]">) {
  const { codigo } = await props.params;
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc("ver_invitacion", { p_codigo: codigo.slice(0, 20) });
  const inv = data as Inv | null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const volver = `/i/${encodeURIComponent(codigo)}`;

  if (user && inv) {
    const { data: p } = await supabase.from("profiles").select("onboarding_completo").eq("id", user.id).single();
    if (!p?.onboarding_completo) redirect(`/onboarding?siguiente=${volver}`);
  }

  return (
    <>
      <Cabecera />
      <main className="mx-auto grid w-full max-w-xl flex-1 content-start gap-5 px-4 py-10">
        {!inv ? (
          <div className="tarjeta grid gap-3">
            <h1 className="text-2xl">Esta invitación ya no está disponible</h1>
            <p className="text-suave">Pídele a tu entrenador un link nuevo.</p>
            <Link href="/" className="btn btn-borde justify-self-start">Conocer UniBars</Link>
          </div>
        ) : (
          <div className="tarjeta grid gap-4">
            <p className="text-sm uppercase tracking-widest text-dorado">Invitación de entrenamiento</p>
            <h1 className="text-3xl">
              {inv.pagina} te invita a entrenar{inv.escuela ? ` en ${inv.escuela}` : ""}
            </h1>
            {(inv.ciudad || inv.pais) && <p className="text-suave">{[inv.ciudad, inv.pais].filter(Boolean).join(", ")}</p>}
            {user ? (
              <UsarInvitacion codigo={codigo} nombre={inv.pagina} />
            ) : (
              <>
                <p className="text-suave">UniBars es la red social de la calistenia. Crea tu cuenta gratis y quedas conectado con tu entrenador.</p>
                <Link href={`/entrar?siguiente=${volver}`} className="btn btn-lava justify-self-start">Crear cuenta o entrar</Link>
              </>
            )}
            <Link href={`/e/${inv.slug}`} className="text-sm text-suave underline">Ver la ficha de {inv.pagina}</Link>
          </div>
        )}
      </main>
    </>
  );
}
