"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";
import { mensajeError, type PerfilPublico } from "@/lib/social";

export default function AccionesPerfil({ p }: { p: Pick<PerfilPublico, "id" | "amistad" | "amistad_id" | "alias"> }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmarBloqueo, setConfirmarBloqueo] = useState(false);

  async function llamar(fn: string, args: Record<string, unknown>, despues?: () => void) {
    setMsg(null);
    const { error } = await crearCliente().rpc(fn, args);
    if (error) return setMsg(mensajeError(error));
    if (despues) despues();
    else router.refresh();
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {p.amistad === "ninguna" && <button className="btn btn-lava" onClick={() => llamar("amistad_enviar", { p_destino: p.id })}>Agregar compañero</button>}
        {p.amistad === "enviada" && <button className="btn btn-borde" onClick={() => llamar("amistad_quitar", { p_otro: p.id })}>Cancelar solicitud</button>}
        {p.amistad === "recibida" && p.amistad_id && (
          <>
            <button className="btn btn-lava" onClick={() => llamar("amistad_resolver", { p_id: p.amistad_id, p_aceptar: true })}>Aceptar solicitud</button>
            <button className="btn btn-borde" onClick={() => llamar("amistad_resolver", { p_id: p.amistad_id, p_aceptar: false })}>Rechazar</button>
          </>
        )}
        {p.amistad === "amigos" && <button className="btn btn-borde" onClick={() => llamar("amistad_quitar", { p_otro: p.id })}>Quitar de mis compañeros</button>}
        {!confirmarBloqueo && <button className="btn btn-borde" onClick={() => setConfirmarBloqueo(true)}>Bloquear</button>}
      </div>
      {confirmarBloqueo && (
        <div className="tarjeta grid gap-2 !border-dorado">
          <p className="text-sm">Si bloqueas a @{p.alias}, no podrán verse ni escribirse, y se quita la amistad. Puedes desbloquear desde tu perfil.</p>
          <div className="flex gap-2">
            <button className="btn btn-lava !py-1.5" onClick={() => llamar("bloquear", { p_otro: p.id }, () => router.push("/panel/comunidad"))}>Sí, bloquear</button>
            <button className="btn btn-borde !py-1.5" onClick={() => setConfirmarBloqueo(false)}>Cancelar</button>
          </div>
        </div>
      )}
      {msg && <p className="aviso-error" role="alert">{msg}</p>}
    </div>
  );
}
