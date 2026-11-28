"use client";

import { useState } from "react";
import { crearCliente } from "@/lib/supabase/client";
import { mensajeError, type MisAmigos } from "@/lib/social";
import { useTextos } from "@/components/Idioma";

/** Comparte un plan (juntada, encuentro) con alguien de confianza: sistema del teléfono, copiar o mensaje a un compañero. */
export default function CompartirPlan({ texto }: { texto: string }) {
  const { t } = useTextos();
  const [abierto, setAbierto] = useState(false);
  const [amigos, setAmigos] = useState<{ id: string; alias: string }[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function abrir() {
    setAbierto(!abierto);
    if (amigos) return;
    const { data } = await crearCliente().rpc("mis_amigos");
    setAmigos(((data as MisAmigos | null)?.amigos ?? []).map((r) => ({ id: r.persona.id, alias: r.persona.alias })));
  }
  async function sistema() {
    try {
      if (navigator.share) { await navigator.share({ text: texto }); return; }
      await navigator.clipboard.writeText(texto);
      setMsg({ ok: true, texto: t["seg.copiado"] });
    } catch { /* cancelado por la persona */ }
  }
  async function enviar(id: string) {
    const { error } = await crearCliente().rpc("enviar_mensaje", { p_a: id, p_texto: texto.slice(0, 500) });
    setMsg(error ? { ok: false, texto: mensajeError(error) } : { ok: true, texto: t["seg.enviado"] });
  }

  return (
    <div className="grid gap-2">
      <button type="button" onClick={abrir} aria-expanded={abierto} className="justify-self-start text-sm text-suave hover:text-lava">🛡️ {t["seg.compartir"]}</button>
      {abierto && (
        <div className="grid gap-2 rounded-lg border border-borde p-2 text-sm">
          <p className="text-suave">{t["seg.compartirAyuda"]}</p>
          <button type="button" className="btn btn-borde justify-self-start !py-1" onClick={sistema}>📤 {t["seg.compartirOtro"]}</button>
          {amigos && amigos.length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={t["seg.aCompanero"]}>
              {amigos.map((a) => <button key={a.id} type="button" onClick={() => enviar(a.id)} className="rounded-full border border-borde px-3 py-1 text-xs hover:border-lava">@{a.alias}</button>)}
            </div>
          )}
          {msg && <p className={msg.ok ? "aviso-ok" : "aviso-error"} role="status">{msg.texto}</p>}
        </div>
      )}
    </div>
  );
}
