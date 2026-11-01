const TABS = [
  { id: "overview", label: "Overview" },
  { id: "people", label: "People" },
  { id: "applications", label: "Applications" },
  { id: "agents", label: "Agents" },
  { id: "knowledge", label: "Knowledge" },
  { id: "activity", label: "Activity" },
] as const;

export type BranchTab = (typeof TABS)[number]["id"];

interface Props {
  active: BranchTab;
  onChange: (tab: BranchTab) => void;
}

export default function BranchTabs({ active, onChange }: Props) {
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    const index = TABS.findIndex((t) => t.id === active);
    const next = TABS[(index + step + TABS.length) % TABS.length];
    onChange(next.id);
    document.getElementById(`branch-tab-${next.id}`)?.focus();
  };

  return (
    <div role="tablist" aria-label="Branch details" onKeyDown={onKeyDown} className="mt-2.5 flex gap-3 overflow-x-auto border-b border-line [scrollbar-width:none] sm:gap-0">
      {TABS.map(({ id, label }) => {
        const selected = id === active;
        return (
          <button
            key={id}
            id={`branch-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="branch-tabpanel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            className={`flex-1 border-b-[3px] px-1 py-1.5 text-[16px] whitespace-nowrap transition-colors ${
              selected ? "border-gold font-medium text-ink" : "border-transparent text-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
