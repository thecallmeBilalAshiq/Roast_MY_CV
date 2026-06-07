"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Bar, BarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { getRoast, RoastResult } from "@/lib/api";
import { ScoreCard } from "./ScoreCard";
import { ShareCard } from "./ShareCard";

export function RoastDisplay({ id }: { id: string }) {
  const [result, setResult] = useState<RoastResult | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getRoast(id)
      .then((data) => {
        if (!mounted) return;
        setResult(data);
        let index = 0;
        const words = data.roast.split(" ");
        const timer = setInterval(() => {
          index += 1;
          setText(words.slice(0, index).join(" "));
          if (index >= words.length) clearInterval(timer);
        }, 20);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Your CV was so bad it crashed our servers 💀"));
    return () => {
      mounted = false;
    };
  }, [id]);

  const chartData = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.scores).map(([name, score]) => ({ name, score }));
  }, [result]);

  if (error) {
    return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-red-100">{error}</main>;
  }

  if (!result) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-lg border border-white/10 bg-white/5 p-8">
          <Loader2 className="mb-4 animate-spin text-citrus" />
          <div className="h-7 w-48 animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-24 animate-pulse rounded bg-white/10" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-lg border border-white/10 bg-zinc-950/72 p-5 shadow-glow sm:p-7">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-citrus">{result.intensity} roast</p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">{result.verdict}</h1>
          <p className="mt-6 min-h-36 whitespace-pre-wrap text-lg leading-8 text-zinc-200">{text}</p>
        </section>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(result.scores).map(([label, value]) => (
              <ScoreCard key={label} label={label} value={value} />
            ))}
          </div>
          <ShareCard result={result} />
        </aside>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={chartData}>
              <PolarGrid stroke="#52525b" />
              <PolarAngleAxis dataKey="name" tick={{ fill: "#d4d4d8", fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Radar dataKey="score" stroke="#e5484d" fill="#e5484d" fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#d4d4d8" fontSize={12} />
              <YAxis domain={[0, 10]} stroke="#a1a1aa" fontSize={12} />
              <Bar dataKey="score" fill="#f5a524" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-zinc-950/72 p-5">
          <h2 className="text-xl font-black">Serious Feedback</h2>
          <ul className="mt-4 space-y-3">
            {result.serious_feedback.map((tip) => (
              <li key={tip} className="rounded-md bg-white/5 p-3 text-zinc-200">
                {tip}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-white/10 bg-zinc-950/72 p-5">
          <h2 className="text-xl font-black">Section Notes</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(result.section_feedback || {}).map(([section, tips]) => (
              <details key={section} className="rounded-md bg-white/5 p-3">
                <summary className="flex cursor-pointer list-none items-center justify-between font-bold capitalize">
                  {section}
                  <ChevronDown size={18} />
                </summary>
                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                  {tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
