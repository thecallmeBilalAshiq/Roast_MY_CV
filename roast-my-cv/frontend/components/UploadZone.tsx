"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { FileText, Flame, Loader2, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Intensity, streamRoast, uploadCv } from "@/lib/api";

const intensities: { value: Intensity; label: string; icon: string }[] = [
  { value: "mild", label: "Mild", icon: "😊" },
  { value: "medium", label: "Medium", icon: "🔥" },
  { value: "brutal", label: "Brutal", icon: "💀" },
];

export function UploadZone() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [intensity, setIntensity] = useState<Intensity>("medium");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [progressText, setProgressText] = useState("");

  const canSubmit = file && !isLoading;
  const filePreview = useMemo(() => {
    if (!file) return null;
    return `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  }, [file]);

  function selectFile(nextFile?: File) {
    setError("");
    if (!nextFile) return;
    const validType = nextFile.name.toLowerCase().endsWith(".pdf") || nextFile.name.toLowerCase().endsWith(".docx");
    if (!validType) {
      setError("Only PDF and DOCX files may enter the arena.");
      return;
    }
    if (nextFile.size > 5 * 1024 * 1024) {
      setError("5MB max. Trim the file, not the ambition.");
      return;
    }
    setFile(nextFile);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
  }

  async function submit() {
    if (!file) return;
    setIsLoading(true);
    setError("");
    setProgressText("Parsing the CV and finding the suspicious bits...");
    try {
      const upload = await uploadCv(file);
      setProgressText("Heating up the roast...");
      localStorage.setItem(`roast-draft-${upload.session_id}`, "");
      await streamRoast(upload.session_id, intensity, (word) => {
        setProgressText("Roasting in progress...");
        const key = `roast-draft-${upload.session_id}`;
        localStorage.setItem(key, `${localStorage.getItem(key) || ""}${word}`);
      });
      router.push(`/results/${upload.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your CV was so bad it crashed our servers 💀");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:py-16">
      <div className="flex flex-col justify-center">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-citrus">AI career feedback with bite</p>
        <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-tight text-white sm:text-6xl">
          Roast My CV
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
          Upload a PDF or DOCX resume and get a funny roast, practical fixes, category scores, and a shareable result page.
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-zinc-950/72 p-4 shadow-glow backdrop-blur sm:p-6">
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`grid cursor-pointer place-items-center rounded-lg border-2 border-dashed p-8 text-center transition ${
            isDragging ? "border-ember bg-ember/10" : "border-zinc-700 bg-zinc-900/60 hover:border-citrus"
          }`}
        >
          <input className="sr-only" type="file" accept=".pdf,.docx" onChange={handleChange} />
          <UploadCloud className="mb-4 text-citrus" size={42} />
          <span className="text-lg font-bold">Drop your CV here</span>
          <span className="mt-2 text-sm text-zinc-400">PDF or DOCX, up to 5MB</span>
        </label>

        {file && (
          <div className="mt-4 flex items-center justify-between rounded-md border border-white/10 bg-white/5 p-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="shrink-0 text-mint" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{file.name}</p>
                <p className="text-xs text-zinc-400">{filePreview}</p>
              </div>
            </div>
            <button className="rounded-md p-2 hover:bg-white/10" onClick={() => setFile(null)} aria-label="Remove file">
              <X size={18} />
            </button>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-zinc-200">Roast intensity</span>
            <span className="text-sm text-zinc-400">{intensities.find((item) => item.value === intensity)?.label}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {intensities.map((item) => (
              <button
                key={item.value}
                onClick={() => setIntensity(item.value)}
                className={`rounded-md border px-3 py-3 text-sm font-bold transition ${
                  intensity === item.value ? "border-ember bg-ember text-white" : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-4 rounded-md border border-ember/40 bg-ember/10 p-3 text-sm text-red-100">{error}</p>}
        {isLoading && (
          <div className="mt-4 rounded-md border border-citrus/30 bg-citrus/10 p-3 text-sm text-amber-100">
            <Loader2 className="mr-2 inline animate-spin" size={16} />
            {progressText}
          </div>
        )}

        <button
          disabled={!canSubmit}
          onClick={submit}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-ember px-5 py-4 text-base font-black text-white shadow-glow transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Flame size={20} />}
          Roast My CV
        </button>
      </div>
    </section>
  );
}
