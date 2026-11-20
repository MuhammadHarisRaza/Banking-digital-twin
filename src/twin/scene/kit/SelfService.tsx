import type { Material } from "three";
import type { Asset } from "../../layout/types";
import { MAT } from "../materials";
import { At, Box, RBox } from "../primitives";
import { Label } from "./labels";
import { Beacon, StatusScreen } from "./status";

type Brand = { brand: Material; brandDark: Material; brandGlow: Material };

/**
 * Lobby-style self-service machine against the vestibule wall: brand surround, cabinet, tilted user
 * fascia with a privacy-hooded keypad, card and receipt slots, a dispenser or deposit shutter, and
 * an illuminated topper. The back sits against the wall at z = −0.3.
 */
function Machine({
  asset,
  brand,
  title,
  body,
  kind,
}: {
  asset: Asset;
  brand: Brand;
  title: string;
  body: Material;
  kind: "atm" | "cdm";
}) {
  return (
    <At x={asset.x} z={asset.z} rot={asset.rot}>
      {/* Brand surround panel on the wall */}
      <RBox p={[0, 1.2, -0.27]} s={[1.0, 2.4, 0.05]} m={brand.brandDark} radius={0.02} />
      {/* Cabinet */}
      <RBox p={[0, 0.66, 0.02]} s={[0.84, 1.32, 0.6]} m={body} radius={0.02} />
      <Box p={[0, 0.05, 0.31]} s={[0.84, 0.1, 0.02]} m={MAT.plasticDark} cast={false} />
      {/* User fascia, tilted towards the customer */}
      <group position={[0, 1.42, 0.2]} rotation={[-0.32, 0, 0]}>
        <RBox p={[0, 0, 0]} s={[0.84, 0.62, 0.16]} m={MAT.plasticDark} radius={0.025} />
        <Box p={[0, 0.06, 0.081]} s={[0.46, 0.36, 0.004]} m={MAT.aluDark} cast={false} />
        {kind === "atm" ? (
          <StatusScreen stationId={asset.id} p={[0, 0.07, 0.084]} s={[0.4, 0.3, 0.004]} />
        ) : (
          <Box p={[0, 0.07, 0.084]} s={[0.4, 0.3, 0.004]} m={MAT.screen} cast={false} />
        )}
        {/* Card slot with its green lead-in light, receipt slot */}
        <Box p={[0.32, 0.08, 0.086]} s={[0.1, 0.012, 0.01]} m={MAT.ledGreen} cast={false} />
        <Box p={[0.32, -0.08, 0.086]} s={[0.11, 0.01, 0.01]} m={MAT.mesh} cast={false} />
      </group>
      {/* Keypad shelf with privacy hood */}
      <group position={[0, 1.08, 0.36]} rotation={[-0.18, 0, 0]}>
        <RBox p={[0, 0, 0]} s={[0.56, 0.04, 0.26]} m={MAT.aluDark} radius={0.01} />
        <RBox p={[0, 0.024, 0.02]} s={[0.2, 0.012, 0.16]} m={MAT.chrome} radius={0.004} cast={false} />
        <Box p={[0, 0.1, -0.08]} s={[0.3, 0.16, 0.02]} m={MAT.plasticDark} cast={false} />
        {[-0.15, 0.15].map((x) => (
          <Box key={x} p={[x, 0.08, -0.01]} s={[0.012, 0.14, 0.16]} m={MAT.plasticDark} cast={false} />
        ))}
      </group>
      {/* Dispenser or deposit shutter */}
      <Box p={[0, 0.9, 0.325]} s={[kind === "cdm" ? 0.44 : 0.3, kind === "cdm" ? 0.08 : 0.04, 0.02]} m={MAT.mesh} cast={false} />
      <Box p={[0, 0.9, 0.333]} s={[kind === "cdm" ? 0.46 : 0.32, 0.006, 0.006]} m={MAT.ledGreen} cast={false} />
      {/* Illuminated topper */}
      <RBox p={[0, 2.05, 0.02]} s={[0.84, 0.32, 0.56]} m={brand.brandGlow} radius={0.03} />
      <Label text={title} p={[0, 2.05, 0.302]} w={0.7} h={0.2} bg="#ffffff" fg="#14181d" glow={0.5} />
      {kind === "atm" && <Beacon stationId={asset.id} p={[0.36, 2.21, 0.1]} />}
    </At>
  );
}

export function Atm({ asset, brand }: { asset: Asset; brand: Brand }) {
  return <Machine asset={asset} brand={brand} title="ATM" body={MAT.aluDark} kind="atm" />;
}

export function CashDeposit({ asset, brand }: { asset: Asset; brand: Brand }) {
  return <Machine asset={asset} brand={brand} title="Cash Deposit" body={MAT.steel} kind="cdm" />;
}

/** Cheque deposit kiosk: slim pedestal, angled touchscreen and a cheque scanner slot. */
export function ChequeKiosk({ asset, brand }: { asset: Asset; brand: Brand }) {
  return (
    <At x={asset.x} z={asset.z} rot={asset.rot}>
      <RBox p={[0, 1.2, -0.27]} s={[0.8, 2.4, 0.05]} m={brand.brandDark} radius={0.02} />
      <RBox p={[0, 0.55, 0]} s={[0.56, 1.1, 0.42]} m={MAT.plastic} radius={0.03} />
      <group position={[0, 1.2, 0.08]} rotation={[-0.45, 0, 0]}>
        <RBox p={[0, 0, 0]} s={[0.56, 0.42, 0.1]} m={MAT.plasticDark} radius={0.02} />
        <Box p={[0, 0.02, 0.051]} s={[0.46, 0.32, 0.004]} m={MAT.screen} cast={false} />
      </group>
      <Box p={[0, 0.98, 0.215]} s={[0.26, 0.015, 0.012]} m={MAT.mesh} cast={false} />
      <Box p={[0, 0.96, 0.218]} s={[0.28, 0.005, 0.006]} m={MAT.ledGreen} cast={false} />
      <RBox p={[0, 2.05, 0.0]} s={[0.56, 0.28, 0.46]} m={brand.brandGlow} radius={0.03} />
      <Label text="Cheque Deposit" p={[0, 2.05, 0.232]} w={0.5} h={0.17} bg="#ffffff" fg="#14181d" glow={0.5} />
    </At>
  );
}
