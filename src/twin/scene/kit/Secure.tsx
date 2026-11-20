import { useMemo, useRef } from "react";
import { useBranchEdge } from "../../../digitalEye/api";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import type { Asset, BranchLayout } from "../../layout/types";
import { CEILING_H } from "../../layout/walls";
import { useBranchSim } from "../../store";
import { MAT } from "../materials";
import { At, Box, Cyl, Instances, RBox, type Instance } from "../primitives";
import { Label } from "./labels";
import { TaskChair } from "./parts";

const BOLTS = Array.from({ length: 12 }, (_, i) => (i * Math.PI * 2) / 12);

/** Round vault door with locking bolts and a spoked wheel; it swings open while the vault is accessed. */
function VaultDoor({ x, z }: { x: number; z: number }) {
  const hinge = useRef<Group>(null);
  useFrame((_, dt) => {
    const open = useBranchSim.getState().sim?.vault.doorOpen ? 1 : 0;
    if (!hinge.current) return;
    const target = -open * 1.9;
    hinge.current.rotation.y += (target - hinge.current.rotation.y) * Math.min(1, dt * 2.2);
  });
  return (
    <group position={[x, 0, z]}>
      {/* Square steel frame round the opening */}
      <Box p={[0, 2.35, 0.05]} s={[1.9, 0.2, 0.5]} m={MAT.vault} />
      {[-0.9, 0.9].map((dx) => (
        <Box key={dx} p={[dx, 1.2, 0.05]} s={[0.12, 2.4, 0.5]} m={MAT.vault} />
      ))}
      <Box p={[0, 0.03, 0.05]} s={[1.8, 0.06, 0.5]} m={MAT.steelDark} cast={false} />
      {/* Hinge block and the door itself */}
      <Cyl p={[-0.84, 1.15, 0.32]} r={0.07} h={1.2} m={MAT.steel} />
      <group position={[-0.84, 0, 0.3]} ref={hinge} userData={{ dynamic: true }}>
        <group position={[0.84, 1.15, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={[0.82, 0.3, 0.82]} material={MAT.vault} castShadow>
            <cylinderGeometry args={[1, 1, 1, 48]} />
          </mesh>
          <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]} scale={[0.66, 0.03, 0.66]} material={MAT.steel}>
            <cylinderGeometry args={[1, 1, 1, 48]} />
          </mesh>
          {BOLTS.map((a) => (
            <mesh key={a} position={[Math.cos(a) * 0.74, Math.sin(a) * 0.74, 0.16]} rotation={[Math.PI / 2, 0, 0]} scale={[0.035, 0.05, 0.035]} material={MAT.chrome}>
              <cylinderGeometry args={[1, 1, 1, 12]} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]} scale={[0.09, 0.08, 0.09]} material={MAT.chrome}>
            <cylinderGeometry args={[1, 1, 1, 20]} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <Box key={i} p={[0, 0, 0.23]} s={[0.62, 0.035, 0.035]} r={[0, 0, (i * Math.PI) / 3]} m={MAT.chrome} />
          ))}
          <mesh position={[0, 0, 0.23]} scale={[0.31, 0.31, 0.03]} material={MAT.chrome}>
            <torusGeometry args={[1, 0.08, 8, 40]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** Strong room: steel shelving with cash boxes, a cash safe, and the vault door with access control. */
export function Vault({ layout }: { layout: BranchLayout }) {
  const room = layout.rooms.find((r) => r.id === "vault")!;
  const [x0, z0, x1, z1] = room.rect;
  const { shelves, boxes } = useMemo(() => {
    const shelves: Instance[] = [];
    const boxes: Instance[] = [];
    for (let level = 0; level < 4; level++) {
      shelves.push({ p: [(x0 + x1) / 2, 0.35 + level * 0.55, z0 + 0.45], s: [x1 - x0 - 0.8, 0.03, 0.6] });
      for (let i = 0; i < 6; i++) boxes.push({ p: [x0 + 0.75 + i * ((x1 - x0 - 1.5) / 5), 0.48 + level * 0.55, z0 + 0.45], s: [0.4, 0.22, 0.42] });
    }
    return { shelves, boxes };
  }, [x0, x1, z0]);
  const doorX = room.door.at;
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0.006, (z0 + z1) / 2]} material={MAT.vaultFloor} receiveShadow>
        <planeGeometry args={[x1 - x0, z1 - z0]} />
      </mesh>
      <Instances items={shelves} m={MAT.steelDark} />
      <Instances items={boxes} m={MAT.locker} />
      <RBox p={[x1 - 0.6, 0.65, (z0 + z1) / 2 + 0.3]} s={[0.8, 1.3, 0.7]} m={MAT.vault} radius={0.02} />
      <VaultDoor x={doorX} z={z1} />
      {/* Access-control keypad and the restricted-area sign on the hall side */}
      <group position={[doorX + 1.25, 1.35, z1 + 0.22]}>
        <RBox p={[0, 0, 0]} s={[0.14, 0.2, 0.04]} m={MAT.plasticDark} radius={0.01} />
        <Box p={[0, 0.05, 0.021]} s={[0.1, 0.05, 0.002]} m={MAT.screen} cast={false} />
        <Box p={[0, -0.06, 0.021]} s={[0.04, 0.012, 0.002]} m={MAT.ledGreen} cast={false} />
      </group>
      <Label text="RESTRICTED AREA" sub="Authorised staff only · dual control" p={[doorX, 2.7, z1 + 0.31]} w={1.3} h={0.32} bg="#f5c518" fg="#111111" />
    </>
  );
}

/** Safe-deposit locker room: banks of steel lockers and a private viewing table. */
export function Lockers({ layout }: { layout: BranchLayout }) {
  const room = layout.rooms.find((r) => r.id === "lockers")!;
  const [x0, z0, x1] = room.rect;
  const { doors, locks } = useMemo(() => {
    const doors: Instance[] = [];
    const locks: Instance[] = [];
    const cols = Math.floor((x1 - x0 - 0.4) / 0.42);
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < 6; r++) {
        const x = x0 + 0.4 + c * 0.42;
        const y = 0.3 + r * 0.38;
        doors.push({ p: [x, y, z0 + 0.26], s: [0.4, 0.36, 0.02] });
        locks.push({ p: [x + 0.12, y, z0 + 0.275], s: [0.03, 0.03, 0.012] });
      }
    return { doors, locks };
  }, [x0, x1, z0]);
  return (
    <>
      <Box p={[(x0 + x1) / 2, 1.2, z0 + 0.12]} s={[x1 - x0 - 0.2, 2.4, 0.26]} m={MAT.steelDark} />
      <Instances items={doors} m={MAT.locker} cast={false} />
      <Instances items={locks} m={MAT.chrome} cast={false} />
      <RBox p={[(x0 + x1) / 2, 0.75, z0 + 1.9]} s={[1.2, 0.04, 0.6]} m={MAT.woodLight} radius={0.008} />
      <Box p={[(x0 + x1) / 2, 0.37, z0 + 1.9]} s={[0.08, 0.72, 0.08]} m={MAT.aluDark} />
      <TaskChair p={[(x0 + x1) / 2, 0, z0 + 2.5]} rot={Math.PI} />
    </>
  );
}

/** A pulsing red ring under a camera that Digital Eye reports as tampered (outside the static batch). */
function TamperRing() {
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.scale.setScalar(1 + 0.25 * Math.sin(clock.elapsedTime * 5));
  });
  return (
    <group userData={{ dynamic: true }}>
      <mesh ref={ring} position={[0, -0.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.014, 8, 32]} />
        <meshBasicMaterial color="#ff3b3b" toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.05, 0.02]} scale={[0.08, 0.08, 0.08]}>
        <sphereGeometry args={[1, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshBasicMaterial color="#ff3b3b" transparent opacity={0.55} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Ceiling-mounted dome camera, tilted at what it watches. It turns red while Digital Eye reports tampering. */
export function Cctv({ asset }: { asset: Asset }) {
  const branchId = useBranchSim((s) => s.sim?.branchId ?? "");
  const tampered = useBranchEdge(branchId).cameras.get(asset.id)?.tamper?.active;
  return (
    <At x={asset.x} z={asset.z} rot={asset.rot} y={CEILING_H - 0.02}>
      {tampered && <TamperRing />}
      <Cyl p={[0, -0.02, 0]} r={0.09} h={0.04} m={MAT.plastic} cast={false} />
      <mesh position={[0, -0.05, 0.02]} scale={[0.075, 0.075, 0.075]} material={MAT.glassDark}>
        <sphereGeometry args={[1, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, -0.07, 0.04]} rotation={[0.6, 0, 0]} scale={[0.025, 0.04, 0.025]} material={MAT.plasticDark}>
        <cylinderGeometry args={[1, 1, 1, 12]} />
      </mesh>
    </At>
  );
}
