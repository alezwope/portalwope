import Link from "next/link";
import Cabecera from "@/components/Cabecera";
import NavPrincipal from "@/components/NavPrincipal";
import SelectorModo from "@/components/SelectorModo";
import { misPaginas, requerirPerfil } from "@/lib/sesion";

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const { supabase, perfil } = await requerirPerfil();
  const paginas = await misPaginas();
  const entrenador = paginas.find((p) => p.tipo === "entrenador");

  const { count } = await supabase
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("leida", false);

  return (
    <>
      <Cabecera>
        <SelectorModo alias={perfil.alias ?? "yo"} entrenador={entrenador?.nombre ?? null} />
        <Link
          href="/panel/notificaciones"
          className="relative rounded-full border border-borde px-2.5 py-1.5"
          aria-label={count ? `Avisos, ${count} sin leer` : "Avisos"}
        >
          <span aria-hidden>🔔</span>
          {!!count && (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-lava px-1 text-center text-xs font-bold text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Link>
      </Cabecera>
      <NavPrincipal />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:pb-10">{children}</main>
    </>
  );
}
