import { Bot, Layers, Shield, Store, Users } from "lucide-react";
import { BANK_TOTALS } from "../../data/headquarters";
import { formatNumber } from "../../lib/seeded";
import MetricCard from "../common/MetricCard";

export default function KPICards() {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 desk:grid-cols-[1.14fr_1.02fr_1fr_0.95fr_1fr] desk:gap-4">
      <MetricCard icon={Store} value={formatNumber(BANK_TOTALS.branches)} label="Branches" trend={BANK_TOTALS.branchesTrend} />
      <MetricCard icon={Users} value={formatNumber(BANK_TOTALS.staff)} label="Staff" trend={BANK_TOTALS.staffTrend} />
      <MetricCard icon={Layers} value={String(BANK_TOTALS.applications)} label="Applications" />
      <MetricCard icon={Bot} value={String(BANK_TOTALS.agents)} label="AI Agents" />
      <MetricCard icon={Shield} value={`${BANK_TOTALS.sla}%`} label="Service SLA" />
    </div>
  );
}
