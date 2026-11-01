import { Banknote, Bot, Server, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import type { ActivityEvent, ActivityKind } from "../../types";

const ICONS: Record<ActivityKind, LucideIcon> = {
  transaction: Banknote,
  people: Users,
  system: Server,
  agent: Bot,
  compliance: ShieldCheck,
};

export default function ActivityList({ events }: { events: ActivityEvent[] }) {
  return (
    <ol>
      {events.map(({ id, kind, title, detail, time }) => {
        const Icon = ICONS[kind];
        return (
          <li key={id} className="flex items-start gap-3.5 border-b border-line-soft py-2 last:border-0">
            <Icon className="mt-0.5 size-5 shrink-0 text-gold" strokeWidth={1.5} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="text-[15.5px] leading-snug">{title}</div>
              <div className="text-[14px] leading-snug text-soft">{detail}</div>
            </div>
            <time className="shrink-0 text-[14px] text-mute">{time}</time>
          </li>
        );
      })}
    </ol>
  );
}
