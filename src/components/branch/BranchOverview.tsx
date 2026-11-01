import { ArrowRight, ExternalLink, Shield, TrendingUp, Users } from "lucide-react";
import { APPLICATIONS } from "../../data/applications";
import { useAppLauncher } from "../../hooks/useAppLauncher";
import { formatNumber } from "../../lib/seeded";
import type { Branch } from "../../types";
import { APP_ICONS } from "../common/appIcons";
import MetricCard from "../common/MetricCard";
import StatusBadge from "../common/StatusBadge";
import BranchProfile from "./BranchProfile";

interface Props {
  branch: Branch;
  onViewAll: () => void;
}

export default function BranchOverview({ branch, onViewAll }: Props) {
  const launch = useAppLauncher();

  return (
    <div className="flex min-h-full flex-col">
      <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
        <MetricCard
          layout="stat"
          icon={TrendingUp}
          label="Daily Transactions"
          value={formatNumber(branch.dailyTransactions)}
          trend={branch.transactionsTrend}
        />
        <MetricCard
          layout="stat"
          icon={Users}
          label="Active Customers"
          value={formatNumber(branch.activeCustomers)}
          trend={branch.customersTrend}
        />
        <MetricCard layout="stat" icon={Shield} label="Service SLA" value={`${branch.sla.toFixed(1)}%`} />
      </div>

      <div className="mt-2.5 mb-1 flex items-center justify-between">
        <h3 className="text-[17.5px] font-semibold">Connected Applications ({branch.applications.length})</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1 text-[15px] text-gold transition-colors hover:text-gold-bright"
        >
          View All <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <ul
        className="flex flex-[1_0_auto] flex-col overflow-hidden rounded-lg border border-line-soft"
        style={{ maxHeight: branch.applications.length * 46 }}
      >
        {branch.applications.map(({ appId, status }) => {
          const app = APPLICATIONS[appId];
          const Icon = APP_ICONS[appId];
          return (
            <li
              key={appId}
              className="grid min-h-[35px] flex-1 grid-cols-[2.25rem_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_2rem] items-center gap-2 border-b border-line-soft bg-card/40 px-5 py-[3px] last:border-0"
            >
              <Icon className="size-[22px] text-gold" strokeWidth={1.5} aria-hidden="true" />
              <span className="truncate text-[15.5px]">{app.name}</span>
              <span className="text-[15px] text-soft">{app.version}</span>
              <StatusBadge status={status} />
              <button
                type="button"
                aria-label={`Open ${app.name}`}
                onClick={() => launch(appId, branch.id)}
                className="grid size-7 place-items-center rounded text-ink transition-colors hover:bg-white/10 hover:text-gold"
              >
                <ExternalLink className="size-[18px]" strokeWidth={1.6} />
              </button>
            </li>
          );
        })}
      </ul>

      <BranchProfile branch={branch} />
    </div>
  );
}
