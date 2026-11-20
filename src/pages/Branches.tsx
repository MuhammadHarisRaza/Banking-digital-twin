import { useMemo, useState } from "react";
import { Box, ChevronLeft, ChevronRight, MapPin, Search } from "lucide-react";
import { Link } from "react-router";
import StatusBadge from "../components/common/StatusBadge";
import { useBrand } from "../config/useBrand";
import { listLabel } from "../data/branchSource";
import { useBranches } from "../data/branches";
import { formatNumber } from "../lib/seeded";
import type { BranchType } from "../types";

const PAGE_SIZE = 25;
const TYPES: ("All" | BranchType)[] = ["All", "Retail", "Islamic", "Corporate"];
const SELECT = "h-10 rounded-lg border border-line bg-panel px-3 text-[15px] text-ink outline-none focus:border-brand";

export default function Branches() {
  const { all, source } = useBranches();
  const { shortName } = useBrand();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("All");
  const [province, setProvince] = useState("All");
  const [page, setPage] = useState(0);

  const provinces = useMemo(() => ["All", ...[...new Set(all.map((b) => b.province))].sort()], [all]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (b) =>
        (type === "All" || b.type === type) &&
        (province === "All" || b.province === province) &&
        (!q || `${b.name} ${b.city} ${b.district} ${b.id} ${b.address}`.toLowerCase().includes(q)),
    );
  }, [all, query, type, province]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const shown = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(0);
  };

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 desk:px-11">
      <h1 className="text-[34px] leading-tight font-bold tracking-tight">Branches</h1>
      <p className="mt-1 text-[17px] text-soft">
        {formatNumber(all.length)} branches in {listLabel(source, shortName)}. Open any branch on the
        map or as a 3D twin.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <span className="sr-only">Search branches</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-mute" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
            placeholder="Search by name, city, address or ID"
            className={`${SELECT} w-full pl-9`}
          />
        </label>
        <label className="flex items-center gap-2 text-[14.5px] text-soft">
          Type
          <select value={type} onChange={(e) => resetPage(setType)(e.target.value as (typeof TYPES)[number])} className={SELECT}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[14.5px] text-soft">
          Province
          <select value={province} onChange={(e) => resetPage(setProvince)(e.target.value)} className={SELECT}>
            {provinces.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Branch</th>
              <th scope="col">ID</th>
              <th scope="col">Type</th>
              <th scope="col">City</th>
              <th scope="col">Province</th>
              <th scope="col">Staff</th>
              <th scope="col">ATM</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((b) => (
              <tr key={b.id}>
                <td className="!text-ink">{b.name}</td>
                <td>{b.id}</td>
                <td>{b.type}</td>
                <td>{b.city}</td>
                <td>{b.province}</td>
                <td className="tabular-nums">{b.staff}</td>
                <td>{b.atm ? "Yes" : "No"}</td>
                <td>
                  <StatusBadge status={b.status} />
                </td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    <Link
                      to={`/?branch=${b.id}`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13.5px] text-brand transition-colors hover:bg-brand/10"
                    >
                      <MapPin className="size-4" aria-hidden="true" />
                      Map
                    </Link>
                    <Link
                      to={`/branches/${b.id}/twin`}
                      className="inline-flex items-center gap-1 rounded-md bg-brand px-2 py-1 text-[13.5px] text-white transition-colors hover:bg-brand-bright"
                    >
                      <Box className="size-4" aria-hidden="true" />
                      3D Twin
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center">
                  No branches match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-[14.5px] text-soft">
        <span>
          {rows.length ? `${current * PAGE_SIZE + 1}–${Math.min(rows.length, (current + 1) * PAGE_SIZE)} of ` : ""}
          {formatNumber(rows.length)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label="Previous page"
            className="grid size-9 place-items-center rounded-lg border border-line bg-panel enabled:hover:bg-brand/10 disabled:opacity-40"
          >
            <ChevronLeft className="size-4.5" />
          </button>
          <span>
            Page {current + 1} of {pages}
          </span>
          <button
            type="button"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
            aria-label="Next page"
            className="grid size-9 place-items-center rounded-lg border border-line bg-panel enabled:hover:bg-brand/10 disabled:opacity-40"
          >
            <ChevronRight className="size-4.5" />
          </button>
        </div>
      </div>
    </main>
  );
}
