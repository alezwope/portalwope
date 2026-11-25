import { redirect } from "next/navigation";

export default async function RedirigirPerfil({ params }: PageProps<"/u/[alias]">) {
  const { alias } = await params;
  redirect(`/panel/u/${encodeURIComponent(alias)}`);
}
