import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const RUTAS_PRIVADAS = ["/panel", "/onboarding", "/admin", "/nueva-clave"];

export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims verifica el token localmente (sin viajar a Supabase en cada visita); solo renueva cuando vence.
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims?.sub ? { id: claims.claims.sub } : null;

  const ruta = request.nextUrl.pathname;
  const esPrivada = RUTAS_PRIVADAS.some((r) => ruta === r || ruta.startsWith(r + "/"));

  const redirigir = (destino: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = destino;
    url.search = "";
    Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const r = NextResponse.redirect(url);
    respuesta.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!user && esPrivada) return redirigir("/entrar", { siguiente: ruta });
  if (user && (ruta === "/entrar" || ruta === "/")) return redirigir("/panel");

  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
