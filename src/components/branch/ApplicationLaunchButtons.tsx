import { ArrowRight, Camera, Users, type LucideIcon } from "lucide-react";
import { useAppLauncher } from "../../hooks/useAppLauncher";
import type { AppLinkKey } from "../../types";

const APPS: { key: AppLinkKey; title: string; description: string; icon: LucideIcon; style: string }[] = [
  {
    key: "digitalEye",
    title: "Digital Eye",
    description: "Branch Surveillance & Operations",
    icon: Camera,
    style: "border-[#005a96] bg-gradient-to-r from-[#0074bf] to-[#005a96] hover:from-[#0069ad] hover:to-[#004f85]",
  },
  {
    key: "customer360",
    title: "Customer 360 (C360)",
    description: "Customer View & Relationship Management",
    icon: Users,
    style: "border-[#0b6045] bg-gradient-to-r from-[#0f7a55] to-[#0b6045] hover:from-[#0d6f4d] hover:to-[#09543c]",
  },
];

export default function ApplicationLaunchButtons({ branchId }: { branchId: string }) {
  const launch = useAppLauncher();

  return (
    <div className="mt-2 flex gap-2 max-sm:flex-col">
      {APPS.map(({ key, title, description, icon: Icon, style }) => (
        <button
          key={key}
          type="button"
          onClick={() => launch(key, branchId)}
          className={`group flex min-w-0 flex-auto items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-white transition-colors ${style}`}
        >
          <Icon className="size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] leading-tight font-semibold">{title}</span>
            <span className="block text-[11.5px] leading-tight text-white/90">{description}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
