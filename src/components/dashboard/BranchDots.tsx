import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { useNavigate } from "react-router";
import { useThemeColors } from "../../config/useBrand";
import { useBranches } from "../../data/branches";

const radiusFor = (zoom: number) => (zoom < 6 ? 2.1 : zoom < 8 ? 3 : 4.5);

/** Draws the full network on a canvas, which stays fast with well over a thousand branches. */
export default function BranchDots({ onSelect }: { onSelect: (id: string) => void }) {
  const map = useMap();
  const { secondary } = useBranches();
  const { mapDot } = useThemeColors();
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    const renderer = L.canvas({ padding: 0.3, tolerance: 4 });
    const dots = secondary.map((branch) =>
      L.circleMarker([branch.lat, branch.lng], {
        renderer,
        radius: radiusFor(map.getZoom()),
        stroke: false,
        fillColor: mapDot,
        fillOpacity: 0.92,
      })
        .bindTooltip(branch.name, { direction: "top", offset: [0, -4], opacity: 1, className: "map-tip" })
        .on("click", () => selectRef.current(branch.id))
        .on("dblclick", () => navigateRef.current(`/branches/${branch.id}/twin`)),
    );
    const group = L.layerGroup(dots).addTo(map);
    const resize = () => {
      const radius = radiusFor(map.getZoom());
      dots.forEach((dot) => dot.setRadius(radius));
    };
    map.on("zoomend", resize);

    return () => {
      map.off("zoomend", resize);
      group.remove();
      renderer.remove();
    };
  }, [map, secondary, mapDot]);

  return null;
}
