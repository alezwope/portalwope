import type { Metadata } from "next";
import Link from "next/link";
import { requerirPerfil } from "@/lib/sesion";
import MarcarLeidas from "@/components/MarcarLeidas";

export const metadata: Metadata = { title: "Avisos" };

export default async function Notificaciones() {
  const { supabase } = await requerirPerfil();
  const { data } = await supabase
    .from("notificaciones")
    .select("id, titulo, cuerpo, enlace, leida, creado_en")
    .order("creado_en", { ascending: false })
    .limit(50);
  const hayNuevas = (data ?? []).some((n) => !n.leida);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl">Avisos</h1>
        {hayNuevas && <MarcarLeidas />}
      </div>
      {(data ?? []).length === 0 ? (
        <p className="tarjeta text-suave">Todavía no tienes avisos.</p>
      ) : (
        <ul className="grid gap-3">
          {(data ?? []).map((n) => (
            <li key={n.id} className={`tarjeta ${n.leida ? "" : "!border-lava"}`}>
              <p className="font-bold">{n.titulo}</p>
              {n.cuerpo && <p className="text-suave">{n.cuerpo}</p>}
              <p className="mt-1 text-xs text-suave">
                {new Date(n.creado_en).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })}
                {n.enlace && (
                  <>
                    {" · "}
                    <Link href={n.enlace} className="text-dorado underline">Abrir</Link>
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
