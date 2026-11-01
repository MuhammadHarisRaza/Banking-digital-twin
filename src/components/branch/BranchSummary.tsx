import { Bot, Layers, Users, type LucideIcon } from "lucide-react";
import type { Branch } from "../../types";
import type { BranchTab } from "./BranchTabs";

interface Props {
  branch: Branch;
  onOpenTab: (tab: BranchTab) => void;
}

export default function BranchSummary({ branch, onOpenTab }: Props) {
  const stats: { label: string; value: number; icon: LucideIcon; tab: BranchTab }[] = [
    { label: "Staff", value: branch.staff, icon: Users, tab: "people" },
    { label: "Apps", value: branch.applications.length, icon: Layers, tab: "applications" },
    { label: "Agents", value: branch.agents.length, icon: Bot, tab: "agents" },
  ];

  return (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-5 max-sm:grid-cols-1">
      <img src={branch.image} alt={`${branch.name} exterior`} className="h-[82px] w-full rounded-lg object-cover object-center" />
      <div className="grid grid-cols-3 divide-x divide-line rounded-lg border border-line-soft bg-card/60">
        {stats.map(({ label, value, icon: Icon, tab }) => (
          <button
            key={label}
            type="button"
            onClick={() => onOpenTab(tab)}
            aria-label={`${value} ${label}, open ${tab} tab`}
            className="flex items-center justify-center gap-3 py-2 transition-colors first:rounded-l-lg last:rounded-r-lg hover:bg-white/5"
          >
            <Icon className="size-8 text-soft" strokeWidth={1.4} aria-hidden="true" />
            <span className="text-left">
              <span className="block text-[15px] leading-tight text-soft">{label}</span>
              <span className="block text-[24px] leading-tight font-semibold">{value}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
