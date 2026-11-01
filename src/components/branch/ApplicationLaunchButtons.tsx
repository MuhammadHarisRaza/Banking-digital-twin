import { ArrowRight, Camera, Users, type LucideIcon } from "lucide-react";
import { useAppLauncher } from "../../hooks/useAppLauncher";
import type { AppLinkKey } from "../../types";

const APPS: { key: AppLinkKey; title: string; description: string; icon: LucideIcon; style: string }[] = [
  {
    key: "digitalEye",
    title: "Digital Eye",
    description: "Branch Surveillance & Operations",
    icon: Camera,
    style: "border-[#3f6289] bg-gradient-to-r from-[#17324f] to-[#10253b] hover:from-[#1d3c5e] hover:to-[#142d47]",
  },
  {
    key: "customer360",
    title: "Customer 360 (C360)",
    description: "Customer View & Relationship Management",
    icon: Users,
    style: "border-[#356f58] bg-gradient-to-r from-[#17463a] to-[#123229] hover:from-[#1c5445] hover:to-[#163c31]",
  },
];

export default function ApplicationLaunchButtons({ branchId }: { branchId: string }) {
  const launch = useAppLauncher();

  return (
    <div className="mt-3 flex gap-3.5 max-sm:flex-col">
      {APPS.map(({ key, title, description, icon: Icon, style }) => (
        <button
          key={key}
          type="button"
          onClick={() => launch(key, branchId)}
          className={`group flex min-w-0 flex-auto items-center gap-3 rounded-lg border px-3.5 py-2.5 2xl:gap-4 2xl:px-5 text-left transition-colors ${style}`}
        >
          <Icon className="size-7 shrink-0 2xl:size-8" strokeWidth={1.5} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[19px] leading-tight font-semibold">{title}</span>
            <span className="block text-[13.5px] leading-tight text-[#d6dde5]">{description}</span>
          </span>
          <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
