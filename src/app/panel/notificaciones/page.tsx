import type { Metadata } from "next";
import Link from "next/link";
import { requerirPerfil } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";
import MarcarLeidas from "@/components/MarcarLeidas";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["inicio.avisos"] };
}

export default async function Notificaciones() {
  const { supabase } = await requerirPerfil();
  const { t, idioma } = await textos();
  const LOCALE = { es: "es-AR", en: "en-US", pt: "pt-BR" }[idioma];
  const { data } = await supabase
    .from("notificaciones")
    .select("id, titulo, cuerpo, enlace, leida, creado_en")
    .order("creado_en", { ascending: false })
    .limit(50);
  const hayNuevas = (data ?? []).some((n) => !n.leida);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl">{t["inicio.avisos"]}</h1>
        {hayNuevas && <MarcarLeidas />}
      </div>
      {(data ?? []).length === 0 ? (
        <p className="tarjeta text-suave">{t["avisos.vacio"]}</p>
      ) : (
        <ul className="grid gap-3">
          {(data ?? []).map((n) => (
            <li key={n.id} className={`tarjeta ${n.leida ? "" : "!border-lava"}`}>
              <p className="font-bold">{n.titulo}</p>
              {n.cuerpo && <p className="text-suave">{n.cuerpo}</p>}
              <p className="mt-1 text-xs text-suave">
                {new Date(n.creado_en).toLocaleString(LOCALE, { dateStyle: "medium", timeStyle: "short" })}
                {n.enlace && (
                  <>
                    {" · "}
                    <Link href={n.enlace} className="text-dorado underline">{t["entrenar.abrir"]}</Link>
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
