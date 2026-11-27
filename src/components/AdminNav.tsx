"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav({ items }: { items: { href: string; nombre: string }[] }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Secciones de la consola" className="flex flex-wrap gap-2">
      {items.map((i) => {
        const activa = i.href === "/admin" ? ruta === "/admin" : ruta.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={activa ? "page" : undefined}
            className={`btn ${activa ? "btn-lava" : "btn-borde"}`}>
            {i.nombre}
          </Link>
        );
      })}
    </nav>
  );
}
