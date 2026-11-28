"use client";

import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";

/** «Abrir» de un aviso: lo marca como leído y recién entonces te lleva al enlace. */
export default function EnlaceAviso({ id, href, leida, children }: { id: string; href: string; leida: boolean; children: React.ReactNode }) {
  const router = useRouter();
  async function abrir(e: React.MouseEvent) {
    e.preventDefault();
    if (!leida) await crearCliente().from("notificaciones").update({ leida: true }).eq("id", id);
    router.push(href);
    router.refresh();
  }
  return (
    <a href={href} onClick={abrir} className="text-dorado underline">
      {children}
    </a>
  );
}
