"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";
import { useTextos } from "@/components/Idioma";
import { mensajeError } from "@/lib/social";

type Opcion = "amigos" | "nadie";
export default function PrivacidadSocial({ usuarioId, actual, bloqueados }: { usuarioId: string; actual: Opcion; bloqueados: { id: string; alias: string }[] }) {
  const router = useRouter();
  const { t } = useTextos();
  const OPCIONES: { id: Opcion; texto: string; detalle: string }[] = [
    { id: "amigos", texto: t["priv.amigos"], detalle: t["priv.amigosD"] },
    { id: "nadie", texto: t["priv.nadie"], detalle: t["priv.nadieD"] },
  ];
  const [valor, setValor] = useState<Opcion>(actual);
  const [lista, setLista] = useState(bloqueados);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function cambiar(v: Opcion) {
    setValor(v);
    setMsg(null);
    const { error } = await crearCliente().from("profiles").update({ compartir_logros: v }).eq("id", usuarioId);
    setMsg(error ? { ok: false, texto: t["priv.error"] } : { ok: true, texto: t["priv.guardado"] });
    if (error) setValor(actual);
    else router.refresh();
  }
  async function desbloquear(id: string) {
    const { error } = await crearCliente().rpc("desbloquear", { p_otro: id });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    setLista((l) => l.filter((x) => x.id !== id));
  }

  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-2">
        <legend className="mb-1 font-bold">{t["priv.quien"]}</legend>
        {OPCIONES.map((o) => (
          <label key={o.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-borde p-3 has-[:checked]:border-lava">
            <input type="radio" name="compartir" className="mt-1 accent-[var(--lava)]" checked={valor === o.id} onChange={() => cambiar(o.id)} />
            <span>
              <span className="block font-bold">{o.texto}</span>
              <span className="text-sm text-suave">{o.detalle}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {msg && <p className={msg.ok ? "aviso-ok" : "aviso-error"} role="status">{msg.texto}</p>}
      <div className="grid gap-2">
        <h3 className="font-bold">{t["priv.bloqueadas"]}</h3>
        {lista.length === 0 ? (
          <p className="text-sm text-suave">{t["priv.ninguna"]}</p>
        ) : (
          <ul className="grid gap-2">
            {lista.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 rounded-lg border border-borde p-2">
                <span>@{b.alias}</span>
                <button className="btn btn-borde !py-1 text-sm" onClick={() => desbloquear(b.id)}>{t["priv.desbloquear"]}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
