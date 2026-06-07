import type { Metadata } from "next";
import Link from "next/link";
import { Flame } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roast My CV",
  description: "Upload your CV and receive a brutally funny AI roast with practical feedback.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(229,72,77,.22),transparent_34%),linear-gradient(135deg,#101010,#19120f_48%,#0a0f0c)]">
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
            <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-ember text-white shadow-glow">
                <Flame size={20} />
              </span>
              Roast My CV
            </Link>
            <nav className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <Link className="rounded-md px-3 py-2 hover:bg-white/10" href="/">
                Upload
              </Link>
              <Link className="rounded-md px-3 py-2 hover:bg-white/10" href="/hall-of-shame">
                Hall of Shame
              </Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
