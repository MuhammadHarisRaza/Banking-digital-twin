import type { Material } from "three";
import type { Asset } from "../../layout/types";
import { MAT } from "../materials";
import { At, Box, Cyl, RBox } from "../primitives";
import { slab } from "./geometry";
import { Label } from "./labels";
import { DeskPhone, Keyboard, Monitor, NoteCounter, Printer, TaskChair } from "./parts";
import { Beacon } from "./status";

/**
 * One teller module. The customer stands on the +z side at a 1.1 m transaction ledge behind a glass
 * security screen with a speak hole and a deal tray; the teller sits at a 0.76 m worktop behind it.
 * Granite front, quartz ledge, timber worktop, aluminium reveals between modules.
 */
export function TellerCounter({ asset, width, accent }: { asset: Asset; width: number; accent: string }) {
  const w = width;
  return (
    <At x={asset.x} z={asset.z}>
      {/* Recessed kick plate and the granite front panel */}
      <Box p={[0, 0.05, 0.33]} s={[w, 0.1, 0.06]} m={MAT.plasticDark} cast={false} />
      <Box p={[0, 0.6, 0.38]} s={[w, 1.0, 0.04]} m={MAT.stone} />
      <Box p={[-w / 2 + 0.01, 0.55, 0.05]} s={[0.02, 1.1, 0.7]} m={MAT.aluDark} />
      {/* Customer transaction ledge, quartz with a soft nosing */}
      <mesh geometry={slab(w, 0.42, 0.04, 0.02, 0.008)} material={MAT.counterTop} position={[0, 1.1, 0.33]} castShadow receiveShadow />
      {/* Teller worktop and its pedestal */}
      <mesh geometry={slab(w - 0.04, 0.62, 0.035, 0.02, 0.006)} material={MAT.woodLight} position={[0, 0.76, -0.12]} castShadow receiveShadow />
      <Box p={[w / 2 - 0.25, 0.37, -0.12]} s={[0.4, 0.72, 0.56]} m={MAT.wood} />
      <Box p={[0, 0.9, 0.18]} s={[w - 0.04, 0.3, 0.03]} m={MAT.wood} cast={false} />
      {/* Glass security screen with frame, speak hole and deal tray */}
      <Box p={[0, 1.66, 0.22]} s={[w - 0.06, 1.08, 0.018]} m={MAT.glass} cast={false} />
      <Box p={[0, 2.21, 0.22]} s={[w, 0.03, 0.05]} m={MAT.aluDark} cast={false} />
      {[-w / 2 + 0.02, w / 2 - 0.02].map((x) => (
        <Box key={x} p={[x, 1.66, 0.22]} s={[0.03, 1.12, 0.05]} m={MAT.aluDark} cast={false} />
      ))}
      <Cyl p={[0, 1.48, 0.222]} r={0.06} h={0.022} rot={[Math.PI / 2, 0, 0]} m={MAT.alu} cast={false} />
      <Box p={[0, 1.105, 0.27]} s={[0.36, 0.02, 0.2]} m={MAT.alu} cast={false} />
      {/* Counter number on the glass */}
      <Label text={String(asset.index)} sub="Counter" p={[-w / 2 + 0.24, 2.0, 0.232]} w={0.3} h={0.26} bg={accent} glow={0.25} />
      {/* Teller's equipment */}
      <Monitor p={[-0.15, 0.775, -0.25]} rot={Math.PI} />
      <Keyboard p={[-0.12, 0.775, 0.02]} rot={Math.PI} />
      <NoteCounter p={[0.55, 0.775, -0.05]} rot={Math.PI} />
      <Printer p={[-w / 2 + 0.38, 0.775, -0.28]} rot={Math.PI} />
      <TaskChair p={[-0.1, 0, -0.85]} />
      <Beacon stationId={asset.id} p={[w / 2 - 0.12, 2.24, 0.22]} />
    </At>
  );
}

/**
 * L-shaped reception and enquiries counter: raised transaction ledge with the bank's colour on the
 * front, a lower workstation behind, and a portrait welcome screen beside it.
 */
export function Reception({ asset, brand, bankName }: { asset: Asset; brand: Material; bankName: string }) {
  return (
    <At x={asset.x} z={asset.z} rot={asset.rot}>
      {/* Front run (faces +z) and the return */}
      <Box p={[0, 0.55, 0.32]} s={[2.2, 1.1, 0.06]} m={MAT.woodLight} />
      <Box p={[0, 0.62, 0.355]} s={[1.6, 0.08, 0.01]} m={brand} cast={false} />
      <mesh geometry={slab(2.3, 0.4, 0.04, 0.02, 0.008)} material={MAT.counterTop} position={[0, 1.1, 0.27]} castShadow receiveShadow />
      <Box p={[1.08, 0.55, -0.15]} s={[0.06, 1.1, 0.9]} m={MAT.woodLight} />
      <mesh geometry={slab(2.1, 0.7, 0.035, 0.02, 0.006)} material={MAT.counterTop} position={[-0.02, 0.76, -0.1]} castShadow receiveShadow />
      <Box p={[-0.85, 0.37, -0.1]} s={[0.4, 0.72, 0.6]} m={MAT.wood} />
      <Monitor p={[0.1, 0.78, -0.25]} rot={Math.PI} />
      <Keyboard p={[0.12, 0.78, 0.0]} rot={Math.PI} />
      <DeskPhone p={[0.65, 0.78, -0.15]} rot={Math.PI} />
      <TaskChair p={[0.1, 0, -0.8]} />
      {/* Customer information screen on a floor stand */}
      <group position={[-1.6, 0, 0.5]}>
        <RBox p={[0, 0.05, 0]} s={[0.5, 0.1, 0.4]} m={MAT.aluDark} radius={0.02} />
        <Box p={[0, 0.5, -0.05]} s={[0.08, 0.8, 0.06]} m={MAT.aluDark} />
        <RBox p={[0, 1.45, 0]} s={[0.62, 1.08, 0.06]} m={MAT.plasticDark} radius={0.012} />
        <Label text="Welcome" sub={bankName} p={[0, 1.55, 0.032]} w={0.56} h={0.4} bg="#0f1720" glow={0.9} />
        <Label text="Take a token · Accounts · Cards" p={[0, 1.18, 0.032]} w={0.56} h={0.12} bg="#0f1720" fg="#9fb3c8" glow={0.6} weight={500} />
      </group>
      <Label text="Reception & Enquiries" p={[0, 1.38, 0.33]} w={1.1} h={0.18} bg="#ffffff" fg="#1f2328" />
    </At>
  );
}

/** Security guard's lectern with log book. */
export function GuardPodium({ asset }: { asset: Asset }) {
  return (
    <At x={asset.x} z={asset.z}>
      <RBox p={[0, 0.55, 0]} s={[0.62, 1.1, 0.42]} m={MAT.woodLight} radius={0.02} />
      <mesh geometry={slab(0.7, 0.5, 0.03, 0.02, 0.005)} material={MAT.counterTop} position={[0, 1.12, 0]} rotation={[0.18, 0, 0]} castShadow />
      <Box p={[0.08, 1.15, 0.02]} s={[0.3, 0.02, 0.22]} r={[0.18, 0, 0]} m={MAT.book[1]} cast={false} />
    </At>
  );
}

/** Token (queue ticket) kiosk: branded pedestal, tilted touchscreen and ticket slot. */
export function TokenKiosk({ asset, brand }: { asset: Asset; brand: Material }) {
  return (
    <At x={asset.x} z={asset.z} rot={asset.rot}>
      <RBox p={[0, 0.04, 0]} s={[0.6, 0.08, 0.5]} m={MAT.aluDark} radius={0.02} />
      <RBox p={[0, 0.65, -0.02]} s={[0.5, 1.2, 0.36]} m={brand} radius={0.04} />
      <group position={[0, 1.32, 0.02]} rotation={[-0.4, 0, 0]}>
        <RBox p={[0, 0, 0]} s={[0.48, 0.36, 0.06]} m={MAT.plasticDark} radius={0.015} />
        <Box p={[0, 0, 0.031]} s={[0.42, 0.3, 0.002]} m={MAT.screen} cast={false} />
      </group>
      <Box p={[0, 0.92, 0.161]} s={[0.16, 0.02, 0.01]} m={MAT.plasticDark} cast={false} />
      <Box p={[0, 1.5, -0.13]} s={[0.04, 0.3, 0.04]} m={MAT.aluDark} cast={false} />
      <RBox p={[0, 1.68, -0.13]} s={[0.52, 0.16, 0.04]} m={brand} radius={0.01} />
      <Label text="Take a token" p={[0, 1.68, -0.108]} w={0.46} h={0.11} bg="#ffffff" fg="#1f2328" />
    </At>
  );
}
