"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CLAVE_INTENCION } from "@/components/FormularioAcceso";

/** Si al registrarse eligió «Soy entrenador / escuela / wellness / tienda», le lleva a crear su página (una sola vez). */
export default function IntencionPagina({ tiposQueTiene }: { tiposQueTiene: string[] }) {
  const router = useRouter();
  useEffect(() => {
    let tipo: string | null = null;
    try {
      tipo = localStorage.getItem(CLAVE_INTENCION);
      localStorage.removeItem(CLAVE_INTENCION);
    } catch {}
    if (tipo && !tiposQueTiene.includes(tipo)) router.push(`/panel/perfil?crear=${encodeURIComponent(tipo)}#paginas`);
  }, [router, tiposQueTiene]);
  return null;
}
