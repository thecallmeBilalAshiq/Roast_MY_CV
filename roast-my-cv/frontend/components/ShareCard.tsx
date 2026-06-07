"use client";

import { useRef, useState } from "react";
import { Download, Megaphone, RotateCcw } from "lucide-react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { RoastResult, submitToHall } from "@/lib/api";

export function ShareCard({ result }: { result: RoastResult }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("");
  const quote = result.roast.split(". ").find((line) => line.length > 30) || result.verdict;

  async function download() {
    if (!cardRef.current) return;
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: "#171717" });
    const link = document.createElement("a");
    link.download = "roast-my-cv-card.png";
    link.href = dataUrl;
    link.click();
  }

  async function publish() {
    try {
      await submitToHall(result.session_id);
      setStatus("Submitted to the Hall of Shame.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "The wall rejected this roast.");
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
      <div ref={cardRef} className="rounded-lg bg-zinc-900 p-5 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-citrus">My CV got roasted 💀</p>
        <p className="mt-3 text-5xl font-black">{result.scores.overall}/10</p>
        <p className="mt-4 text-sm leading-6 text-zinc-200">“{quote.slice(0, 150)}”</p>
        <p className="mt-5 text-xs font-bold text-zinc-400">Roast My CV</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button onClick={download} className="rounded-md bg-citrus px-3 py-3 text-sm font-black text-zinc-950" title="Download share card">
          <Download className="mx-auto" size={18} />
        </button>
        <button onClick={publish} className="rounded-md bg-white/10 px-3 py-3 text-sm font-black hover:bg-white/15" title="Submit to Hall of Shame">
          <Megaphone className="mx-auto" size={18} />
        </button>
        <Link href="/" className="rounded-md bg-ember px-3 py-3 text-center text-sm font-black text-white" title="Roast again">
          <RotateCcw className="mx-auto" size={18} />
        </Link>
      </div>
      {status && <p className="mt-3 text-sm text-zinc-300">{status}</p>}
    </div>
  );
}
