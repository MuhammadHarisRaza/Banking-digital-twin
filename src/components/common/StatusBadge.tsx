import type { Tone } from "../../types";

const TONES: Record<string, Tone> = {
  Operational: "ok",
  "In Use": "ok",
  Active: "ok",
  Granted: "ok",
  "On Duty": "ok",
  "Limited Service": "warn",
  Upgrading: "warn",
  Pending: "warn",
  Supervised: "info",
  Pilot: "info",
  Training: "info",
};

const DOT: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  info: "bg-steel",
  muted: "bg-mute",
};

const PILL: Record<Tone, string> = {
  ok: "bg-ok/12 text-[#0a6b44]",
  warn: "bg-warn/15 text-[#8a5a10]",
  info: "bg-steel/15 text-[#1f5f96]",
  muted: "bg-brand/10 text-soft",
};

interface Props {
  status: string;
  variant?: "inline" | "pill";
}

export default function StatusBadge({ status, variant = "inline" }: Props) {
  const tone = TONES[status] ?? "muted";

  if (variant === "pill") {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] ${PILL[tone]}`}>
        <span className={`size-1.5 rounded-full ${DOT[tone]}`} />
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-soft">
      <span className={`size-2 rounded-full ${DOT[tone]}`} />
      {status}
    </span>
  );
}
