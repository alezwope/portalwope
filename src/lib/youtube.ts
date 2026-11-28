/** Devuelve el id de un video de YouTube (youtu.be, watch?v=, shorts, embed) o null. */
export function idYoutube(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    if (u.hostname.endsWith("youtube.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/\/(shorts|embed|live)\/([\w-]{6,})/);
      return m ? m[2] : null;
    }
  } catch {}
  return null;
}
export const esYoutube = (url: string) => !url.trim() || /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(url.trim());
