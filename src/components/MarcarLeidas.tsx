"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTextos } from "@/components/Idioma";
import { crearCliente } from "@/lib/supabase/client";

export default function MarcarLeidas() {
  const { t } = useTextos();
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function marcar() {
    setCargando(true);
    await crearCliente().from("notificaciones").update({ leida: true }).eq("leida", false);
    setCargando(false);
    router.refresh();
  }

  return (
    <button type="button" onClick={marcar} disabled={cargando} className="btn btn-borde">
      {t["avisos.marcar"]}
    </button>
  );
}
