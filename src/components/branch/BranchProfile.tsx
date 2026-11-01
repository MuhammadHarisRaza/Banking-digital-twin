import { useMemo } from "react";
import { getEmployees } from "../../data/employees";
import { formatNumber } from "../../lib/seeded";
import type { Branch } from "../../types";

const formatPkr = (millions: number) =>
  millions >= 1000 ? `PKR ${(millions / 1000).toFixed(1)} Bn` : `PKR ${formatNumber(millions)} M`;

export default function BranchProfile({ branch }: { branch: Branch }) {
  const manager = useMemo(() => getEmployees(branch)[0].name, [branch]);

  const rows = [
    ["Branch Manager", manager],
    ["Region", branch.region],
    ["Province", branch.province],
    ["Deposits", formatPkr(branch.deposits)],
    ["Advances", formatPkr(branch.advances)],
    ["Accounts", formatNumber(branch.accounts)],
    ["ATMs", String(branch.atms)],
    ["Digital Adoption", `${branch.digitalAdoption}%`],
    ["Banking Hours", "Mon–Fri, 09:00–17:30"],
    ["Saturday Banking", branch.saturdayBanking ? "Available" : "Not available"],
    ["Lockers", branch.lockers ? "Available" : "Not available"],
  ];

  return (
    <section className="mt-3">
      <h3 className="mb-1 text-[17.5px] font-semibold">Branch Profile</h3>
      <dl className="grid grid-cols-3 gap-x-5 gap-y-2 rounded-lg border border-line-soft bg-card/40 px-5 py-3 max-sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[14px] leading-tight text-mute">{label}</dt>
            <dd className="truncate text-[15.5px] leading-snug text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
