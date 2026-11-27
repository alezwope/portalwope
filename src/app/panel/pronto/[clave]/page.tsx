import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { itemPronto } from "@/lib/menu";
import { textos } from "@/lib/i18n/servidor";

export const metadata: Metadata = { title: "Próximamente" };

/** Pantalla amable para lo que todavía no existe: nada del menú queda roto. */
export default async function Pronto({ params }: PageProps<"/panel/pronto/[clave]">) {
  const { clave } = await params;
  const encontrado = itemPronto(clave);
  if (!encontrado) notFound();
  const { t } = await textos();
  const { seccion, item } = encontrado;
  const fase = item.pronto?.startsWith("Etapa") ? item.pronto : `${t["pronto.fase"]} ${item.pronto}`;

  return (
    <div className="mx-auto grid max-w-xl justify-items-center gap-4 py-10 text-center">
      <p className="text-6xl" aria-hidden>{seccion.icono}</p>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-dorado">{t[seccion.texto]}</p>
      <h1 className="text-3xl"><span className="texto-fuego">{t[item.texto]}</span></h1>
      <p className="rounded-full border border-borde bg-card px-3 py-1 text-sm">🛠️ {t["pronto.titulo"]} · {fase}</p>
      <p className="text-suave">{t["pronto.texto"]}</p>
      <Link href="/panel/sugerencias" className="btn btn-lava">💡 {t["pronto.votar"]}</Link>
    </div>
  );
}
