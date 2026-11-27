"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";
import { IDIOMAS, type Idioma } from "@/lib/i18n/diccionarios";
import { useTextos } from "@/components/Idioma";

const COOKIE = "unibars-idioma";
const UN_ANIO = 60 * 60 * 24 * 365;

function guardarCookie(i: Idioma) {
  document.cookie = `${COOKIE}=${i}; path=/; max-age=${UN_ANIO}; samesite=lax`;
  document.documentElement.lang = i;
}

function aplicarTema(claro: boolean) {
  if (claro) document.documentElement.dataset.tema = "claro";
  else delete document.documentElement.dataset.tema;
  try { localStorage.setItem("unibars-tema", claro ? "claro" : "oscuro"); } catch {}
}

async function guardarEnPerfil(datos: { idioma?: Idioma; tema?: "claro" | "oscuro" }) {
  const sb = crearCliente();
  const { data } = await sb.auth.getUser();
  if (data.user) await sb.from("profiles").update(datos).eq("id", data.user.id);
}

/** Botones de tema (☀️/🌙) e idioma (ES/EN/PT). Se guardan en el aparato y, si hay sesión, en el perfil. */
export default function Preferencias({ compacto = false }: { compacto?: boolean }) {
  const { t, idioma } = useTextos();
  const router = useRouter();
  const [claro, setClaro] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClaro(document.documentElement.dataset.tema === "claro");
  }, []);

  function alternarTema() {
    const s = !claro;
    setClaro(s);
    aplicarTema(s);
    void guardarEnPerfil({ tema: s ? "claro" : "oscuro" });
  }

  async function cambiarIdioma(i: Idioma) {
    if (i === idioma) return;
    guardarCookie(i);
    await guardarEnPerfil({ idioma: i });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      <div role="group" aria-label={t["idioma.etiqueta"]} className="flex rounded-full border border-borde bg-card p-0.5 text-xs font-bold">
        {(compacto ? [idioma] : IDIOMAS).map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => (compacto ? cambiarIdioma(IDIOMAS[(IDIOMAS.indexOf(i) + 1) % IDIOMAS.length]) : cambiarIdioma(i))}
            aria-pressed={i === idioma}
            className={`rounded-full px-2 py-1 uppercase ${i === idioma ? "bg-lava text-white" : "text-suave hover:text-texto"}`}
            title={t["idioma.etiqueta"]}
          >
            {i}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={alternarTema}
        className="rounded-full border border-borde bg-card px-2.5 py-1 text-sm"
        aria-label={claro ? t["tema.oscuro"] : t["tema.claro"]}
        title={claro ? t["tema.oscuro"] : t["tema.claro"]}
      >
        {claro ? "🌙" : "☀️"}
      </button>
    </div>
  );
}

/** Al entrar en otro aparato, trae el idioma y el tema guardados en el perfil. */
export function SincronizarPreferencias({ idioma, tema }: { idioma: Idioma; tema: string }) {
  const { idioma: actual } = useTextos();
  const router = useRouter();
  useEffect(() => {
    let localTema: string | null = null;
    try { localTema = localStorage.getItem("unibars-tema"); } catch {}
    if (!localTema && (tema === "claro" || tema === "oscuro")) aplicarTema(tema === "claro");
    const tieneCookie = document.cookie.split("; ").some((c) => c.startsWith(COOKIE + "="));
    if (!tieneCookie && idioma !== actual) {
      guardarCookie(idioma);
      router.refresh();
    }
  }, [idioma, tema, actual, router]);
  return null;
}
