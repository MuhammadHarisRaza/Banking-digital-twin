import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Maximize, Minus, Plus } from "lucide-react";
import { GeoJSON, ImageOverlay, MapContainer, Marker } from "react-leaflet";
import outline from "../../assets/geo/pakistan-outline.json";
import provinces from "../../assets/geo/pakistan-provinces.json";
import terrainBounds from "../../assets/geo/terrain-bounds.json";
import terrain from "../../assets/geo/pakistan-terrain.webp";
import { BRANCHES } from "../../data/branches";
import type { Branch } from "../../types";
import BranchDots from "./BranchDots";
import BranchMarker from "./BranchMarker";
import ConnectionArcs from "./ConnectionArcs";
import HeadquartersMarker from "./HeadquartersMarker";

const PRIMARY_BRANCHES = BRANCHES.filter((branch) => branch.tier === "primary");
const PAKISTAN_BOUNDS = L.latLngBounds([23.6, 60.85], [37.1, 77.85]);
const PAN_LIMITS = L.latLngBounds([5, 20], [55, 125]);
const TERRAIN_BOUNDS = L.latLngBounds(
  [terrainBounds.south, terrainBounds.west],
  [terrainBounds.north, terrainBounds.east],
);

const LABEL_ICON = L.divIcon({
  className: "country-label",
  html: "PAKISTAN",
  iconSize: [140, 24],
  iconAnchor: [70, 12],
});

const PROVINCE_STYLE: L.PathOptions = { color: "#9fb2c6", weight: 0.8, opacity: 0.5, fill: false };
const OUTLINE_STYLE: L.PathOptions = { color: "#c7d3df", weight: 1.3, opacity: 0.85, fill: false };

const CONTROL =
  "grid size-9 place-items-center text-soft transition-colors hover:bg-brand/10 hover:text-ink";

interface Props {
  selected: Branch | null;
  onSelect: (id: string) => void;
  /** Widths covered by the side cards or floating panel, kept clear when fitting the country. */
  leftInset: number;
  rightInset: number;
  leftHub: HTMLElement | null;
  rightHub: HTMLElement | null;
}

export default function PakistanMap({ selected, onSelect, leftInset, rightInset, leftHub, rightHub }: Props) {
  const [map, setMap] = useState<L.Map | null>(null);
  const insetRef = useRef({ left: leftInset, right: rightInset });
  insetRef.current = { left: leftInset, right: rightInset };

  const fitCountry = useCallback(
    (animate: boolean) => {
      if (!map) return;
      const { left, right } = insetRef.current;
      const options = {
        paddingTopLeft: [left + 18, 16] as L.PointTuple,
        paddingBottomRight: [right + 18, 64] as L.PointTuple,
      };
      map.setMinZoom(map.getBoundsZoom(PAKISTAN_BOUNDS, false, L.point(36 + left + right, 80)) - 0.6);
      map.fitBounds(PAKISTAN_BOUNDS, { ...options, animate });
    },
    [map],
  );

  useEffect(() => {
    if (!map) return;
    fitCountry(false);
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
      fitCountry(false);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map, fitCountry]);

  useEffect(() => {
    fitCountry(true);
  }, [leftInset, rightInset, fitCountry]);

  // Search can select a branch that sits outside the current zoomed view.
  useEffect(() => {
    if (!map || !selected) return;
    map.panInside([selected.lat, selected.lng], {
      paddingTopLeft: [insetRef.current.left + 50, 90],
      paddingBottomRight: [insetRef.current.right + 50, 50],
    });
  }, [map, selected]);

  return (
    <div className="absolute inset-0">
      <MapContainer
        ref={setMap}
        center={[30.3, 69.3]}
        zoom={5.4}
        maxZoom={11}
        zoomSnap={0}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={140}
        zoomControl={false}
        attributionControl={false}
        maxBounds={PAN_LIMITS}
        maxBoundsViscosity={0.8}
        className="size-full"
      >
        <ImageOverlay url={terrain} bounds={TERRAIN_BOUNDS} />
        <GeoJSON data={provinces as GeoJSON.FeatureCollection} style={PROVINCE_STYLE} interactive={false} />
        <GeoJSON data={outline as GeoJSON.Feature} style={OUTLINE_STYLE} interactive={false} />
        <Marker position={[28.3, 64.75]} icon={LABEL_ICON} interactive={false} keyboard={false} />
        <BranchDots onSelect={onSelect} />
        {PRIMARY_BRANCHES.map((branch) => (
          <BranchMarker key={branch.id} branch={branch} selected={branch.id === selected?.id} onSelect={onSelect} />
        ))}
        {selected?.tier === "secondary" && (
          <BranchMarker key={selected.id} branch={selected} selected onSelect={onSelect} />
        )}
        <HeadquartersMarker />
      </MapContainer>

      <ConnectionArcs map={map} leftHub={leftHub} rightHub={rightHub} visible={!selected} />

      <div
        style={{ left: leftInset ? leftInset + 14 : undefined }}
        className="absolute top-3 left-4 z-[520] flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel/90 transition-[left] duration-200 sm:left-6 xl:left-11"
      >
        <button type="button" aria-label="Zoom in" className={CONTROL} onClick={() => map?.zoomIn()}>
          <Plus className="size-4.5" />
        </button>
        <button type="button" aria-label="Zoom out" className={CONTROL} onClick={() => map?.zoomOut()}>
          <Minus className="size-4.5" />
        </button>
        <button type="button" aria-label="Fit Pakistan" className={CONTROL} onClick={() => fitCountry(true)}>
          <Maximize className="size-4" />
        </button>
      </div>
    </div>
  );
}
