export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Intensity = "mild" | "medium" | "brutal";

export type RoastResult = {
  session_id: string;
  roast: string;
  scores: Record<"skills" | "experience" | "formatting" | "impact" | "overall", number>;
  serious_feedback: string[];
  section_feedback?: Record<string, string[]>;
  sections?: Record<string, string>;
  verdict: string;
  intensity: Intensity;
  created_at: string;
  upvotes: number;
  is_public: boolean;
};

export async function uploadCv(file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_URL}/upload-cv`, { method: "POST", body: form });
  if (!response.ok) throw new Error(await getError(response));
  return response.json() as Promise<{ session_id: string; sections: Record<string, string> }>;
}

export async function streamRoast(
  sessionId: string,
  intensity: Intensity,
  onWord: (word: string) => void,
): Promise<RoastResult> {
  const response = await fetch(`${API_URL}/roast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, intensity }),
  });
  if (!response.ok || !response.body) throw new Error(await getError(response));

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: RoastResult | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const line = event.split("\n").find((item) => item.startsWith("data: "));
      if (!line) continue;
      const payload = JSON.parse(line.slice(6));
      if (payload.type === "word") onWord(payload.value);
      if (payload.type === "result") finalResult = payload.value;
    }
  }

  if (!finalResult) throw new Error("The roast fizzled out before the verdict arrived.");
  return finalResult;
}

export async function getRoast(id: string): Promise<RoastResult> {
  const response = await fetch(`${API_URL}/roast/${id}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

export async function submitToHall(id: string) {
  const response = await fetch(`${API_URL}/hall-of-shame/${id}/submit`, { method: "POST" });
  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

export async function getHall(sort: string) {
  const response = await fetch(`${API_URL}/hall-of-shame?sort=${sort}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

export async function upvoteRoast(id: string) {
  const response = await fetch(`${API_URL}/hall-of-shame/${id}/upvote`, { method: "POST" });
  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

async function getError(response: Response) {
  try {
    const data = await response.json();
    return data.detail || "Your CV was so bad it crashed our servers.";
  } catch {
    return "Your CV was so bad it crashed our servers.";
  }
}
