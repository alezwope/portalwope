import PorWope from "@/components/PorWope";
import Image from "next/image";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import BotonComentarios from "@/components/BotonComentarios";
import Cajon from "@/components/Cajon";
import MenuPersianas from "@/components/MenuPersianas";
import ModoEntrenar, { BotonBiceps, BotonEntrenarYa } from "@/components/ModoEntrenar";
import NavPrincipal from "@/components/NavPrincipal";
import Preferencias, { SincronizarPreferencias } from "@/components/Preferencias";
import SelectorModo from "@/components/SelectorModo";
import { textos } from "@/lib/i18n/servidor";
import { esIdioma } from "@/lib/i18n/diccionarios";
import { equipoActual } from "@/lib/permisos";
import { datosInicio, misPaginas, requerirPerfil } from "@/lib/sesion";

/** Esqueleto de la app (plantilla definitiva): persianas a la izquierda en computadora; cajón, barra inferior y bíceps en teléfono. */
export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const { perfil } = await requerirPerfil();
  const [paginas, { t }, equipo, { inicio }] = await Promise.all([misPaginas(), textos(), equipoActual(), datosInicio()]);
  const count = Number(inicio.notificaciones ?? 0);
  const tiposCat = inicio.tipos_comentario as { clave: string; datos: unknown }[];
  const sinLeer = Number(inicio.mensajes ?? 0);
  const entrenador = paginas.find((p) => p.tipo === "entrenador");
  const alias = perfil.alias ?? "yo";
  const esEquipo = equipo.esSuper || equipo.permisos.length > 0;
  const tipos = (tiposCat ?? []).map((c) => ({ clave: c.clave, nombre: (c.datos as { es?: string }).es ?? c.clave }));
  const p = perfil as typeof perfil & { idioma?: string; tema?: string };

  const avisos = (
    <Link
      href="/panel/notificaciones"
      className="relative rounded-full border border-borde bg-card px-2.5 py-1 text-sm"
      aria-label={count ? `${t["app.avisos"]}: ${count}` : t["app.avisos"]}
    >
      <span aria-hidden>🔔</span>
      {!!count && (
        <span className="num absolute -right-1 -top-1 min-w-5 rounded-full bg-lava px-1 text-center text-xs font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );

  const mensajes = (
    <Link
      href="/panel/mensajes"
      className="relative rounded-full border border-borde bg-card px-2.5 py-1 text-sm"
      aria-label={sinLeer ? `${t["menu.universo.mensajes"]}: ${sinLeer}` : t["menu.universo.mensajes"]}
    >
      <span aria-hidden>💬</span>
      {sinLeer > 0 && (
        <span className="num absolute -right-1 -top-1 min-w-5 rounded-full bg-lava px-1 text-center text-xs font-bold text-white">
          {sinLeer > 9 ? "9+" : sinLeer}
        </span>
      )}
    </Link>
  );

  return (
    <div className="flex min-h-screen">
      <SincronizarPreferencias idioma={esIdioma(p.idioma) ? p.idioma : "es"} tema={p.tema ?? "oscuro"} />

      {/* Barra lateral de computadora (280 px) */}
      <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col border-r border-borde bg-bg md:flex">
        <Link href="/panel" className="flex items-center gap-3 border-b border-borde px-4 py-4">
          <Image src="/brand/isotipo-96.png" alt="" width={44} height={44} priority className="logo-fundido" />
          <div className="min-w-0">
            <Image src="/brand/logotipo.png" alt="UniBars" width={130} height={28} priority className="logo-fundido h-6 w-auto" />
            <p className="mt-0.5 whitespace-nowrap text-[10px] uppercase tracking-wider text-suave">{t["marca.lema"]}</p>
          </div>
        </Link>
        <div className="flex-1 overflow-y-auto p-3">
          <MenuPersianas alias={alias} entrenador={!!entrenador} sinLeer={sinLeer} />
        </div>
        <div className="grid gap-2 border-t border-borde p-3">
          {esEquipo && (
            <Link href="/admin" className="btn btn-borde !py-1.5 text-sm">🛠️ {t["app.consola"]}</Link>
          )}
          <Link href="/panel/mapa" className="btn btn-borde !py-1.5 text-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-ok" aria-hidden /> {t["menu.mapa.vivo"]}
          </Link>
          <p className="text-center text-[11px] text-suave"><PorWope texto={t["marca.by"]} /></p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <header className="sticky top-0 z-20 border-b border-borde bg-bg">
          <div className="flex items-center justify-between gap-2 px-3 py-2 md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Cajon alias={alias} entrenador={!!entrenador} sinLeer={sinLeer} />
              <Link href="/panel" className="flex items-center gap-1.5 md:hidden" aria-label="UniBars">
                <Image src="/brand/isotipo-96.png" alt="" width={32} height={32} className="logo-fundido" />
                <span className="titulo hidden text-sm tracking-widest min-[380px]:inline">UNIBARS</span>
              </Link>
              <div className="hidden md:block">
                <SelectorModo alias={alias} entrenador={entrenador?.nombre ?? null} />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <BotonEntrenarYa texto={t["app.entrenarYa"]} />
              <Link href="/panel/sugerencias" className="hidden rounded-full border border-borde bg-card px-2.5 py-1 text-sm sm:inline-block" aria-label={t["app.sugerencias"]} title={t["app.sugerencias"]}>
                💡
              </Link>
              {mensajes}
              {avisos}
              <div className="hidden sm:block"><Preferencias /></div>
              <div className="sm:hidden"><Preferencias compacto /></div>
              <Link href={`/panel/u/${encodeURIComponent(alias)}`} className="hidden items-center gap-2 rounded-full border border-borde bg-card py-0.5 pl-0.5 pr-3 md:flex" aria-label={t["menu.yo.perfil"]}>
                <Avatar alias={alias} url={perfil.avatar_url} nivel={perfil.nivel} tam={28} />
                <span className="max-w-[8rem] truncate text-sm font-bold">@{alias}</span>
              </Link>
            </div>
          </div>
          {entrenador && (
            <div className="border-t border-borde px-3 py-1.5 md:hidden">
              <SelectorModo alias={alias} entrenador={entrenador.nombre} />
            </div>
          )}
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:px-6 md:pb-10">{children}</main>
      </div>

      <NavPrincipal />
      <BotonBiceps />
      <BotonComentarios tipos={tipos} />
      <ModoEntrenar />
    </div>
  );
}
