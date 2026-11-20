import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace } from "three";
import type { Asset, BranchLayout } from "../../layout/types";
import { useBranchSim } from "../../store";
import { MAT } from "../materials";
import { Box, Instances, type Instance } from "../primitives";
import { roundedBox } from "./geometry";
import { Planter } from "./parts";

const SEAT = roundedBox(1, 1, 1, 0.12);

/**
 * Waiting-hall beam seating: upholstered seats and backs on a steel beam with legs every few
 * seats and arms between them. Rows come from the layout's seat grid, split at the aisle.
 */
export function Seating({ layout, leather }: { layout: BranchLayout; leather: boolean }) {
  const parts = useMemo(() => {
    const pans: Instance[] = [];
    const backs: Instance[] = [];
    const steel: Instance[] = [];
    const rows = new Map<string, typeof layout.seats>();
    for (const s of layout.seats) {
      const key = `${s.z.toFixed(2)}:${s.rot.toFixed(2)}`;
      rows.set(key, [...(rows.get(key) ?? []), s]);
      const dz = Math.cos(s.rot);
      pans.push({ p: [s.x, 0.45, s.z], s: [0.5, 0.075, 0.47] });
      backs.push({ p: [s.x, 0.76, s.z - dz * 0.24], s: [0.5, 0.5, 0.07], r: [dz * -0.1, 0, 0] });
    }
    for (const row of rows.values()) {
      row.sort((a, b) => a.x - b.x);
      // Split each row where seats are not adjacent (the aisle).
      let run: typeof row = [];
      const flush = () => {
        if (!run.length) return;
        const x0 = run[0].x - 0.3;
        const x1 = run[run.length - 1].x + 0.3;
        const z = run[0].z;
        const dz = Math.cos(run[0].rot);
        steel.push({ p: [(x0 + x1) / 2, 0.36, z - dz * 0.05], s: [x1 - x0, 0.06, 0.08] });
        for (let i = 0; i <= run.length; i += 3) {
          const x = Math.min(x1 - 0.1, x0 + 0.1 + i * 0.62);
          steel.push({ p: [x, 0.18, z - dz * 0.05], s: [0.05, 0.36, 0.5] });
        }
        for (let i = 0; i <= run.length; i++) steel.push({ p: [x0 + i * 0.62, 0.62, z], s: [0.04, 0.03, 0.42] });
        run = [];
      };
      for (const s of row) {
        if (run.length && s.x - run[run.length - 1].x > 0.7) flush();
        run.push(s);
      }
      flush();
    }
    return { pans, backs, steel };
  }, [layout]);
  const m = leather ? MAT.leather : MAT.seat;
  return (
    <>
      <Instances items={parts.pans} m={m} geometry={SEAT} />
      <Instances items={parts.backs} m={m} geometry={SEAT} />
      <Instances items={parts.steel} m={MAT.aluDark} />
    </>
  );
}

/** Planters round the hall: by the door, at the end of the counter line, in the corners. */
export function HallPlants({ layout }: { layout: BranchLayout }) {
  const { width: W, depth: D } = layout;
  const spots: [number, number, boolean][] = [
    [-W / 2 + 0.55, D / 2 - 0.55, true],
    [layout.entrance.x + 2.0, D / 2 - 0.6, false],
    [layout.counter.x1 + 0.55, layout.counter.z + 0.9, true],
    [layout.counter.x0 - 0.5, layout.counter.z + 0.9, false],
  ];
  return (
    <>
      {spots.map(([x, z, big]) => (
        <Planter key={`${x}${z}`} p={[x, 0, z]} big={big} rot={x} />
      ))}
    </>
  );
}

/** Live "now serving" display hung above the teller screens, facing the hall. */
export function TokenBoard({ asset, brand, layout }: { asset: Asset; brand: string; layout: BranchLayout }) {
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 256;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    return { canvas, texture };
  }, []);
  const last = useRef("");
  useFrame(() => {
    const sim = useBranchSim.getState().sim;
    if (!sim) return;
    const key = sim.calls.map((c) => c.token + c.station).join("|") + brand;
    if (key === last.current) return;
    last.current = key;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0b1118";
    ctx.fillRect(0, 0, 768, 256);
    ctx.fillStyle = brand;
    ctx.fillRect(0, 0, 768, 58);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px Segoe UI, Arial, sans-serif";
    ctx.fillText("NOW SERVING", 24, 41);
    const rows = sim.calls.slice(0, 3);
    rows.forEach((c, i) => {
      const y = 112 + i * 62;
      ctx.fillStyle = i === 0 ? "#ffd84d" : "#9fb3c8";
      ctx.font = `bold ${i === 0 ? 48 : 40}px Consolas, monospace`;
      ctx.fillText(c.token, 24, y);
      ctx.font = `${i === 0 ? 40 : 34}px Segoe UI, Arial, sans-serif`;
      ctx.fillText(`→ ${c.station}`, 250, y);
    });
    if (!rows.length) {
      ctx.fillStyle = "#9fb3c8";
      ctx.font = "34px Segoe UI, Arial, sans-serif";
      ctx.fillText("Please take a token", 24, 140);
    }
    texture.needsUpdate = true;
  });
  useEffect(() => () => texture.dispose(), [texture]);
  const z = layout.counter.z + 0.45;
  return (
    <group position={[asset.x, 2.56, z]}>
      <Box p={[0, 0, -0.04]} s={[2.3, 0.8, 0.07]} m={MAT.plasticDark} cast={false} />
      <mesh>
        <planeGeometry args={[2.2, 0.73]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {[-0.9, 0.9].map((x) => (
        <Box key={x} p={[x, 0.5, -0.04]} s={[0.02, 0.6, 0.02]} m={MAT.aluDark} cast={false} />
      ))}
    </group>
  );
}
