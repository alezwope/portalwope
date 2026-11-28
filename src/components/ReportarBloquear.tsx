"use client";

import { useState } from "react";
import { crearCliente } from "@/lib/supabase/client";
import { MOTIVOS_REPORTE, mensajeError } from "@/lib/social";
import type { ClaveTexto } from "@/lib/i18n/diccionarios";
import { rellenar } from "@/lib/i18n/diccionarios";
import { useTextos } from "@/components/Idioma";

/** Reportar y bloquear a una persona (o a un mensaje concreto) desde el chat o una tarjeta CalisBro. */
export default function ReportarBloquear({ id, alias, mensajeId, alBloquear }: { id: string; alias: string; mensajeId?: string; alBloquear: () => void }) {
  const { t } = useTextos();
  const [modo, setModo] = useState<"reportar" | "bloquear" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function reportar(motivo: string) {
    const { error } = await crearCliente().rpc("reportar", mensajeId ? { p_tipo: "mensaje", p_id: mensajeId, p_motivo: motivo } : { p_tipo: "persona", p_id: id, p_motivo: motivo });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    setModo(null);
    setMsg({ ok: true, texto: t["seg.reportado"] });
  }
  async function bloquear() {
    const { error } = await crearCliente().rpc("bloquear", { p_otro: id });
    if (error) return setMsg({ ok: false, texto: mensajeError(error) });
    alBloquear();
  }

  return (
    <div className="grid gap-2 text-sm">
      <div className="flex gap-3">
        <button type="button" onClick={() => setModo(modo === "reportar" ? null : "reportar")} className="text-suave hover:text-lava">🚩 {t["seg.reportar"]}</button>
        <button type="button" onClick={() => setModo(modo === "bloquear" ? null : "bloquear")} className="text-suave hover:text-lava">⛔ {t["seg.bloquear"]}</button>
      </div>
      {modo === "reportar" && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t["seg.reportar"]}>
          {MOTIVOS_REPORTE.map((m, i) => (
            <button key={m} type="button" onClick={() => reportar(m)} className="rounded-full border border-borde px-3 py-1 text-xs hover:border-lava">{t[`motivo.${i}` as ClaveTexto]}</button>
          ))}
        </div>
      )}
      {modo === "bloquear" && (
        <div className="grid gap-2 rounded-lg border border-dorado p-2">
          <p>{rellenar(t["seg.bloquearAviso"], { alias })}</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-lava !py-1" onClick={bloquear}>{t["seg.bloquearSi"]}</button>
            <button type="button" className="btn btn-borde !py-1" onClick={() => setModo(null)}>{t["seg.cancelar"]}</button>
          </div>
        </div>
      )}
      {msg && <p className={msg.ok ? "aviso-ok" : "aviso-error"} role="status">{msg.texto}</p>}
    </div>
  );
}
