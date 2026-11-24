"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";
import { ROLES, type Rol } from "@/lib/roles";

export default function SelectorRol({ usuarioId, actual, soyYo }: { usuarioId: string; actual: Rol; soyYo: boolean }) {
  const router = useRouter();
  const [rol, setRol] = useState<Rol>(actual);
  const [error, setError] = useState("");

  async function cambiar(nuevo: Rol) {
    if (soyYo && !confirm("Estás cambiando tu propio rol. Si dejas de ser Super Admin perderás este panel. ¿Continuar?")) return;
    setError("");
    const previo = rol;
    setRol(nuevo);
    const { error } = await crearCliente().rpc("admin_cambiar_rol", { p_usuario: usuarioId, p_rol: nuevo });
    if (error) {
      setRol(previo);
      setError(error.message);
    } else router.refresh();
  }

  return (
    <div>
      <select className="campo !py-1.5" value={rol} onChange={(e) => cambiar(e.target.value as Rol)} aria-label="Rol del usuario">
        {(Object.keys(ROLES) as Rol[]).map((r) => (
          <option key={r} value={r}>{ROLES[r].nombre}</option>
        ))}
      </select>
      {error && <p className="aviso-error mt-1" role="alert">{error}</p>}
    </div>
  );
}
