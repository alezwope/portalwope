// Pines de escuelas de entrenadores: [[slug, escuela, sede, lat, lng], …]. Se cachea 10 minutos.
export const revalidate = 600;

export async function GET() {
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/rpc/escuelas_mapa`, {
    method: "POST",
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, "Content-Type": "application/json" },
    body: "{}",
    next: { revalidate: 600 },
  });
  if (!r.ok) return Response.json({ error: "No pudimos cargar las escuelas." }, { status: 502 });
  return new Response(await r.text(), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" },
  });
}
