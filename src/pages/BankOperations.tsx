import { useEffect, useState } from "react";
import BranchDetailsPanel from "../components/branch/BranchDetailsPanel";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import HeadquartersCard from "../components/dashboard/HeadquartersCard";
import KPICards from "../components/dashboard/KPICards";
import PakistanMap from "../components/dashboard/PakistanMap";
import { BRANCHES } from "../data/branches";
import { BANK_TOTALS } from "../data/headquarters";
import { useBranchSelection } from "../hooks/useBranchSelection";
import { formatNumber } from "../lib/seeded";

const FLOATING_PANEL = "(min-width: 1100px)";

export default function BankOperations() {
  const { selected, select, close } = useBranchSelection();
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const [rightInset, setRightInset] = useState(0);

  useEffect(() => {
    if (!panel) {
      setRightInset(0);
      return;
    }
    const floating = window.matchMedia(FLOATING_PANEL);
    const measure = () => setRightInset(floating.matches ? panel.offsetWidth + 44 : 0);
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    floating.addEventListener("change", measure);
    measure();
    return () => {
      observer.disconnect();
      floating.removeEventListener("change", measure);
    };
  }, [panel]);

  return (
    <main className="flex flex-1 flex-col">
      <section className="grid gap-5 px-4 pt-6 sm:px-6 desk:grid-cols-[minmax(0,1fr)_minmax(360px,29%)] desk:gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(400px,34.6%)] desk:px-11">
        <div className="min-w-0">
          <DashboardHeader />
          <KPICards />
        </div>
        <HeadquartersCard />
      </section>

      <section className="flex flex-1 flex-col desk:relative desk:min-h-[590px]">
        <div className="map-stage relative h-[62vh] min-h-[440px] desk:absolute desk:inset-0 desk:h-auto">
          <PakistanMap selected={selected} onSelect={select} rightInset={rightInset} />
          <div className="absolute bottom-2 left-4 z-[500] max-w-[185px] text-[13px] leading-snug text-mute desk:left-11">
            <p className="mb-0.5 flex items-center gap-3 text-soft">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rotate-45 bg-gold" aria-hidden="true" />
                Headquarters
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#fff3da]" aria-hidden="true" />
                Branch
              </span>
            </p>
            <p>
              {BRANCHES.length} of {formatNumber(BANK_TOTALS.branches)} branches shown. Locations and figures are
              illustrative demo data.
            </p>
          </div>
        </div>

        {selected && (
          <BranchDetailsPanel
            ref={setPanel}
            branch={selected}
            onClose={close}
            className="relative z-[600] m-4 sm:m-6 desk:absolute desk:top-5 desk:right-11 desk:bottom-5 desk:m-0 desk:w-[49%] desk:max-w-[900px] desk:min-w-[600px]"
          />
        )}
      </section>
    </main>
  );
}
