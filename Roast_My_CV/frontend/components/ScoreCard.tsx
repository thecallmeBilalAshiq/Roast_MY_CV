"use client";

export function ScoreCard({ label, value }: { label: string; value: number }) {
  const tone = value >= 8 ? "text-mint" : value >= 5 ? "text-citrus" : "text-ember";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold capitalize text-zinc-300">{label}</span>
        <span className={`text-3xl font-black ${tone}`}>{value}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-current transition-all duration-700" style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}
