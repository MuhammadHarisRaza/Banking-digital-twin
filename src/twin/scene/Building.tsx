import { useMemo } from "react";
import { MeshReflectorMaterial } from "@react-three/drei";
import type { BranchLayout, V3 } from "../layout/types";
import { CEILING_H, roomWalls, WALL_T, wallRun } from "../layout/walls";
import { useTwinView } from "../store";
import { Exterior } from "./Exterior";
import { metricPlane } from "./kit/geometry";
import { MAT } from "./materials";
import { usePbrSet } from "./pbr";
import { Box, Instances, type Instance } from "./primitives";

/** Room walls: glass offices on a wood upstand, solid partitions with skirting, the reinforced vault. */
function Walls({ layout, lowered }: { layout: BranchLayout; lowered: boolean }) {
  const { width: W, depth: D, height: H } = layout;
  const h = lowered ? 1.1 : H;
  const left = -W / 2;
  const right = W / 2;
  const back = -D / 2;
  const atm = layout.atmRoom;

  const { glass, solid, vault, skirting } = useMemo(() => {
    const glass: { p: V3; s: V3 }[] = [];
    const solid: { p: V3; s: V3 }[] = [];
    const vault: { p: V3; s: V3 }[] = [];
    for (const room of layout.rooms) {
      const runs = roomWalls(room, layout, lowered);
      (room.style === "glass" ? glass : room.style === "vault" ? vault : solid).push(...runs);
    }
    for (const part of layout.partitions) solid.push(...wallRun(part.axis, part.fixed, part.from, part.to, part.gaps, lowered ? 1.1 : 3.0, 0.15));
    const skirting: Instance[] = [...solid, ...vault].map((w) => ({
      p: [w.p[0], 0.05, w.p[2]],
      s: [w.s[0] + (w.s[0] > w.s[2] ? 0 : 0.024), 0.1, w.s[2] + (w.s[2] > w.s[0] ? 0 : 0.024)],
    }));
    return { glass, solid, vault, skirting };
  }, [layout, lowered]);

  return (
    <group>
      {/* Exterior walls: back, left and right (the front is the glass façade) */}
      <Box p={[0, h / 2, back - WALL_T / 2]} s={[W + WALL_T * 2, h, WALL_T]} m={MAT.wall} />
      <Box p={[left - WALL_T / 2, h / 2, 0]} s={[WALL_T, h, D]} m={MAT.wall} />
      <Box p={[right + WALL_T / 2, h / 2, 0]} s={[WALL_T, h, D]} m={MAT.wall} />
      {!lowered && (
        <>
          <Box p={[0, H + 0.35, back - WALL_T / 2]} s={[W + WALL_T * 2, 0.7, WALL_T]} m={MAT.wall} />
          <Box p={[left - WALL_T / 2, H + 0.35, 0]} s={[WALL_T, 0.7, D]} m={MAT.wall} />
          <Box p={[right + WALL_T / 2, H + 0.35, 0]} s={[WALL_T, 0.7, D]} m={MAT.wall} />
        </>
      )}

      {/* Self-service vestibule: solid wall behind the machines, glass to the lobby */}
      {atm && (
        <>
          <Box p={[(atm[0] + atm[2]) / 2, Math.min(h, CEILING_H) / 2, atm[1]]} s={[atm[2] - atm[0], Math.min(h, CEILING_H), 0.2]} m={MAT.wallInner} />
          <Box p={[atm[0], Math.min(h, CEILING_H) / 2, (atm[1] + atm[3]) / 2]} s={[0.04, Math.min(h, CEILING_H), atm[3] - atm[1]]} m={MAT.glass} cast={false} />
          <Box p={[atm[0], 0.06, (atm[1] + atm[3]) / 2]} s={[0.1, 0.12, atm[3] - atm[1]]} m={MAT.aluDark} cast={false} />
          <Box p={[atm[0], Math.min(h, CEILING_H) - 0.04, (atm[1] + atm[3]) / 2]} s={[0.1, 0.08, atm[3] - atm[1]]} m={MAT.aluDark} cast={false} />
        </>
      )}

      {glass.map((seg, i) => (
        <group key={`g${i}`}>
          <Box p={[seg.p[0], 0.45, seg.p[2]]} s={[seg.s[0], 0.9, seg.s[2]]} m={MAT.wood} />
          {!lowered && (
            <>
              <Box p={[seg.p[0], 0.9 + (seg.s[1] - 0.9) / 2, seg.p[2]]} s={[seg.s[0], seg.s[1] - 0.9, seg.s[2] * 0.5]} m={MAT.glass} cast={false} />
              <Box p={[seg.p[0], seg.s[1], seg.p[2]]} s={[seg.s[0], 0.06, seg.s[2] + 0.04]} m={MAT.aluDark} cast={false} />
              {/* Manifestation band at eye level */}
              <Box
                p={[seg.p[0], 1.5, seg.p[2]]}
                s={[seg.s[0] + (seg.s[0] > seg.s[2] ? 0 : 0.012), 0.12, seg.s[2] * 0.5 + (seg.s[2] > seg.s[0] ? 0 : 0.012)]}
                m={MAT.frosted}
                cast={false}
              />
            </>
          )}
        </group>
      ))}
      {solid.map((seg, i) => (
        <Box key={`s${i}`} p={seg.p} s={seg.s} m={MAT.wallInner} />
      ))}
      {vault.map((seg, i) => (
        <Box key={`v${i}`} p={seg.p} s={seg.s} m={MAT.vaultWall} />
      ))}
      <Instances items={skirting} m={MAT.plasticDark} cast={false} />
    </group>
  );
}

/** Floors by zone, and the suspended ceiling with its light fittings (shown in the walkthrough). */
/** Polished hall floor that mirrors the room softly (High quality): the terrazzo set with a blurred reflection. */
function ReflectiveFloor({ w, d, p }: { w: number; d: number; p: V3 }) {
  const set = usePbrSet("terrazzo_tiles");
  return (
    <mesh geometry={metricPlane(w, d)} position={p} receiveShadow>
      <MeshReflectorMaterial
        map={set?.color ?? MAT.floor.map}
        normalMap={set?.normal ?? null}
        normalScale={[0.35, 0.35]}
        roughnessMap={set?.rough ?? null}
        roughness={0.75}
        metalness={0}
        blur={[400, 120]}
        resolution={1024}
        mixBlur={1}
        mixStrength={0.3}
        mixContrast={1}
        mirror={0.25}
        depthScale={0.6}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.2}
      />
    </mesh>
  );
}

function Interior({ layout, reflect }: { layout: BranchLayout; reflect: boolean }) {
  const mode = useTwinView((s) => s.mode);
  const { width: W, depth: D } = layout;
  const left = -W / 2;
  const front = D / 2;
  const { rear, back } = layout.serviceBand;
  const backStrip = layout.counter.z - 2;
  const roomRect = (id: string) => layout.rooms.find((r) => r.id === id)?.rect;

  const { panels, downlights } = useMemo(() => {
    const offices = layout.rooms.filter((r) => r.style === "glass" || r.id === "prayer").map((r) => r.rect);
    const inside = (x: number, z: number) => offices.some(([x0, z0, x1, z1]) => x > x0 - 0.3 && x < x1 + 0.3 && z > z0 - 0.3 && z < z1 + 0.3);
    const panels: Instance[] = [];
    for (let x = left + 1.8; x < W / 2 - 0.8; x += 2.4)
      for (let z = backStrip + 1.2; z < front - 0.6; z += 2.4) if (!inside(x, z)) panels.push({ p: [x, CEILING_H - 0.011, z], s: [0.6, 0.02, 0.6] });
    for (let x = left + 1.8; x < W / 2 - 0.8; x += 2.4) panels.push({ p: [x, CEILING_H - 0.011, (back + backStrip) / 2], s: [1.2, 0.02, 0.3] });
    for (let x = left + 1.2; x < W / 2 - 0.6; x += 2.4) panels.push({ p: [x, CEILING_H - 0.011, (rear + back) / 2], s: [1.2, 0.02, 0.3] });
    const downlights: Instance[] = [];
    for (const [x0, z0, x1, z1] of offices)
      for (let x = x0 + 1; x < x1 - 0.5; x += 1.6) for (let z = z0 + 1; z < z1 - 0.5; z += 1.6) downlights.push({ p: [x, CEILING_H - 0.006, z], s: [0.16, 0.012, 0.16] });
    return { panels, downlights };
  }, [layout, left, W, front, back, rear, backStrip]);

  const overlay = (rect: [number, number, number, number] | undefined, m: typeof MAT.floor, y = 0.004) =>
    rect && <mesh geometry={metricPlane(rect[2] - rect[0], rect[3] - rect[1])} position={[(rect[0] + rect[2]) / 2, y, (rect[1] + rect[3]) / 2]} material={m} receiveShadow />;

  return (
    <group>
      {reflect ? (
        <ReflectiveFloor w={W} d={front - backStrip} p={[0, 0.003, (backStrip + front) / 2]} />
      ) : (
        <mesh geometry={metricPlane(W, front - backStrip)} position={[0, 0.003, (backStrip + front) / 2]} material={MAT.floor} receiveShadow />
      )}
      <mesh geometry={metricPlane(W, backStrip - rear)} position={[0, 0.003, (rear + backStrip) / 2]} material={MAT.backFloor} receiveShadow />
      {overlay(roomRect("manager"), MAT.officeFloor)}
      {overlay(roomRect("meeting"), MAT.officeFloor)}
      {overlay(roomRect("prayer"), MAT.carpet)}
      {overlay(roomRect("gents"), MAT.tiles)}
      {overlay(roomRect("ladies"), MAT.tiles)}
      {overlay(roomRect("staff"), MAT.officeFloor)}
      {/* Entrance matting */}
      <Box p={[layout.entrance.x, 0.008, front - 1]} s={[layout.entrance.width + 0.4, 0.012, 1.8]} m={MAT.rug} cast={false} />

      {mode === "walk" && (
        <group>
          <mesh geometry={metricPlane(W, D)} position={[0, CEILING_H, 0]} rotation={[Math.PI, 0, 0]} material={MAT.ceiling} />
          <Instances items={panels} m={MAT.ceilingPanel} cast={false} />
          <Instances items={downlights} m={MAT.downlight} cast={false} cyl />
          {/* Timber bulkhead over the counter line */}
          <Box
            p={[(layout.counter.x0 + layout.counter.x1) / 2, CEILING_H - 0.2, layout.counter.z - 0.3]}
            s={[layout.counter.x1 - layout.counter.x0 + 0.8, 0.4, 1.6]}
            m={MAT.wood}
            cast={false}
          />
        </group>
      )}
    </group>
  );
}

export function Building({ layout, reflect = false }: { layout: BranchLayout; reflect?: boolean }) {
  const walls = useTwinView((s) => s.layers.walls);
  return (
    <group name="building">
      <Exterior layout={layout} />
      <Interior layout={layout} reflect={reflect} />
      <Walls layout={layout} lowered={!walls} />
    </group>
  );
}
