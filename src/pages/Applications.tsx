import { ArrowUpRight, Camera, type LucideIcon } from "lucide-react";
import { APP_ICONS } from "../components/common/appIcons";
import { APPLICATIONS } from "../data/applications";
import { useAppLauncher } from "../hooks/useAppLauncher";
import type { AppLinkKey } from "../types";

const CARD =
  "group flex items-start gap-3.5 rounded-xl border border-line bg-panel p-4 text-left transition-colors hover:border-brand hover:bg-card";

export default function Applications() {
  const launch = useAppLauncher();
  const apps: { key: AppLinkKey; name: string; detail: string; icon: LucideIcon }[] = [
    { key: "digitalEye", name: "Digital Eye", detail: "Branch Surveillance & Operations", icon: Camera },
    ...Object.values(APPLICATIONS).map((a) => ({ key: a.id, name: a.name, detail: `${a.category} · ${a.version}`, icon: APP_ICONS[a.id] })),
  ];

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 desk:px-11">
      <h1 className="text-[34px] leading-tight font-bold tracking-tight">Applications</h1>
      <p className="mt-1 text-[17px] text-soft">Every application connected to the platform. Links can be changed in Settings.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {apps.map(({ key, name, detail, icon: Icon }) => (
          <button key={key} type="button" className={CARD} onClick={() => launch(key)}>
            <Icon className="mt-0.5 size-7 shrink-0 text-brand" strokeWidth={1.5} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold">{name}</span>
              <span className="block text-[14.5px] text-soft">{detail}</span>
            </span>
            <ArrowUpRight className="size-5 shrink-0 text-mute transition-colors group-hover:text-brand" aria-hidden="true" />
          </button>
        ))}
      </div>
    </main>
  );
}
