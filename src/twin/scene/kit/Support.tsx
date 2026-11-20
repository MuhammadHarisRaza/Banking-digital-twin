import { useMemo } from "react";
import type { BranchLayout } from "../../layout/types";
import { MAT } from "../materials";
import { Box, Cyl, Instances, RBox, type Instance } from "../primitives";
import { lathe, slab } from "./geometry";
import { Label } from "./labels";
import { FilingCabinet, RoundTable, VisitorChair, WallScreen } from "./parts";

const rect = (layout: BranchLayout, id: string) => layout.rooms.find((r) => r.id === id)?.rect;

/** Staff room: kitchenette along the back wall (base and wall units, sink, fridge, microwave), table and chairs. */
export function StaffRoom({ layout }: { layout: BranchLayout }) {
  const r = rect(layout, "staff");
  if (!r) return null;
  const [x0, z0, x1] = r;
  const runW = Math.min(2.8, x1 - x0 - 1.2);
  const kx = x0 + 0.2 + runW / 2;
  const seats = layout.breakSeats;
  const table = seats.length ? [(seats[0].x + seats[1].x) / 2, seats[0].z] : [x1 - 1.5, z0 + 1.2];
  return (
    <>
      {/* Base units, worktop, sink and tap */}
      <RBox p={[kx, 0.44, z0 + 0.3]} s={[runW, 0.86, 0.58]} m={MAT.plastic} radius={0.006} />
      <Box p={[kx, 0.05, z0 + 0.32]} s={[runW, 0.1, 0.54]} m={MAT.plasticDark} cast={false} />
      <mesh geometry={slab(runW + 0.04, 0.62, 0.03, 0.01, 0.004)} material={MAT.counterTop} position={[kx, 0.9, z0 + 0.31]} castShadow receiveShadow />
      <Box p={[kx - runW / 4, 0.905, z0 + 0.3]} s={[0.5, 0.012, 0.38]} m={MAT.steel} cast={false} />
      <group position={[kx - runW / 4, 0.92, z0 + 0.1]}>
        <Cyl p={[0, 0.14, 0]} r={0.015} h={0.28} m={MAT.chrome} low cast={false} />
        <Box p={[0, 0.27, 0.07]} s={[0.025, 0.025, 0.15]} m={MAT.chrome} cast={false} />
      </group>
      {/* Wall cupboards, microwave and kettle */}
      <RBox p={[kx, 1.85, z0 + 0.18]} s={[runW, 0.7, 0.34]} m={MAT.plastic} radius={0.006} />
      <RBox p={[kx + runW / 4, 1.07, z0 + 0.28]} s={[0.48, 0.3, 0.36]} m={MAT.plasticDark} radius={0.01} />
      <mesh geometry={lathe([[0, 0], [0.08, 0], [0.085, 0.2], [0.05, 0.24], [0, 0.24]], 16)} material={MAT.steel} position={[kx + 0.1, 0.92, z0 + 0.35]} />
      {/* Fridge and water dispenser */}
      <RBox p={[x0 + runW + 0.6, 0.9, z0 + 0.36]} s={[0.66, 1.8, 0.66]} m={MAT.steel} radius={0.02} />
      <Box p={[x0 + runW + 0.38, 1.1, z0 + 0.7]} s={[0.02, 0.5, 0.02]} m={MAT.chrome} cast={false} />
      <RBox p={[x1 - 0.3, 0.55, z0 + 0.3]} s={[0.32, 1.1, 0.32]} m={MAT.plastic} radius={0.02} />
      <mesh geometry={lathe([[0, 0], [0.13, 0], [0.14, 0.38], [0.04, 0.46], [0, 0.46]], 16)} material={MAT.water} position={[x1 - 0.3, 1.1, z0 + 0.3]} />
      {/* Table and chairs where staff take their break */}
      <RoundTable p={[table[0], 0, table[1]]} r={0.5} />
      {seats.map((s, i) => (
        <VisitorChair key={i} p={[s.x, 0, s.z]} rot={s.rot} m={MAT.plastic} />
      ))}
      <WallScreen p={[x1 - 0.03, 1.6, table[1]]} rot={-Math.PI / 2} w={1.0} on={false} />
      <Label text="Staff Room" p={[r[0] + 1.2, 2.25, r[3] + 0.08]} w={0.7} h={0.16} bg="#ffffff" fg="#1f2328" />
    </>
  );
}

/** Gents' and ladies' washrooms: a WC cubicle and a vanity with basin and mirror in each. */
export function Washrooms({ layout }: { layout: BranchLayout }) {
  return (
    <>
      {(["gents", "ladies"] as const).map((id) => {
        const r = rect(layout, id);
        if (!r) return null;
        const [x0, z0, x1, z1] = r;
        const cx = (x0 + x1) / 2;
        return (
          <group key={id}>
            {/* WC cubicle in the back half */}
            <Box p={[cx, 1.0, z0 + 1.2]} s={[x1 - x0 - 0.15, 2.0, 0.04]} m={MAT.plastic} />
            <mesh geometry={lathe([[0, 0], [0.17, 0], [0.19, 0.38], [0.2, 0.42], [0, 0.42]], 20)} material={MAT.porcelain} position={[cx - 0.3, 0, z0 + 0.45]} scale={[1, 1, 1.3]} castShadow />
            <RBox p={[cx - 0.3, 0.75, z0 + 0.12]} s={[0.4, 0.4, 0.18]} m={MAT.porcelain} radius={0.03} />
            {/* Vanity, basin, mirror */}
            <RBox p={[x1 - 0.32, 0.8, z1 - 0.5]} s={[0.5, 0.06, 0.6]} m={MAT.counterTop} radius={0.01} />
            <mesh geometry={lathe([[0, 0], [0.18, 0.02], [0.2, 0.14], [0, 0.14]], 20)} material={MAT.porcelain} position={[x1 - 0.32, 0.83, z1 - 0.5]} />
            <Box p={[x1 - 0.03, 1.5, z1 - 0.5]} s={[0.02, 0.7, 0.5]} m={MAT.chrome} cast={false} />
            <Label text={id === "gents" ? "Gents" : "Ladies"} p={[(x0 + x1) / 2 + (id === "gents" ? 0.45 : -0.45), 2.1, z1 + 0.08]} w={0.5} h={0.16} bg="#ffffff" fg="#1f2328" />
          </group>
        );
      })}
    </>
  );
}

/** Records and document storage: shelving bays of archive boxes and filing cabinets. */
export function Records({ layout }: { layout: BranchLayout }) {
  const r = rect(layout, "records");
  const boxes = useMemo<Instance[]>(() => {
    if (!r) return [];
    const [x0, z0, x1] = r;
    const out: Instance[] = [];
    for (let x = x0 + 0.35; x < x1 - 0.35; x += 0.38) for (let level = 0; level < 5; level++) out.push({ p: [x, 0.28 + level * 0.42, z0 + 0.25], s: [0.32, 0.27, 0.38] });
    return out;
  }, [r]);
  if (!r) return null;
  const [x0, z0, x1, z1] = r;
  return (
    <>
      <Box p={[(x0 + x1) / 2, 1.1, z0 + 0.04]} s={[x1 - x0 - 0.2, 2.2, 0.04]} m={MAT.steelDark} cast={false} />
      {[0, 1, 2, 3, 4, 5].map((l) => (
        <Box key={l} p={[(x0 + x1) / 2, 0.12 + l * 0.42, z0 + 0.25]} s={[x1 - x0 - 0.2, 0.025, 0.46]} m={MAT.steelDark} cast={false} />
      ))}
      <Instances items={boxes} m={MAT.paper} cast={false} />
      <FilingCabinet p={[x1 - 0.35, 0, z1 - 0.45]} rot={Math.PI} />
      <Label text="Records" p={[x0 + 1.0, 2.25, z1 + 0.08]} w={0.6} h={0.16} bg="#ffffff" fg="#1f2328" />
    </>
  );
}
