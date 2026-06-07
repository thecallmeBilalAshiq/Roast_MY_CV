"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { getHall, upvoteRoast } from "@/lib/api";

type HallItem = {
  session_id: string;
  verdict: string;
  scores: { overall: number };
  intensity: string;
  upvotes: number;
  created_at: string;
};

const sorts = [
  { value: "recent", label: "Most Recent" },
  { value: "lowest", label: "Lowest Score" },
  { value: "upvoted", label: "Most Upvoted" },
];

export function HallOfShame() {
  const [sort, setSort] = useState("recent");
  const [items, setItems] = useState<HallItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getHall(sort)
      .then((data) => {
        setItems(data.items);
        setError("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "The Hall of Shame tripped over its own cape."))
      .finally(() => setIsLoading(false));
  }, [sort]);

  async function upvote(id: string) {
    const response = await upvoteRoast(id);
    setItems((current) => current.map((item) => (item.session_id === id ? { ...item, upvotes: response.upvotes } : item)));
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-citrus">Anonymous public roasts</p>
          <h1 className="mt-2 text-4xl font-black text-white">Hall of Shame</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {sorts.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                setIsLoading(true);
                setSort(item.value);
              }}
              className={`rounded-md px-3 py-2 text-sm font-bold ${
                sort === item.value ? "bg-ember text-white" : "bg-white/10 text-zinc-200 hover:bg-white/15"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-6 rounded-md border border-ember/40 bg-ember/10 p-4 text-red-100">{error}</p>}
      {isLoading && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-lg bg-white/10" />
          ))}
        </div>
      )}
      {!isLoading && items.length === 0 && (
        <p className="mt-8 rounded-lg border border-white/10 bg-white/5 p-6 text-zinc-300">
          No public roasts yet. Be brave. Be first.
        </p>
      )}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item.session_id} className="rounded-lg border border-white/10 bg-zinc-950/72 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-bold uppercase text-zinc-300">{item.intensity}</span>
              <span className="text-2xl font-black text-citrus">{item.scores.overall}/10</span>
            </div>
            <p className="mt-4 min-h-20 text-lg font-bold leading-7">{item.verdict}</p>
            <button
              onClick={() => upvote(item.session_id)}
              className="mt-5 flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/15"
            >
              <ArrowUp size={16} />
              {item.upvotes}
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
