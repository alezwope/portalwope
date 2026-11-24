import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "UniBars · El Universo de las Barras", template: "%s · UniBars" },
  description:
    "La red social de la calistenia: escuelas, coaches, alumnos y atletas conectados, con mapa mundial de parques, niveles y comunidad.",
  icons: { icon: "/icon.png", apple: "/brand/icon-192.png" },
  openGraph: {
    title: "UniBars · El Universo de las Barras",
    description: "La red social de la calistenia.",
    images: ["/brand/isologo.webp"],
    locale: "es_AR",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#0D0B0A" };

// Aplica el tema guardado antes de pintar para evitar el parpadeo.
const SCRIPT_TEMA = `try{var t=localStorage.getItem('unibars-tema');if(t==='claro'){document.documentElement.dataset.tema='claro'}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
