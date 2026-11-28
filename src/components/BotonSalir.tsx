"use client";

import { useTextos } from "@/components/Idioma";
import { crearCliente } from "@/lib/supabase/client";

export default function BotonSalir() {
  const { t } = useTextos();
  async function salir() {
    await crearCliente().auth.signOut();
    window.location.assign("/");
  }
  return (
    <button type="button" onClick={salir} className="btn btn-borde !py-2">
      {t["comun.salir"]}
    </button>
  );
}
