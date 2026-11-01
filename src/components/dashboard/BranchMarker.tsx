import { memo, useMemo } from "react";
import L from "leaflet";
import { Store } from "lucide-react";
import { Marker, Tooltip } from "react-leaflet";
import type { Branch } from "../../types";

interface Props {
  branch: Branch;
  selected: boolean;
  onSelect: (id: string) => void;
}

const HIT_SIZES = { primary: 26, secondary: 15 };
/** Keeps the callout clear of the neighbouring Hyderabad marker when Karachi is selected. */
const CALLOUT_GAP = 76;

function BranchMarker({ branch, selected, onSelect }: Props) {
  const icon = useMemo(() => {
    const size = selected ? HIT_SIZES.primary : HIT_SIZES[branch.tier];
    return L.divIcon({
      className: `branch-marker branch-marker--${branch.tier}${selected ? " branch-marker--selected" : ""}`,
      html: `<span class="branch-dot"></span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }, [branch.tier, selected]);

  const eventHandlers = useMemo(
    () => ({
      click: () => onSelect(branch.id),
      keypress: (e: L.LeafletKeyboardEvent) => {
        if (e.originalEvent.key === "Enter") onSelect(branch.id);
      },
    }),
    [branch.id, onSelect],
  );

  const calloutLeft = branch.lng > 69;

  return (
    <Marker
      position={[branch.lat, branch.lng]}
      icon={icon}
      title={branch.name}
      alt={branch.name}
      zIndexOffset={selected ? 1000 : branch.tier === "primary" ? 100 : 0}
      eventHandlers={eventHandlers}
    >
      {selected ? (
        <Tooltip
          key="callout"
          permanent
          opacity={1}
          interactive={false}
          direction={calloutLeft ? "left" : "right"}
          offset={calloutLeft ? [-CALLOUT_GAP, -34] : [CALLOUT_GAP, -34]}
          className="map-callout"
        >
          <div className="flex items-center gap-3.5 px-4 py-2.5">
            <Store className="size-8 text-gold" strokeWidth={1.5} aria-hidden="true" />
            <div>
              <div className="text-[18px] leading-tight font-semibold">{branch.name}</div>
              <div className="text-[15px] leading-tight text-soft">
                {branch.id}
                <span className="mx-2 text-mute">|</span>
                {branch.type}
              </div>
            </div>
          </div>
        </Tooltip>
      ) : (
        <Tooltip key="hover" direction="top" offset={[0, -8]} opacity={1} className="map-tip">
          {branch.name}
        </Tooltip>
      )}
    </Marker>
  );
}

export default memo(BranchMarker);
