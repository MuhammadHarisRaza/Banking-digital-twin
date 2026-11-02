import { useMemo } from "react";
import L from "leaflet";
import { Marker, Tooltip } from "react-leaflet";
import { useNavigate } from "react-router";
import { HEADQUARTERS } from "../../data/headquarters";

const LANDMARK_ICON = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 18v-7"/><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/></svg>`;

const BADGE_WIDTH = 62;
const BADGE_HEIGHT = 30;
/** The badge sits off the coast, so it never covers the dense Karachi branch markers. */
const BADGE_OFFSET = 20;

const ICON = L.divIcon({
  className: "hq-marker",
  html: `<span class="hq-badge">${LANDMARK_ICON}HQ</span><svg class="hq-leader" viewBox="0 0 20 20" aria-hidden="true"><line x1="0" y1="20" x2="20" y2="0" /></svg><span class="hq-point"></span>`,
  iconSize: [BADGE_WIDTH, BADGE_HEIGHT],
  iconAnchor: [BADGE_WIDTH + BADGE_OFFSET, -BADGE_OFFSET],
});

export default function HeadquartersMarker() {
  const navigate = useNavigate();

  const eventHandlers = useMemo(
    () => ({
      click: () => navigate("/headquarters"),
      keypress: (e: L.LeafletKeyboardEvent) => {
        if (e.originalEvent.key === "Enter") navigate("/headquarters");
      },
    }),
    [navigate],
  );

  return (
    <Marker
      position={[HEADQUARTERS.lat, HEADQUARTERS.lng]}
      icon={ICON}
      title="Open Headquarters Overview"
      alt="UBL Head Office, Karachi"
      zIndexOffset={900}
      eventHandlers={eventHandlers}
    >
      <Tooltip direction="bottom" offset={[-BADGE_WIDTH / 2, 18]} opacity={1} className="map-tip">
        {HEADQUARTERS.name}, {HEADQUARTERS.location}
      </Tooltip>
    </Marker>
  );
}
