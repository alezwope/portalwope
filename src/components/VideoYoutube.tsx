import { idYoutube } from "@/lib/youtube";

/** Video de YouTube sin cookies de seguimiento (youtube-nocookie). */
export default function VideoYoutube({ url, titulo }: { url: string | null; titulo: string }) {
  const id = idYoutube(url);
  if (!id) return url ? <a href={url} target="_blank" rel="noopener noreferrer nofollow ugc" className="underline">{url}</a> : null;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
      <iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title={titulo} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen className="absolute inset-0 h-full w-full" />
    </div>
  );
}
