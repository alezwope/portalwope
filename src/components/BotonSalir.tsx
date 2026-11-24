"use client";

import { crearCliente } from "@/lib/supabase/client";

export default function BotonSalir() {
  async function salir() {
    await crearCliente().auth.signOut();
    window.location.assign("/");
  }
  return (
    <button type="button" onClick={salir} className="btn btn-borde !py-2">
      Salir
    </button>
  );
}
