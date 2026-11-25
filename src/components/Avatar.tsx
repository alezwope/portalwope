import { nivelDe } from "@/lib/catalogos";

export default function Avatar({ alias, url, nivel, tam = 40 }: { alias: string; url: string | null; nivel?: string | null; tam?: number }) {
  const color = nivelDe(nivel)?.color ?? "var(--borde)";
  const estilo = { width: tam, height: tam, borderColor: color };
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" referrerPolicy="no-referrer" className="shrink-0 rounded-full border-2 object-cover" style={estilo} />
  ) : (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full border-2 bg-bg font-bold uppercase text-lava" style={{ ...estilo, fontSize: tam * 0.4 }}>
      {alias.slice(0, 1)}
    </span>
  );
}
