import type { Material } from "three";
import type { V3 } from "../../layout/types";
import { MAT } from "../materials";
import { Box, Cyl, RBox } from "../primitives";
import { lathe, slab } from "./geometry";
import { Model, type ModelId } from "./models";

/**
 * Furniture and equipment parts shared by the kit, modelled at real sizes: seat 45–48 cm, desk 75 cm,
 * transaction counters 105–110 cm. Every part faces +z at rot = 0 (a chair's sitter looks along +z,
 * a monitor's screen faces +z).
 */

type Place = { p: V3; rot?: number };

const STAR = [0, 1, 2, 3, 4].map((i) => (i * Math.PI * 2) / 5);

/** Office task chair: five-star base on castors, gas lift, upholstered seat and mesh back with arms. */
export function TaskChair({ p, rot = 0, m = MAT.chair, high = false }: Place & { m?: Material; high?: boolean }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      {STAR.map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <Box p={[0, 0.07, 0.15]} s={[0.04, 0.03, 0.3]} m={MAT.plasticDark} cast={false} />
          <Cyl p={[0, 0.03, 0.29]} r={0.028} h={0.03} rot={[Math.PI / 2, 0, 0]} m={MAT.rubber} low cast={false} />
        </group>
      ))}
      <Cyl p={[0, 0.27, 0]} r={0.025} h={0.36} m={MAT.chrome} low />
      <RBox p={[0, 0.47, 0.02]} s={[0.48, 0.08, 0.46]} m={m} radius={0.03} />
      <group position={[0, 0.5, -0.22]} rotation={[-0.12, 0, 0]}>
        <RBox p={[0, high ? 0.42 : 0.33, 0]} s={[0.44, high ? 0.7 : 0.5, 0.05]} m={high ? m : MAT.mesh} radius={0.025} />
        <Box p={[0, 0.06, 0.01]} s={[0.06, 0.12, 0.03]} m={MAT.plasticDark} cast={false} />
      </group>
      {[-0.25, 0.25].map((x) => (
        <group key={x}>
          <Box p={[x, 0.57, 0.02]} s={[0.025, 0.14, 0.03]} m={MAT.plasticDark} cast={false} />
          <RBox p={[x, 0.65, 0.04]} s={[0.06, 0.03, 0.24]} m={MAT.plasticDark} radius={0.012} cast={false} />
        </group>
      ))}
    </group>
  );
}

/** Visitor chair on a chrome sled frame. */
export function VisitorChair({ p, rot = 0, m = MAT.seat }: Place & { m?: Material }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      {[-0.22, 0.22].map((x) => (
        <group key={x}>
          <Box p={[x, 0.012, 0.02]} s={[0.025, 0.025, 0.48]} m={MAT.chrome} cast={false} />
          <Box p={[x, 0.22, 0.24]} s={[0.025, 0.44, 0.025]} m={MAT.chrome} cast={false} />
          <Box p={[x, 0.45, -0.2]} s={[0.025, 0.9, 0.025]} m={MAT.chrome} cast={false} />
        </group>
      ))}
      <RBox p={[0, 0.46, 0.02]} s={[0.48, 0.07, 0.46]} m={m} radius={0.025} />
      <RBox p={[0, 0.74, -0.21]} s={[0.47, 0.4, 0.05]} m={m} radius={0.025} />
    </group>
  );
}

/** Executive chair: tall leather back and arms. */
export function ExecutiveChair(props: Place) {
  return <TaskChair {...props} m={MAT.leather} high />;
}

/** Flat-panel monitor on a stand; the screen glows. */
export function Monitor({ p, rot = 0, w = 0.56 }: Place & { w?: number }) {
  const h = w * 0.58;
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <RBox p={[0, 0.006, -0.03]} s={[0.22, 0.012, 0.16]} m={MAT.plasticDark} radius={0.005} cast={false} />
      <Box p={[0, 0.12 + 0.006, -0.06]} s={[0.04, 0.24, 0.02]} m={MAT.plasticDark} cast={false} />
      <RBox p={[0, 0.26 + h / 2 - 0.08, -0.04]} s={[w, h, 0.025]} m={MAT.plasticDark} radius={0.006} />
      <Box p={[0, 0.26 + h / 2 - 0.08, -0.026]} s={[w - 0.03, h - 0.03, 0.002]} m={MAT.screen} cast={false} />
    </group>
  );
}

export function Keyboard({ p, rot = 0 }: Place) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <RBox p={[0, 0.01, 0]} s={[0.43, 0.02, 0.14]} m={MAT.plasticDark} radius={0.006} cast={false} />
      <RBox p={[0.32, 0.012, 0.01]} s={[0.06, 0.024, 0.1]} m={MAT.plasticDark} radius={0.012} cast={false} />
    </group>
  );
}

export function DeskPhone({ p, rot = 0 }: Place) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <RBox p={[0, 0.03, 0]} s={[0.2, 0.06, 0.18]} m={MAT.plasticDark} radius={0.012} cast={false} />
      <RBox p={[-0.06, 0.07, 0]} s={[0.05, 0.035, 0.19]} m={MAT.plasticDark} radius={0.015} cast={false} />
    </group>
  );
}

/** Banknote counter: hopper on top, stacker in front. */
export function NoteCounter({ p, rot = 0 }: Place) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <RBox p={[0, 0.1, 0]} s={[0.28, 0.2, 0.26]} m={MAT.plastic} radius={0.02} />
      <Box p={[0, 0.21, -0.04]} s={[0.18, 0.04, 0.12]} m={MAT.plasticDark} cast={false} />
      <Box p={[0, 0.08, 0.135]} s={[0.17, 0.06, 0.02]} m={MAT.plasticDark} cast={false} />
      <Box p={[0.08, 0.16, 0.131]} s={[0.07, 0.03, 0.002]} m={MAT.screen} cast={false} />
    </group>
  );
}

export function Printer({ p, rot = 0, large = false }: Place & { large?: boolean }) {
  const s = large ? 1.6 : 1;
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <RBox p={[0, 0.13 * s, 0]} s={[0.45 * s, 0.26 * s, 0.4 * s]} m={MAT.plastic} radius={0.02} />
      <Box p={[0, 0.27 * s, -0.02]} s={[0.36 * s, 0.02, 0.28 * s]} m={MAT.plasticDark} cast={false} />
      <Box p={[0, 0.1 * s, 0.205 * s]} s={[0.3 * s, 0.02, 0.01]} m={MAT.plasticDark} cast={false} />
    </group>
  );
}

/** Four-drawer filing cabinet. */
export function FilingCabinet({ p, rot = 0, drawers = 4 }: Place & { drawers?: number }) {
  const h = drawers * 0.33;
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <RBox p={[0, h / 2, 0]} s={[0.47, h, 0.62]} m={MAT.locker} radius={0.008} />
      {Array.from({ length: drawers }, (_, i) => (
        <group key={i}>
          <Box p={[0, 0.33 * i + 0.3, 0.311]} s={[0.44, 0.004, 0.002]} m={MAT.aluDark} cast={false} />
          <Box p={[0, 0.33 * i + 0.24, 0.318]} s={[0.12, 0.018, 0.012]} m={MAT.chrome} cast={false} />
        </group>
      ))}
    </group>
  );
}

const BOOK_ROWS = [0.36, 0.76, 1.16, 1.56];

/** Open bookshelf with a few rows of books and binders. */
export function Bookshelf({ p, rot = 0, w = 0.9 }: Place & { w?: number }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 0.95, -0.17]} s={[w, 1.9, 0.02]} m={MAT.wood} cast={false} />
      {[-w / 2 + 0.01, w / 2 - 0.01].map((x) => (
        <Box key={x} p={[x, 0.95, 0]} s={[0.02, 1.9, 0.36]} m={MAT.wood} />
      ))}
      {[0.02, ...BOOK_ROWS.map((y) => y - 0.02), 1.89].map((y) => (
        <Box key={y} p={[0, y, 0]} s={[w - 0.02, 0.025, 0.34]} m={MAT.wood} cast={false} />
      ))}
      {BOOK_ROWS.slice(0, 3).flatMap((y, row) =>
        Array.from({ length: Math.floor((w - 0.2) / 0.06) }, (_, i) => {
          const hh = 0.22 + ((i * 7 + row * 3) % 5) * 0.025;
          return <Box key={`${row}-${i}`} p={[-w / 2 + 0.1 + i * 0.06, y + hh / 2, 0.02]} s={[0.045, hh, 0.24]} m={MAT.book[(i + row) % MAT.book.length]} cast={false} />;
        }),
      )}
    </group>
  );
}

/** Tall planter: a turned pot with a scanned plant (falls back to a simple crown while it loads). */
export function Planter({ p, big = true, rot = 0 }: Place & { big?: boolean }) {
  const r = big ? 0.26 : 0.18;
  const h = big ? 0.5 : 0.32;
  const id: ModelId = big ? "potted_plant_01" : "potted_plant_02";
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <mesh geometry={lathe([[0, 0], [r * 0.8, 0], [r, h * 0.9], [r * 1.04, h], [r * 0.94, h], [0, h * 0.94]], 28)} material={MAT.pot} castShadow receiveShadow />
      <Model id={id} p={[0, h * 0.62, 0]} scale={big ? 1.05 : 1} />
    </group>
  );
}

/** A table top with rounded corners on a chrome or timber frame. */
export function Table({ p, rot = 0, w, d, h = 0.74, top = MAT.woodLight, legs = MAT.aluDark }: Place & { w: number; d: number; h?: number; top?: Material; legs?: Material }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <mesh geometry={slab(w, d, 0.035, 0.03, 0.006)} material={top} position={[0, h - 0.018, 0]} castShadow receiveShadow />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => <Box key={`${sx}${sz}`} p={[sx * (w / 2 - 0.06), (h - 0.035) / 2, sz * (d / 2 - 0.06)]} s={[0.04, h - 0.035, 0.04]} m={legs} cast={false} />),
      )}
    </group>
  );
}

/** Round café table on a single pedestal. */
export function RoundTable({ p, r = 0.45, h = 0.74, top = MAT.woodLight }: Place & { r?: number; h?: number; top?: Material }) {
  return (
    <group position={p}>
      <Cyl p={[0, h - 0.015, 0]} r={r} h={0.03} m={top} />
      <Cyl p={[0, (h - 0.03) / 2, 0]} r={0.04} h={h - 0.03} m={MAT.aluDark} low />
      <Cyl p={[0, 0.01, 0]} r={0.26} h={0.02} m={MAT.aluDark} />
    </group>
  );
}

/** Wall-mounted flat screen. */
export function WallScreen({ p, rot = 0, w = 1.4, on = true }: Place & { w?: number; on?: boolean }) {
  const h = w * 0.5625;
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <RBox p={[0, 0, 0]} s={[w, h, 0.04]} m={MAT.plasticDark} radius={0.008} />
      <Box p={[0, 0, 0.021]} s={[w - 0.04, h - 0.04, 0.002]} m={on ? MAT.screen : MAT.screenOff} cast={false} />
    </group>
  );
}
