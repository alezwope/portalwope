import type { Metadata } from "next";
import { requerirPerfil } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";
import MarcarLeidas from "@/components/MarcarLeidas";
import EnlaceAviso from "@/components/EnlaceAviso";
import { rellenar } from "@/lib/i18n/diccionarios";
import { formatoValor } from "@/lib/habilidades";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["inicio.avisos"] };
}

export default async function Notificaciones() {
  const { supabase } = await requerirPerfil();
  const { t, idioma } = await textos();
  const LOCALE = { es: "es-AR", en: "en-US", pt: "pt-BR" }[idioma];
  const { data } = await supabase
    .from("notificaciones")
    .select("id, tipo, titulo, cuerpo, enlace, leida, creado_en, datos")
    .order("creado_en", { ascending: false })
    .limit(50);
  const T = t as Record<string, string>;
  /** Avisos de marcas: se arman en el idioma de quien los lee (la base guarda solo los datos). */
  const traducir = (n: { tipo: string; titulo: string; cuerpo: string | null; datos: Record<string, unknown> | null }) => {
    const clave = `av.${n.tipo}`;
    const d = n.datos ?? {};
    if (["crew_solicitud", "crew_aceptado"].includes(n.tipo) && T[clave]) return { titulo: rellenar(T[clave], { alias: String(d.alias ?? ""), crew: String(d.crew ?? "") }), cuerpo: null };
    if (!["marca_alumno", "marca_verificada", "marca_dudosa"].includes(n.tipo) || !T[clave] || !d.ejercicio) return { titulo: n.titulo, cuerpo: n.cuerpo };
    const ej = T[`hab.${String(d.ejercicio)}`] ?? String(d.ejercicio);
    const unidad = d.unidad === "seg" ? "s" : d.unidad === "kg" ? "kg" : "reps";
    return { titulo: rellenar(T[clave], { alias: String(d.alias ?? ""), ejercicio: ej, valor: `${formatoValor(Number(d.valor), String(d.unidad))} ${unidad}` }), cuerpo: null };
  };
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
          {(data ?? []).map((n) => {
            const tr = traducir(n);
            return (
            <li key={n.id} className={`tarjeta ${n.leida ? "" : "!border-lava"}`}>
              <p className="font-bold">{tr.titulo}</p>
              {tr.cuerpo && <p className="text-suave">{tr.cuerpo}</p>}
              <p className="mt-1 text-xs text-suave">
                {new Date(n.creado_en).toLocaleString(LOCALE, { dateStyle: "medium", timeStyle: "short" })}
                {n.enlace && (
                  <>
                    {" · "}
                    <EnlaceAviso id={n.id} href={n.enlace} leida={n.leida}>{t["entrenar.abrir"]}</EnlaceAviso>
                  </>
                )}
              </p>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
