"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { crearCliente } from "@/lib/supabase/client";
import { hace } from "@/lib/social";
import { useTextos } from "@/components/Idioma";
import Avatar from "@/components/Avatar";

type Conv = { id: string; alias: string; avatar_url: string | null; nivel: string | null; ultimo: string; cuando: string; sin_leer: number };

export default function Conversaciones() {
  const { t, idioma } = useTextos();
  const [lista, setLista] = useState<Conv[] | null>(null);
  useEffect(() => {
    crearCliente().rpc("conversaciones").then(({ data }) => setLista((data ?? []) as Conv[]));
  }, []);
  if (!lista) return <p className="tarjeta text-suave">{t["crw.cargando"]}</p>;
  if (lista.length === 0) return <p className="tarjeta text-suave">{t["msg.vacio"]}</p>;
  return (
    <ul className="grid gap-2">
      {lista.map((c) => (
        <li key={c.id}>
          <Link href={`/panel/mensajes/${c.alias}`} className="tarjeta flex items-center gap-3 hover:!border-lava">
            <Avatar alias={c.alias} url={c.avatar_url} nivel={c.nivel} />
            <div className="min-w-0 flex-1">
              <p className="font-bold">@{c.alias}</p>
              <p className={`truncate text-sm ${c.sin_leer > 0 ? "font-bold" : "text-suave"}`}>{c.ultimo}</p>
            </div>
            <div className="text-right text-xs text-suave">
              <p>{hace(c.cuando, idioma)}</p>
              {c.sin_leer > 0 && <p className="mt-1 inline-block rounded-full bg-lava px-2 text-white">{c.sin_leer}</p>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
