import { ArrowRight, ExternalLink, TrendingUp, Users } from "lucide-react";
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
      <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
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
      </div>

      <div className="mt-2 mb-1 flex items-center justify-between">
        <h3 className="text-[14.5px] font-semibold">Connected Applications ({branch.applications.length})</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1 text-[13px] text-brand transition-colors hover:text-brand-bright"
        >
          View All <ArrowRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <ul
        className="flex flex-[1_0_auto] flex-col overflow-hidden rounded-lg border border-line-soft"
        style={{ maxHeight: branch.applications.length * 34 }}
      >
        {branch.applications.map(({ appId, status }) => {
          const app = APPLICATIONS[appId];
          const Icon = APP_ICONS[appId];
          return (
            <li
              key={appId}
              className="grid min-h-[30px] flex-1 grid-cols-[1.5rem_minmax(0,1.5fr)_minmax(0,0.7fr)_minmax(0,1fr)_1.75rem] items-center gap-2 border-b border-line-soft bg-card/40 px-3 py-0.5 last:border-0"
            >
              <Icon className="size-[18px] text-brand" strokeWidth={1.5} aria-hidden="true" />
              <span className="truncate text-[13.5px]">{app.name}</span>
              <span className="text-[13px] text-soft">{app.version}</span>
              <StatusBadge status={status} />
              <button
                type="button"
                aria-label={`Open ${app.name}`}
                onClick={() => launch(appId, branch.id)}
                className="grid size-6 place-items-center rounded text-ink transition-colors hover:bg-brand/10 hover:text-brand"
              >
                <ExternalLink className="size-4" strokeWidth={1.6} />
              </button>
            </li>
          );
        })}
      </ul>

      <BranchProfile branch={branch} />
    </div>
  );
}
