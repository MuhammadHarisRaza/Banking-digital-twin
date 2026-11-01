import { NETWORK_SNAPSHOT, PROVINCE_NETWORK } from "../../data/headquarters";
import { formatNumber } from "../../lib/seeded";

const { cities, islamicBranches, conventionalBranches, atms, customers, deposits } = NETWORK_SNAPSHOT;

const STATS = [
  ["Cities served", String(cities)],
  ["Conventional branches", formatNumber(conventionalBranches)],
  ["Islamic branches", String(islamicBranches)],
  ["ATMs", formatNumber(atms)],
  ["Customers", customers],
  ["Deposits", deposits],
];

export default function NetworkSnapshot({ headingClass }: { headingClass: string }) {
  const largest = PROVINCE_NETWORK[0].branches;

  return (
    <>
      <h2 className={headingClass}>Network snapshot</h2>
      <p className="mt-0.5 text-[15px] text-soft">Branch footprint across Pakistan</p>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {STATS.map(([label, value]) => (
          <div key={label}>
            <dd className="text-[24px] leading-tight font-semibold">{value}</dd>
            <dt className="text-[14.5px] leading-tight text-soft">{label}</dt>
          </div>
        ))}
      </dl>

      <table className="mt-4 w-full border-separate border-spacing-y-1.5 text-[15px]">
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
          {PROVINCE_NETWORK.map((p) => (
            <tr key={p.name}>
              <td className="pr-4 whitespace-nowrap">{p.name}</td>
              <td>
                <div className="h-1.5 rounded-r bg-line-soft">
                  <div className="h-full rounded-r bg-gold" style={{ width: `${(p.branches / largest) * 100}%` }} />
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
