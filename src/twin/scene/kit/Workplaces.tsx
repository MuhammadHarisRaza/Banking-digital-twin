import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { Asset, BranchLayout } from "../../layout/types";
import { MAT } from "../materials";
import { At, Box, Instances, RBox, type Instance } from "../primitives";
import { slab } from "./geometry";
import { Label } from "./labels";
import { Model } from "./models";
import { Bookshelf, DeskPhone, ExecutiveChair, FilingCabinet, Keyboard, Monitor, NoteCounter, Planter, Printer, Table, TaskChair, VisitorChair, WallScreen } from "./parts";
import { Beacon } from "./status";

/**
 * Customer-service / relationship-manager desk: timber top with modesty panel, frosted privacy
 * screens, the officer's workstation and two customer chairs. The officer sits at −z, customers at +z.
 */
export function ServiceDesk({ asset, first }: { asset: Asset; first: boolean }) {
  return (
    <At x={asset.x} z={asset.z} rot={asset.rot}>
      <mesh geometry={slab(1.6, 0.8, 0.035, 0.03, 0.006)} material={MAT.woodLight} position={[0, 0.745, 0]} castShadow receiveShadow />
      <Box p={[0, 0.42, 0.36]} s={[1.5, 0.6, 0.025]} m={MAT.wood} />
      {[-0.77, 0.77].map((x) => (
        <Box key={x} p={[x, 0.36, 0]} s={[0.035, 0.72, 0.76]} m={MAT.wood} />
      ))}
      <RBox p={[-0.45, 0.3, -0.1]} s={[0.4, 0.58, 0.52]} m={MAT.wood} radius={0.008} />
      {/* Frosted privacy screens */}
      {(first ? [-0.95, 0.95] : [0.95]).map((x) => (
        <group key={x}>
          <Box p={[x, 0.78, -0.25]} s={[0.025, 1.5, 1.9]} m={MAT.frosted} cast={false} />
          <Box p={[x, 1.54, -0.25]} s={[0.035, 0.03, 1.9]} m={MAT.aluDark} cast={false} />
          <Box p={[x, 0.78, 0.7]} s={[0.035, 1.56, 0.035]} m={MAT.aluDark} cast={false} />
        </group>
      ))}
      <Monitor p={[0.15, 0.765, 0.05]} rot={Math.PI} w={0.52} />
      <Keyboard p={[0.15, 0.765, -0.22]} rot={Math.PI} />
      <DeskPhone p={[0.62, 0.765, -0.12]} rot={Math.PI + 0.3} />
      <Box p={[-0.45, 0.775, 0.1]} s={[0.3, 0.012, 0.22]} m={MAT.paper} cast={false} />
      <Label text={asset.name} p={[0.25, 0.83, 0.38]} r={[-0.25, 0, 0]} w={0.6} h={0.09} bg="#1f2328" />
      <TaskChair p={[0.1, 0, -0.78]} />
      {[-0.33, 0.33].map((x) => (
        <VisitorChair key={x} p={[x, 0, 0.9]} rot={Math.PI} />
      ))}
      <Beacon stationId={asset.id} p={[-0.72, 0.765, 0.3]} />
    </At>
  );
}

/** Branch manager's office: executive desk, leather chair, visitors, credenza, bookshelf, small meeting table. */
export function ManagerOffice({ asset }: { asset: Asset }) {
  return (
    <At x={asset.x} z={asset.z} rot={asset.rot}>
      <mesh geometry={slab(1.9, 0.9, 0.045, 0.03, 0.008)} material={MAT.wood} position={[0, 0.75, 0]} castShadow receiveShadow />
      <Box p={[0, 0.4, 0.41]} s={[1.8, 0.66, 0.04]} m={MAT.wood} />
      <RBox p={[0.62, 0.36, -0.05]} s={[0.5, 0.7, 0.75]} m={MAT.wood} radius={0.01} />
      <Box p={[-0.88, 0.36, 0]} s={[0.04, 0.72, 0.85]} m={MAT.wood} />
      <Monitor p={[-0.25, 0.775, 0.1]} rot={Math.PI} />
      <Keyboard p={[-0.25, 0.775, -0.18]} rot={Math.PI} />
      <DeskPhone p={[0.55, 0.775, -0.15]} rot={Math.PI + 0.4} />
      <ExecutiveChair p={[-0.15, 0, -0.85]} />
      {[-0.45, 0.45].map((x) => (
        <VisitorChair key={x} p={[x, 0, 0.95]} rot={Math.PI} m={MAT.leather} />
      ))}
      {/* Credenza behind the desk, bookshelf and a round meeting table */}
      <RBox p={[0, 0.38, -2.25]} s={[1.9, 0.76, 0.45]} m={MAT.wood} radius={0.01} />
      <Box p={[0, 0.765, -2.25]} s={[1.9, 0.02, 0.45]} m={MAT.counterTop} cast={false} />
      <Bookshelf p={[-2.08, 0, -0.9]} rot={Math.PI / 2} w={1.0} />
      <Table p={[-1.0, 0, 2.35]} w={0.9} d={0.9} top={MAT.wood} />
      <VisitorChair p={[-1.0, 0, 3.0]} rot={Math.PI} m={MAT.leather} />
      <VisitorChair p={[-1.0, 0, 1.7]} m={MAT.leather} />
      <Planter p={[1.9, 0, -2.25]} />
      <Beacon stationId={asset.id} p={[0.85, 0.775, 0.3]} />
    </At>
  );
}

/** Meeting room: table for eight, wall display, credenza. */
export function MeetingRoom({ layout }: { layout: BranchLayout }) {
  const room = layout.rooms.find((r) => r.id === "meeting")!;
  const [x0, z0, x1, z1] = room.rect;
  const cx = (x0 + x1) / 2 - 0.3;
  const cz = (z0 + z1) / 2;
  const len = Math.min(3.2, x1 - x0 - 2.2);
  const per = Math.max(2, Math.floor(len / 0.75));
  return (
    <>
      <mesh geometry={slab(len, 1.15, 0.045, 0.2, 0.008)} material={MAT.wood} position={[cx, 0.75, cz]} castShadow receiveShadow />
      <Box p={[cx - len / 4, 0.36, cz]} s={[0.1, 0.72, 0.6]} m={MAT.aluDark} />
      <Box p={[cx + len / 4, 0.36, cz]} s={[0.1, 0.72, 0.6]} m={MAT.aluDark} />
      {Array.from({ length: per }, (_, i) => {
        const x = cx - len / 2 + (len / per) * (i + 0.5);
        return (
          <group key={i}>
            <TaskChair p={[x, 0, cz + 0.85]} rot={Math.PI} />
            <TaskChair p={[x, 0, cz - 0.85]} />
          </group>
        );
      })}
      <WallScreen p={[x1 - 0.06, 1.45, cz]} rot={-Math.PI / 2} w={1.6} />
      <RBox p={[x0 + 0.35, 0.38, cz]} s={[0.45, 0.76, 1.6]} m={MAT.wood} radius={0.01} />
      <Planter p={[x1 - 0.45, 0, z1 - 0.45]} big={false} />
    </>
  );
}

/** Client lounge (corporate branches): rug, sofas and a coffee table in the middle of the hall. */
export function Lounge({ asset }: { asset: Asset }) {
  return (
    <>
      <Box p={[asset.x, 0.006, asset.z]} s={[5.5, 0.012, 3.4]} m={MAT.carpet} cast={false} />
      <Model id="modern_coffee_table_01" p={[asset.x, 0.012, asset.z - 0.1]} rot={Math.PI / 2} />
    </>
  );
}

/** Cash processing and back office: workstations, note counters, safe, trolley, filing and printing. */
export function BackOffice({ layout }: { layout: BranchLayout }) {
  const back = layout.serviceBand.back;
  const desks = layout.staff.filter((s) => s.assetId === "back-office");
  const office = layout.partitions[0];
  const x0 = office ? office.from : 0;
  const x1 = office ? office.to : layout.width / 2;
  return (
    <>
      {desks.map((s, i) => (
        <group key={i} position={[s.x, 0, back + 1.5]}>
          <mesh geometry={slab(1.5, 0.75, 0.035, 0.02, 0.006)} material={MAT.woodLight} position={[0, 0.745, 0]} castShadow receiveShadow />
          <Box p={[0, 0.4, 0.34]} s={[1.42, 0.6, 0.025]} m={MAT.wood} />
          <RBox p={[0.48, 0.3, 0]} s={[0.4, 0.58, 0.6]} m={MAT.locker} radius={0.008} />
          <Box p={[-0.72, 0.36, 0]} s={[0.035, 0.72, 0.7]} m={MAT.wood} />
          <Monitor p={[-0.2, 0.765, 0.12]} rot={Math.PI} />
          <Keyboard p={[-0.2, 0.765, -0.12]} rot={Math.PI} />
          <NoteCounter p={[0.45, 0.765, 0.05]} rot={Math.PI} />
          <TaskChair p={[-0.1, 0, -0.62]} />
        </group>
      ))}
      {/* Strong safe, cash trolley, printer station and filing along the far wall */}
      <RBox p={[x1 - 0.55, 0.6, back + 0.45]} s={[0.8, 1.2, 0.7]} m={MAT.vault} radius={0.02} />
      <Box p={[x1 - 0.55, 0.65, back + 0.81]} s={[0.1, 0.1, 0.03]} m={MAT.chrome} cast={false} />
      <group position={[x0 + 2.8, 0, back + 3.1]}>
        <RBox p={[0, 0.5, 0]} s={[0.8, 0.06, 0.5]} m={MAT.steel} radius={0.01} />
        <RBox p={[0, 0.15, 0]} s={[0.8, 0.04, 0.5]} m={MAT.steel} radius={0.01} />
        <Box p={[0, 0.33, 0]} s={[0.76, 0.3, 0.46]} m={MAT.locker} cast={false} />
      </group>
      <Table p={[x1 - 0.5, 0, back + 2.6]} w={0.6} d={1.2} />
      <Printer p={[x1 - 0.5, 0.74, back + 2.4]} rot={-Math.PI / 2} large />
      {[0, 1, 2].map((i) => (
        <FilingCabinet key={i} p={[x1 - 0.35, 0, back + 3.55 - i * 0.5]} rot={-Math.PI / 2} />
      ))}
    </>
  );
}

/** Electrical and network room: comms racks with blinking lights, UPS, distribution board, cable tray. */
export function ServerRoom({ layout }: { layout: BranchLayout }) {
  const room = layout.rooms.find((r) => r.id === "server")!;
  const [x0, z0, x1, z1] = room.rect;
  const leds = useMemo<Instance[]>(() => {
    const out: Instance[] = [];
    for (let rack = 0; rack < 2; rack++)
      for (let i = 0; i < 12; i++) out.push({ p: [x0 + 0.75 + rack * 0.75 + ((i % 4) - 1.5) * 0.1, 0.5 + Math.floor(i / 4) * 0.5, z0 + 1.01], s: [0.03, 0.012, 0.004] });
    return out;
  }, [x0, z0]);
  const ledGroup = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ledGroup.current) ledGroup.current.visible = Math.sin(clock.elapsedTime * 7) > -0.6;
  });
  return (
    <>
      {[0, 1].map((rack) => (
        <group key={rack} position={[x0 + 0.75 + rack * 0.75, 0, z0 + 0.5]}>
          <RBox p={[0, 1.0, 0]} s={[0.6, 2.0, 1.0]} m={MAT.rack} radius={0.01} />
          <Box p={[0, 1.0, 0.505]} s={[0.54, 1.9, 0.01]} m={MAT.glassDark} cast={false} />
        </group>
      ))}
      <group ref={ledGroup} userData={{ dynamic: true }}>
        <Instances items={leds} m={MAT.ledGreen} cast={false} />
      </group>
      <RBox p={[x1 - 0.45, 0.65, z0 + 0.4]} s={[0.6, 1.3, 0.7]} m={MAT.ups} radius={0.02} />
      <RBox p={[x1 - 0.45, 0.4, z0 + 1.2]} s={[0.6, 0.8, 0.6]} m={MAT.ups} radius={0.02} />
      <Box p={[x1 - 0.08, 1.5, (z0 + z1) / 2 + 0.6]} s={[0.12, 0.9, 0.6]} m={MAT.locker} />
      <Box p={[(x0 + x1) / 2, 2.85, z0 + 0.3]} s={[x1 - x0 - 0.3, 0.06, 0.3]} m={MAT.alu} cast={false} />
    </>
  );
}

/** Prayer room: rugs facing the qibla wall and a shoe rack. */
export function PrayerRoom({ layout }: { layout: BranchLayout }) {
  const room = layout.rooms.find((r) => r.id === "prayer")!;
  const [x0, z0, x1, z1] = room.rect;
  const rugs = useMemo<Instance[]>(() => {
    const out: Instance[] = [];
    for (let i = 0; i < 4; i++) for (let row = 0; row < 2; row++) out.push({ p: [x0 + 1.0 + row * 1.6, 0.012, z0 + 0.8 + i * 0.95], s: [1.1, 0.012, 0.7] });
    return out.filter((r) => r.p[2] < z1 - 0.4);
  }, [x0, z0, z1]);
  return (
    <>
      <Instances items={rugs} m={MAT.prayerRug} cast={false} />
      <RBox p={[x1 - 0.3, 0.4, z1 - 0.8]} s={[0.4, 0.8, 1.2]} m={MAT.woodLight} radius={0.01} />
    </>
  );
}
