import { ArrowUp, type LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: number;
  /** "kpi" puts the label under the value; "stat" puts it above. */
  layout?: "kpi" | "stat";
}

function Trend({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[13.5px] text-ok">
      <ArrowUp className="size-3.5" strokeWidth={2.2} aria-hidden="true" />+{value}%
    </span>
  );
}

export default function MetricCard({ icon: Icon, label, value, trend, layout = "kpi" }: Props) {
  if (layout === "stat") {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-line-soft bg-card px-3 py-1">
        <Icon className="size-5 shrink-0 text-brand" strokeWidth={1.5} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] leading-tight text-soft">{label}</div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[19px] leading-tight font-semibold">{value}</span>
            {trend !== undefined && <Trend value={trend} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-card/70 px-3 py-2.5 2xl:gap-3.5 2xl:px-4 transition-colors hover:bg-card-hover">
      <Icon className="size-8 shrink-0 text-brand 2xl:size-9" strokeWidth={1.5} aria-hidden="true" />
      <div className="min-w-0">
        <div className="text-[23px] leading-tight font-semibold">{value}</div>
        <div className="flex flex-wrap items-center gap-x-2 text-[15.5px] leading-tight whitespace-nowrap text-soft min-[1400px]:flex-nowrap">
          {label}
          {trend !== undefined && <Trend value={trend} />}
        </div>
      </div>
    </div>
  );
}
