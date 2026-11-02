import { useEffect, useState } from "react";
import { Headset, Smartphone } from "lucide-react";
import BranchDetailsPanel from "../components/branch/BranchDetailsPanel";
import ChannelCard from "../components/dashboard/ChannelCard";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import HeadquartersCard from "../components/dashboard/HeadquartersCard";
import KPICards from "../components/dashboard/KPICards";
import PakistanMap from "../components/dashboard/PakistanMap";
import { CALL_CENTER, MOBILE_APP } from "../data/channels";
import { useBranchSelection } from "../hooks/useBranchSelection";

const FLOATING_LAYOUT = "(min-width: 80rem)";
const PANEL_GAP = 44;

export default function BankOperations() {
  const { selected, select, close } = useBranchSelection();
  const [section, setSection] = useState<HTMLElement | null>(null);
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const [leftCard, setLeftCard] = useState<HTMLElement | null>(null);
  const [rightCard, setRightCard] = useState<HTMLElement | null>(null);
  const [leftHub, setLeftHub] = useState<HTMLSpanElement | null>(null);
  const [rightHub, setRightHub] = useState<HTMLSpanElement | null>(null);
  const [insets, setInsets] = useState({ left: 0, right: 0 });
  const [floating, setFloating] = useState(() => window.matchMedia(FLOATING_LAYOUT).matches);

  useEffect(() => {
    if (!section || !leftCard || !rightCard) return;
    const layout = window.matchMedia(FLOATING_LAYOUT);
    const measure = () => {
      setFloating(layout.matches);
      if (!layout.matches) {
        setInsets({ left: 0, right: 0 });
      } else if (panel) {
        setInsets({ left: 0, right: panel.offsetWidth + PANEL_GAP });
      } else {
        setInsets({
          left: leftCard.offsetLeft + leftCard.offsetWidth,
          right: section.offsetWidth - rightCard.offsetLeft,
        });
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    if (panel) observer.observe(panel);
    layout.addEventListener("change", measure);
    measure();
    return () => {
      observer.disconnect();
      layout.removeEventListener("change", measure);
    };
  }, [section, panel, leftCard, rightCard]);

  // Below the floating layout the panel sits under the map, so bring it into view.
  useEffect(() => {
    if (!floating) panel?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [panel, selected?.id, floating]);

  return (
    <main className="flex flex-1 flex-col">
      <section className="grid gap-5 px-4 pt-6 sm:px-6 desk:grid-cols-[minmax(0,1fr)_minmax(360px,29%)] desk:gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(400px,34.6%)] desk:px-11">
        <div className="min-w-0">
          <DashboardHeader />
          <KPICards />
        </div>
        <HeadquartersCard />
      </section>

      <section
        ref={setSection}
        className="flex flex-1 flex-col xl:relative xl:min-h-[380px]"
      >
        <div className="map-stage relative h-[62vh] min-h-[440px] xl:absolute xl:inset-0 xl:h-auto xl:min-h-0">
          <PakistanMap
            selected={selected}
            onSelect={select}
            leftInset={insets.left}
            rightInset={insets.right}
            leftHub={leftHub}
            rightHub={rightHub}
          />
        </div>

        {selected && (
          <BranchDetailsPanel
            ref={setPanel}
            branch={selected}
            onClose={close}
            className="relative z-[600] m-4 scroll-mt-4 sm:m-6 xl:absolute xl:top-3 xl:right-11 xl:bottom-7 xl:mx-0 xl:my-auto xl:max-h-[600px] xl:w-[41%] xl:max-w-[720px] xl:min-w-[560px]"
          />
        )}

        <div className="relative z-[510] grid gap-4 p-4 sm:p-6 md:grid-cols-2 xl:contents">
          <ChannelCard
            ref={setLeftCard}
            hubRef={setLeftHub}
            hubSide="right"
            channel={CALL_CENTER}
            icon={Headset}
            hidden={floating && Boolean(selected)}
            className="relative min-h-[380px] xl:absolute xl:top-3 xl:bottom-7 xl:left-11 xl:z-[500] xl:my-auto xl:max-h-[470px] xl:min-h-0 xl:w-[29%]"
          />
          <ChannelCard
            ref={setRightCard}
            hubRef={setRightHub}
            hubSide="left"
            channel={MOBILE_APP}
            icon={Smartphone}
            hidden={floating && Boolean(selected)}
            className="relative min-h-[380px] xl:absolute xl:top-3 xl:right-11 xl:bottom-7 xl:z-[500] xl:my-auto xl:max-h-[470px] xl:min-h-0 xl:w-[29%]"
          />
        </div>

        <div className="z-[500] flex flex-wrap items-center gap-x-4 gap-y-0.5 px-4 pb-3 text-[13px] leading-snug text-mute sm:px-6 xl:absolute xl:bottom-1.5 xl:left-11 xl:px-0 xl:pb-0">
          <span className="inline-flex items-center gap-1.5 text-soft">
            <span className="size-2 rotate-45 bg-brand" aria-hidden="true" />
            Headquarters
          </span>
          <span className="inline-flex items-center gap-1.5 text-soft">
            <span className="size-2 rounded-full bg-[#bfe3ff] ring-1 ring-brand" aria-hidden="true" />
            Branch
          </span>
        </div>

      </section>
    </main>
  );
}
