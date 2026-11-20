import { useMemo } from "react";
import { useBankData } from "../../data/bankData";
import { listLabel } from "../../data/branchSource";
import { useBranches } from "../../data/branches";
import { useConfig } from "../../store/settingsStore";
import { formatNumber } from "../../lib/seeded";

export default function NetworkSnapshot({ headingClass }: { headingClass: string }) {
  const { all: BRANCHES, source } = useBranches();
  const { snapshot } = useBankData();
  const { organisation, brand } = useConfig();
  const { branches, islamicBranches, deposits, digitalCustomers } = snapshot;
  const { provinces, cities } = useMemo(() => {
    const totals = new Map<string, { branches: number; islamic: number }>();
    for (const branch of BRANCHES) {
      const row = totals.get(branch.province) ?? { branches: 0, islamic: 0 };
      row.branches += 1;
      if (branch.type === "Islamic") row.islamic += 1;
      totals.set(branch.province, row);
    }
    return {
      provinces: [...totals].map(([name, row]) => ({ name, ...row })).sort((a, b) => b.branches - a.branches),
      cities: new Set(BRANCHES.map((branch) => branch.city)).size,
    };
  }, [BRANCHES]);

  const stats = [
    ["Branches", formatNumber(branches)],
    ["Islamic branches", formatNumber(islamicBranches)],
    ["Cities", formatNumber(cities)],
    ...(deposits ? [["Deposits", deposits]] : []),
    ...(digitalCustomers ? [["Digital customers", digitalCustomers]] : []),
  ];
  const largest = provinces[0]?.branches ?? 1;

  return (
    <>
      <h2 className={headingClass}>Network snapshot</h2>
      <p className="mt-0.5 text-[15px] text-soft">
        Calculated from {listLabel(source, brand.shortName)}.
        {(deposits || digitalCustomers) && organisation.networkSource ? ` Deposits and digital customers: ${organisation.networkSource}.` : ""}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dd className="text-[24px] leading-tight font-semibold">{value}</dd>
            <dt className="text-[14.5px] leading-tight text-soft">{label}</dt>
          </div>
        ))}
      </dl>

      <p className="mt-5 text-[15px] text-soft">
        {formatNumber(BRANCHES.length)} branches by province, from {source === "published" ? `${brand.shortName}’s July 2024 branch list` : listLabel(source, brand.shortName)}
      </p>
      <table className="mt-1 w-full border-separate border-spacing-y-1.5 text-[15px]">
        <caption className="sr-only">Branches by province</caption>
        <thead>
          <tr className="text-left text-[13.5px] text-mute">
            <th scope="col" className="font-medium">Province</th>
            <th scope="col" className="w-[38%] font-medium">
              <span className="sr-only">Share of branches</span>
            </th>
            <th scope="col" className="text-right font-medium">Branches</th>
            <th scope="col" className="text-right font-medium">Islamic</th>
          </tr>
        </thead>
        <tbody>
          {provinces.map((p) => (
            <tr key={p.name}>
              <td className="pr-4 whitespace-nowrap">{p.name}</td>
              <td>
                <div className="h-1.5 rounded-r bg-line-soft">
                  <div className="h-full rounded-r bg-brand" style={{ width: `${(p.branches / largest) * 100}%` }} />
                </div>
              </td>
              <td className="pl-4 text-right font-semibold tabular-nums">{p.branches}</td>
              <td className="pl-4 text-right text-soft tabular-nums">{p.islamic}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
