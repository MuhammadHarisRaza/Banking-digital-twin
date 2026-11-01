import { Store, X } from "lucide-react";
import type { Branch } from "../../types";
import StatusBadge from "../common/StatusBadge";

interface Props {
  branch: Branch;
  onClose: () => void;
}

export default function BranchHeader({ branch, onClose }: Props) {
  const typeLabel = branch.type === "Regional Hub" ? branch.type : `${branch.type} Branch`;

  return (
    <div className="flex items-start gap-3 sm:gap-5">
      <Store className="mt-0.5 size-11 shrink-0 text-gold" strokeWidth={1.4} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 className="text-[22px] leading-tight font-bold tracking-tight sm:truncate sm:text-[25px]">{branch.name}</h2>
        <p className="text-[16px] leading-snug text-soft">
          {branch.id}
          <span className="mx-2.5 text-mute">|</span>
          {typeLabel}
          <span className="mx-2.5 text-mute">|</span>
          Since {branch.established}
        </p>
        <div className="mt-1.5 sm:hidden">
          <StatusBadge status={branch.status} variant="pill" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="max-sm:hidden">
          <StatusBadge status={branch.status} variant="pill" />
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close branch details"
          className="grid size-9 place-items-center rounded-full text-ink transition-colors hover:bg-white/8"
        >
          <X className="size-6" strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}
