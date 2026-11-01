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
  ok: "bg-ok/15 text-[#a9ecc4]",
  warn: "bg-warn/15 text-[#f4d59a]",
  info: "bg-steel/15 text-[#c3d9f0]",
  muted: "bg-white/8 text-soft",
};

interface Props {
  status: string;
  variant?: "inline" | "pill";
}

export default function StatusBadge({ status, variant = "inline" }: Props) {
  const tone = TONES[status] ?? "muted";

  if (variant === "pill") {
    return (
      <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[15px] ${PILL[tone]}`}>
        <span className={`size-2 rounded-full ${DOT[tone]}`} />
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-[15px] text-soft">
      <span className={`size-2 rounded-full ${DOT[tone]}`} />
      {status}
    </span>
  );
}
