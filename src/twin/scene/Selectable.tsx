import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { Box3, Vector3, type Group } from "three";
import type { BranchLayout } from "../layout/types";
import { stationStateLabel, stationTone } from "../sim/engine";
import { assetBounds, useBranchSim, useTwinView } from "../store";
import { focusAsset } from "./focus";

export const TONE_HEX = { green: "#2fb344", amber: "#fab219", red: "#e05252", grey: "#8a9bad" } as const;

/** Corner-bracket segments (3 short edges per box corner). */
function bracketPoints(box: Box3) {
  const pad = 0.15;
  const lo = new Vector3(box.min.x - pad, Math.max(0.03, box.min.y), box.min.z - pad);
  const hi = new Vector3(box.max.x + pad, box.max.y + 0.1, box.max.z + pad);
  const size = hi.clone().sub(lo);
  const arm = (axisLen: number) => Math.min(0.7, axisLen * 0.25);
  const pts: [number, number, number][] = [];
  for (const cx of [0, 1])
    for (const cy of [0, 1])
      for (const cz of [0, 1]) {
        const c = new Vector3(cx ? hi.x : lo.x, cy ? hi.y : lo.y, cz ? hi.z : lo.z);
        const sx = cx ? -1 : 1;
        const sy = cy ? -1 : 1;
        const sz = cz ? -1 : 1;
        pts.push(c.toArray(), [c.x + sx * arm(size.x), c.y, c.z]);
        pts.push(c.toArray(), [c.x, c.y + sy * arm(size.y), c.z]);
        pts.push(c.toArray(), [c.x, c.y, c.z + sz * arm(size.z)]);
      }
  return pts;
}

const SELECT_COLOR = "#46c4dc";



function StationChip({ id }: { id: string }) {
  useBranchSim((s) => s.version);
  const st = useBranchSim.getState().sim?.stations.find((s) => s.id === id);
  if (!st) return null;
  const tone = stationTone(st);
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-1.5 text-[11px]">
      <span className="size-1.5 rounded-full" style={{ background: TONE_HEX[tone] }} />
      {stationStateLabel(st)}
    </span>
  );
}

/**
 * Wraps one asset's geometry: measures it once, registers its bounds for camera framing, and adds an
 * invisible hit box, hover / selection brackets and a floating name tag.
 */
export function Selectable({ id, name, layout, children }: { id: string; name: string; layout: BranchLayout; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const overlay = useRef<Group>(null);
  const [box, setBox] = useState<Box3 | null>(null);
  const isSelected = useTwinView((s) => s.selected === id);
  const isHovered = useTwinView((s) => s.hovered === id);

  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.updateWorldMatrix(true, true);
    const b = new Box3().setFromObject(ref.current);
    if (b.isEmpty()) return;
    assetBounds.set(id, b);
    setBox(b);
    return () => {
      assetBounds.delete(id);
    };
  }, [id]);

  // Selection overlays live on their own layer, so the security-camera feeds don't film them.
  useLayoutEffect(() => {
    overlay.current?.traverse((o) => o.layers.set(1));
  }, [isSelected, isHovered, box]);

  const points = useMemo(() => (box ? bracketPoints(box) : null), [box]);
  const center = box?.getCenter(new Vector3());
  const size = box?.getSize(new Vector3());

  const handlers = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (useTwinView.getState().mode === "walk") return;
      useTwinView.getState().hover(id);
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      if (useTwinView.getState().hovered === id) useTwinView.getState().hover(null);
      document.body.style.cursor = "";
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      // Ignore the end of an orbit drag; while walking with the pointer locked, the crosshair selects.
      if (e.delta > 6 || document.pointerLockElement) return;
      const walking = useTwinView.getState().mode === "walk";
      const asset = layout.assets.find((a) => a.id === id);
      useTwinView.setState({ selected: id, zone: asset?.zone ?? null });
      if (!walking) focusAsset(id, layout);
    },
  };

  return (
    <>
      <group ref={ref}>{children}</group>
      {box && center && size && points && (
        <>
          <mesh position={center} scale={[size.x + 0.2, size.y + 0.2, size.z + 0.2]} visible={false} userData={{ selectId: id }} {...handlers}>
            <boxGeometry />
          </mesh>
          <group ref={overlay}>
            {(isSelected || isHovered) && (
              <Line
                points={points}
                segments
                color={isSelected ? SELECT_COLOR : "#ffffff"}
                lineWidth={isSelected ? 2.6 : 1.6}
                transparent
                opacity={isSelected ? 1 : 0.8}
                depthTest={false}
                renderOrder={10}
              />
            )}
            {isSelected && (
              <mesh position={[center.x, 0.02, center.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={9}>
                <planeGeometry args={[size.x + 0.6, size.z + 0.6]} />
                <meshBasicMaterial color={SELECT_COLOR} transparent opacity={0.18} depthWrite={false} />
              </mesh>
            )}
          </group>
          {(isSelected || isHovered) && (
            <Html position={[center.x, box.max.y + 0.5, center.z]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
              <div
                className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[12.5px] font-medium text-white shadow-lg ${isSelected ? "bg-ink" : "bg-ink/80"}`}
              >
                {name}
                <StationChip id={id} />
              </div>
            </Html>
          )}
        </>
      )}
    </>
  );
}
