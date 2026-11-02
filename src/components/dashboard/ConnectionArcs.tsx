import { useEffect, useState } from "react";
import L from "leaflet";
import { getCityBranch } from "../../data/branches";
import { CALL_CENTER_REACH, MOBILE_APP_REACH } from "../../data/channels";

interface Props {
  map: L.Map | null;
  leftHub: HTMLElement | null;
  rightHub: HTMLElement | null;
  visible: boolean;
}

interface ArcSet {
  id: string;
  hubX: number;
  centerX: number;
  paths: string[];
}

function buildArcs(map: L.Map, hub: HTMLElement, cities: string[], id: string): ArcSet {
  const box = map.getContainer().getBoundingClientRect();
  const rect = hub.getBoundingClientRect();
  const hx = rect.left + rect.width / 2 - box.left;
  const hy = rect.top + rect.height / 2 - box.top;

  const paths = cities.flatMap((city) => {
    const branch = getCityBranch(city);
    if (!branch) return [];
    const { x, y } = map.latLngToContainerPoint([branch.lat, branch.lng]);
    const dx = x - hx;
    return [`M${hx} ${hy}C${hx + dx * 0.42} ${hy} ${x - dx * 0.34} ${y} ${x} ${y}`];
  });

  return { id, hubX: hx, centerX: box.width / 2, paths };
}

/** Lines from the two channel cards to the branches they serve. They follow the map as it moves. */
export default function ConnectionArcs({ map, leftHub, rightHub, visible }: Props) {
  const [arcs, setArcs] = useState<ArcSet[]>([]);
  const [zooming, setZooming] = useState(false);

  useEffect(() => {
    if (!map || !leftHub || !rightHub || !visible) return;
    const update = () =>
      setArcs([
        buildArcs(map, leftHub, CALL_CENTER_REACH, "call-center-arc"),
        buildArcs(map, rightHub, MOBILE_APP_REACH, "mobile-app-arc"),
      ]);
    const onZoomStart = () => setZooming(true);
    const onZoomEnd = () => {
      setZooming(false);
      update();
    };

    update();
    map.on("move moveend resize", update);
    map.on("zoomstart", onZoomStart);
    map.on("zoomend", onZoomEnd);
    const observer = new ResizeObserver(update);
    observer.observe(map.getContainer());

    return () => {
      map.off("move moveend resize", update);
      map.off("zoomstart", onZoomStart);
      map.off("zoomend", onZoomEnd);
      observer.disconnect();
    };
  }, [map, leftHub, rightHub, visible]);

  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-[450] size-full transition-opacity duration-200 max-xl:hidden ${
        visible && !zooming ? "opacity-100" : "opacity-0"
      }`}
    >
      <defs>
        {arcs.map(({ id, hubX, centerX }) => (
          <linearGradient key={id} id={id} gradientUnits="userSpaceOnUse" x1={hubX} y1="0" x2={centerX} y2="0">
            <stop offset="0%" stopColor="#0074bf" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#0074bf" stopOpacity={0.28} />
          </linearGradient>
        ))}
      </defs>
      {arcs.map(({ id, paths }) => (
        <g key={id} fill="none" stroke={`url(#${id})`} strokeWidth={1.1}>
          {paths.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      ))}
    </svg>
  );
}
