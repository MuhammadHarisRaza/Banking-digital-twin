import { useEffect, useState, type Ref } from "react";
import type { Branch } from "../../types";
import ApplicationLaunchButtons from "./ApplicationLaunchButtons";
import BranchActivity from "./BranchActivity";
import BranchAgents from "./BranchAgents";
import BranchApplications from "./BranchApplications";
import BranchHeader from "./BranchHeader";
import BranchKnowledge from "./BranchKnowledge";
import BranchOverview from "./BranchOverview";
import BranchPeople from "./BranchPeople";
import BranchSummary from "./BranchSummary";
import BranchTabs, { type BranchTab } from "./BranchTabs";

interface Props {
  branch: Branch;
  onClose: () => void;
  className?: string;
  ref?: Ref<HTMLElement>;
}

export default function BranchDetailsPanel({ branch, onClose, className = "", ref }: Props) {
  const [tab, setTab] = useState<BranchTab>("overview");
  const [content, setContent] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    content?.scrollTo({ top: 0 });
  }, [tab, branch.id, content]);

  return (
    <aside
      ref={ref}
      aria-label={`${branch.name} details`}
      className={`panel-enter flex flex-col overflow-hidden rounded-2xl border border-[#3a4f65] bg-panel/97 shadow-2xl shadow-black/40 ${className}`}
    >
      <div className="shrink-0 px-6 pt-4">
        <BranchHeader branch={branch} onClose={onClose} />
        <BranchSummary branch={branch} onOpenTab={setTab} />
        <ApplicationLaunchButtons branchId={branch.id} />
        <BranchTabs active={tab} onChange={setTab} />
      </div>
      <div
        ref={setContent}
        role="tabpanel"
        id="branch-tabpanel"
        tabIndex={0}
        className="thin-scroll min-h-[170px] flex-1 overflow-auto px-6 pt-3 pb-4 outline-none"
      >
        {tab === "overview" && <BranchOverview branch={branch} onViewAll={() => setTab("applications")} />}
        {tab === "people" && <BranchPeople branch={branch} />}
        {tab === "applications" && <BranchApplications branch={branch} />}
        {tab === "agents" && <BranchAgents branch={branch} />}
        {tab === "knowledge" && <BranchKnowledge branch={branch} />}
        {tab === "activity" && <BranchActivity branch={branch} />}
      </div>
    </aside>
  );
}
