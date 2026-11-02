import { Store, X } from "lucide-react";
import type { Branch } from "../../types";
import StatusBadge from "../common/StatusBadge";

interface Props {
  branch: Branch;
  onClose: () => void;
}

export default function BranchHeader({ branch, onClose }: Props) {
  return (
    <div className="flex items-center gap-2.5">
      <Store className="size-8 shrink-0 text-brand" strokeWidth={1.4} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 className="text-[19px] leading-tight font-bold tracking-tight sm:truncate">{branch.name}</h2>
        <p className="text-[13px] leading-snug text-soft">
          {branch.id}
          <span className="mx-1.5 text-mute">|</span>
          {branch.type} Branch
          <span className="mx-1.5 text-mute">|</span>
          {branch.city}
        </p>
        <div className="mt-1.5 sm:hidden">
          <StatusBadge status={branch.status} variant="pill" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="max-sm:hidden">
          <StatusBadge status={branch.status} variant="pill" />
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close branch details"
          className="grid size-7 place-items-center rounded-full text-ink transition-colors hover:bg-brand/10"
        >
          <X className="size-5" strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}
