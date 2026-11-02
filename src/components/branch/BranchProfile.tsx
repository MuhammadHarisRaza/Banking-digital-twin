import type { Branch } from "../../types";

const yesNo = (value: boolean) => (value ? "Available" : "Not available");

export default function BranchProfile({ branch }: { branch: Branch }) {
  const rows = [
    ["Region", branch.region],
    ["Cluster", branch.cluster],
    ["District", branch.district],
    ["Province", branch.province],
    ["Area", branch.area],
    ["Branch Code", branch.id.slice(3)],
    ["ATM", yesNo(branch.atm)],
    ["Lockers", yesNo(branch.lockers)],
    ["Saturday Banking", branch.saturdayBanking ? "Open" : "Not listed"],
  ];

  return (
    <section className="mt-2">
      <h3 className="mb-1 text-[14.5px] font-semibold">Branch Profile</h3>
      <dl className="grid grid-cols-3 gap-x-4 gap-y-1.5 rounded-lg border border-line-soft bg-card/40 px-3 py-2 max-sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[12px] leading-tight text-mute">{label}</dt>
            <dd title={value} className="truncate text-[13.5px] leading-snug text-ink">
              {value}
            </dd>
          </div>
        ))}
        <div className="col-span-full min-w-0">
          <dt className="text-[12px] leading-tight text-mute">Address</dt>
          <dd className="text-[13.5px] leading-snug text-ink">{branch.address}</dd>
        </div>
      </dl>
    </section>
  );
}
