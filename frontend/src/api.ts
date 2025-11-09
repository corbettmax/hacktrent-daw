export type Plan =
  | { type: "add" | "remove" | "mute" | "unmute"; instrument: string; pattern?: string }
  | { type: "tempo:set"; bpm: number }
  | { type: "tempo:delta"; delta: number }
  | { type: "key:set"; key: "C" | "G" | "A minor" | "E minor" }
  | { type: "swing:set"; percent: number }
  | { type: "unknown"; raw: string };

export async function sendCommand(text: string) {
  const r = await fetch("/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json() as Promise<{ plan: Plan; source: "ai" | "rules" }>;
}
