import { Bot, Layers, Store, Users, type LucideIcon } from "lucide-react";
import type { ModuleId } from "../../config/bankConfig";
import { useBankData } from "../../data/bankData";
import { formatNumber } from "../../lib/seeded";
import { useConfig } from "../../store/settingsStore";
import MetricCard from "../common/MetricCard";

export default function KPICards() {
  const { totals } = useBankData();
  const { modules } = useConfig();
  const cards: { id: ModuleId; icon: LucideIcon; value: string; trend?: number }[] = [
    { id: "kpiBranches", icon: Store, value: formatNumber(totals.branches), trend: totals.branchesTrend },
    { id: "kpiStaff", icon: Users, value: formatNumber(totals.staff) },
    { id: "kpiApplications", icon: Layers, value: String(totals.applications) },
    { id: "kpiAgents", icon: Bot, value: String(totals.agents) },
  ];
  const visible = cards.filter((c) => modules[c.id].visible);
  if (!visible.length) return null;

  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:gap-4">
      {visible.map((c) => (
        <MetricCard key={c.id} icon={c.icon} value={c.value} label={modules[c.id].label} trend={c.trend} />
      ))}
    </div>
  );
}
