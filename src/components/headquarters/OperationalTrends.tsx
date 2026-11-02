import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { OPERATIONAL_TRENDS } from "../../data/headquarters";
import type { TrendPoint } from "../../types";

type MetricKey = "transactions" | "digitalShare" | "incidents";

const METRICS: Record<MetricKey, { tab: string; title: string; format: (v: number) => string; tick: (v: number) => string; ticks: number[] }> = {
  transactions: { tab: "Transactions", title: "Monthly transactions, millions", format: (v) => `${v.toFixed(1)}M`, tick: (v) => `${v}M`, ticks: [30, 40, 50, 60] },
  digitalShare: { tab: "Digital", title: "Transactions through digital channels, percent", format: (v) => `${v}%`, tick: (v) => `${v}%`, ticks: [50, 60, 70, 80] },
  incidents: { tab: "Incidents", title: "Operational incidents per month", format: (v) => String(v), tick: (v) => String(v), ticks: [0, 10, 20, 30, 40, 50] },
};

const AXIS_TICK = { fill: "#3f5b73", fontSize: 13.5 };
const SEGMENT = "rounded-md px-3 py-1 text-[14.5px] transition-colors";

function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-lg border border-line bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
          className={`${SEGMENT} ${o.id === value ? "bg-brand font-medium text-white" : "text-soft hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, format }: {
  active?: boolean;
  payload?: { payload: TrendPoint; value: number }[];
  format: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-panel px-3 py-1.5 text-[14px] shadow-lg shadow-[#0b2a45]/15">
      <div className="text-mute">{payload[0].payload.month}</div>
      <div className="font-semibold">{format(payload[0].value)}</div>
    </div>
  );
}

export default function OperationalTrends({ headingClass }: { headingClass: string }) {
  const [metric, setMetric] = useState<MetricKey>("transactions");
  const [view, setView] = useState<"chart" | "table">("chart");
  const { title, format, tick, ticks } = METRICS[metric];
  const last = OPERATIONAL_TRENDS.length - 1;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={headingClass}>Operational trends</h2>
          <p className="mt-0.5 text-[15px] text-soft">{title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented
            label="Trend metric"
            value={metric}
            onChange={setMetric}
            options={(Object.keys(METRICS) as MetricKey[]).map((id) => ({ id, label: METRICS[id].tab }))}
          />
          <Segmented
            label="Trend view"
            value={view}
            onChange={setView}
            options={[{ id: "chart", label: "Chart" }, { id: "table", label: "Table" }]}
          />
        </div>
      </div>

      {view === "chart" ? (
        <div className="mt-4 h-[270px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={OPERATIONAL_TRENDS} margin={{ top: 22, right: 34, bottom: 0, left: -6 }}>
              <CartesianGrid vertical={false} stroke="#e1ebf3" />
              <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "#cfdfec" }} />
              <YAxis
                domain={[ticks[0], ticks[ticks.length - 1]]}
                ticks={ticks}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={tick}
                width={54}
              />
              <Tooltip
                content={<ChartTooltip format={format} />}
                cursor={{ stroke: "#8796a7", strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey={metric}
                stroke="#0074bf"
                strokeWidth={2}
                isAnimationActive={false}
                activeDot={{ r: 5, fill: "#0074bf", stroke: "#ffffff", strokeWidth: 2 }}
                dot={(props: { cx?: number; cy?: number; index?: number }) =>
                  props.index === last ? (
                    <circle key="end" cx={props.cx} cy={props.cy} r={4.5} fill="#0074bf" stroke="#ffffff" strokeWidth={2} />
                  ) : (
                    <g key={props.index} />
                  )
                }
                label={(props: { x?: number | string; y?: number | string; index?: number; value?: number | string | boolean | null }) =>
                  props.index === last ? (
                    <text key="end-label" x={Number(props.x)} y={Number(props.y) - 12} fill="#0b2a45" fontSize={14.5} fontWeight={600} textAnchor="middle">
                      {format(Number(props.value))}
                    </text>
                  ) : (
                    <g key={props.index} />
                  )
                }
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="thin-scroll mt-3 h-[270px] overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Transactions</th>
                <th scope="col">Digital</th>
                <th scope="col">Incidents</th>
              </tr>
            </thead>
            <tbody>
              {OPERATIONAL_TRENDS.map((p) => (
                <tr key={p.month}>
                  <td className="!text-ink">{p.month}</td>
                  <td className="tabular-nums">{METRICS.transactions.format(p.transactions)}</td>
                  <td className="tabular-nums">{METRICS.digitalShare.format(p.digitalShare)}</td>
                  <td className="tabular-nums">{p.incidents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
