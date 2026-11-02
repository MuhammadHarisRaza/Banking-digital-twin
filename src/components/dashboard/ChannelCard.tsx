import { useCallback, useState, type Ref } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, type LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppLauncher } from "../../hooks/useAppLauncher";
import { useDismiss } from "../../hooks/useDismiss";
import type { ChannelMetric, ChannelOverview, ChannelRange } from "../../types";

const AXIS_TICK = { fill: "#3f5b73", fontSize: 12 };
const GRID = "#e1ebf3";

function Metric({ value, label, trend, direction }: ChannelMetric) {
  const Arrow = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <div className="flex min-w-0 flex-col justify-center rounded-lg border border-line-soft bg-card/60 px-2.5 py-1.5 xl:min-h-[82px] 2xl:px-3">
      <div className="text-[21px] leading-tight font-semibold whitespace-nowrap 2xl:text-[23px]">{value}</div>
      <div className="flex flex-wrap items-center gap-x-2 text-[12.5px] leading-[1.2] text-soft 2xl:text-[13px]">
        {label}
        <span className="inline-flex items-center gap-0.5 text-[12.5px] whitespace-nowrap text-ok">
          <Arrow className="size-3" strokeWidth={2.2} aria-hidden="true" />
          {trend}
        </span>
      </div>
    </div>
  );
}

function RangeMenu({ title, ranges, value, onChange }: {
  title: string;
  ranges: ChannelRange[];
  value: ChannelRange;
  onChange: (range: ChannelRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const dismiss = useCallback(() => setOpen(false), []);
  const ref = useDismiss<HTMLDivElement>(open, dismiss);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${title} period, ${value.label}`}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 rounded px-1 text-[13.5px] text-soft transition-colors hover:text-brand-bright"
      >
        {value.label}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </button>
      {open && (
        <ul className="pop-enter absolute top-7 right-0 z-10 w-36 overflow-hidden rounded-lg border border-line bg-panel py-1 shadow-xl shadow-[#0b2a45]/15">
          {ranges.map((range) => (
            <li key={range.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(range);
                  setOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-[14.5px] transition-colors hover:bg-brand/10 ${
                  range.id === value.id ? "text-brand" : "text-soft"
                }`}
              >
                {range.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label, format }: {
  active?: boolean;
  payload?: readonly { value?: unknown }[];
  label?: string | number;
  format: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-panel px-3 py-1.5 text-[14px] shadow-lg shadow-[#0b2a45]/15">
      <div className="text-mute">{label}</div>
      <div className="font-semibold">{format(Number(payload[0].value))}</div>
    </div>
  );
}

function ChannelChart({ channel, range }: { channel: ChannelOverview; range: ChannelRange }) {
  const { formatTick, formatValue, appKey } = channel;
  const gradient = `${appKey}-fill`;
  const last = range.points.length - 1;
  const tooltip = <ChartTooltip format={formatValue} />;
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={GRID} />
      <XAxis
        dataKey="label"
        tick={AXIS_TICK}
        tickLine={false}
        axisLine={{ stroke: "#cfdfec" }}
        interval="preserveStartEnd"
        minTickGap={6}
        height={22}
        padding={channel.chartType === "area" ? { left: 14, right: 14 } : undefined}
      />
      <YAxis
        domain={[range.ticks[0], range.ticks[range.ticks.length - 1]]}
        ticks={range.ticks}
        tick={AXIS_TICK}
        tickLine={false}
        axisLine={false}
        tickFormatter={formatTick}
        width={38}
      />
    </>
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      {channel.chartType === "area" ? (
        <AreaChart data={range.points} margin={{ top: 8, right: 10, bottom: 0, left: -6 }}>
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0074bf" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#0074bf" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          {axes}
          <Tooltip content={tooltip} cursor={{ stroke: "#8796a7", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#0074bf"
            strokeWidth={2}
            fill={`url(#${gradient})`}
            isAnimationActive={false}
            activeDot={{ r: 5, fill: "#0074bf", stroke: "#ffffff", strokeWidth: 2 }}
            dot={(props: { cx?: number; cy?: number; index?: number }) =>
              props.index === last ? (
                <circle key="end" cx={props.cx} cy={props.cy} r={5} fill="#0074bf" stroke="#ffffff" strokeWidth={2} />
              ) : (
                <g key={props.index} />
              )
            }
          />
        </AreaChart>
      ) : (
        <BarChart data={range.points} margin={{ top: 8, right: 6, bottom: 0, left: -6 }} barCategoryGap="34%">
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a93d5" stopOpacity={1} />
              <stop offset="100%" stopColor="#0074bf" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          {axes}
          <Tooltip content={tooltip} cursor={{ fill: "rgb(255 255 255 / 0.05)" }} />
          <Bar dataKey="value" fill={`url(#${gradient})`} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

interface Props {
  channel: ChannelOverview;
  icon: LucideIcon;
  hubSide: "left" | "right";
  hubRef?: Ref<HTMLSpanElement>;
  hidden?: boolean;
  className?: string;
  ref?: Ref<HTMLElement>;
}

export default function ChannelCard({ channel, icon: Icon, hubSide, hubRef, hidden = false, className = "", ref }: Props) {
  const launch = useAppLauncher();
  const [range, setRange] = useState(channel.ranges[0]);

  return (
    <section
      ref={ref}
      aria-label={channel.title}
      inert={hidden}
      className={`flex min-h-0 flex-col rounded-xl border border-line bg-panel/90 p-3 shadow-xl shadow-[#0b2a45]/15 transition-opacity duration-200 2xl:p-3.5 ${
        hidden ? "pointer-events-none opacity-0" : ""
      } ${className}`}
    >
      <span
        ref={hubRef}
        aria-hidden="true"
        className={`channel-hub top-[44%] max-xl:hidden ${hubSide === "right" ? "-right-[10px]" : "-left-[10px]"}`}
      />

      <header className="flex items-center gap-2.5">
        <Icon className="size-8 shrink-0 text-brand 2xl:size-9" strokeWidth={1.3} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[clamp(16px,1.27vw,20px)] leading-tight font-bold tracking-tight">{channel.title}</h2>
          <p className="truncate text-[clamp(12.5px,0.95vw,14px)] leading-snug text-soft">{channel.subtitle}</p>
        </div>
        <button
          type="button"
          aria-label={`Open ${channel.title}`}
          onClick={() => launch(channel.appKey)}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-ink transition-colors hover:bg-brand/10 hover:text-brand"
        >
          <ExternalLink className="size-[18px]" strokeWidth={1.6} />
        </button>
      </header>

      <div
        className="mt-2.5 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${channel.metrics.length}, minmax(0, 1fr))` }}
      >
        {channel.metrics.map((metric) => (
          <Metric key={metric.label} {...metric} />
        ))}
      </div>

      <div className="mt-2 flex min-h-[150px] flex-1 flex-col rounded-lg border border-line-soft bg-card/40 px-2.5 pt-1.5 pb-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[14.5px] font-semibold">{channel.chartTitle}</h3>
          <RangeMenu title={channel.chartTitle} ranges={channel.ranges} value={range} onChange={setRange} />
        </div>
        <div className="mt-1 min-h-0 flex-1">
          <ChannelChart channel={channel} range={range} />
        </div>
        <div className="sr-only">
          <table>
            <caption>
              {channel.chartTitle}, {range.label}
            </caption>
            <tbody>
              {range.points.map((p) => (
                <tr key={p.label}>
                  <th scope="row">{p.label}</th>
                  <td>{channel.formatValue(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
