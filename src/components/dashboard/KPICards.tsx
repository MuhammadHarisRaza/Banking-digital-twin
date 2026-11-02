import { Bot, Layers, Store, Users } from "lucide-react";
import { BANK_TOTALS } from "../../data/headquarters";
import { formatNumber } from "../../lib/seeded";
import MetricCard from "../common/MetricCard";

export default function KPICards() {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:gap-4">
      <MetricCard icon={Store} value={formatNumber(BANK_TOTALS.branches)} label="Branches" trend={BANK_TOTALS.branchesTrend} />
      <MetricCard icon={Users} value={formatNumber(BANK_TOTALS.staff)} label="Staff" />
      <MetricCard icon={Layers} value={String(BANK_TOTALS.applications)} label="Applications" />
      <MetricCard icon={Bot} value={String(BANK_TOTALS.agents)} label="AI Agents" />
    </div>
  );
}
