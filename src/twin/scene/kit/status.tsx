import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, MeshStandardMaterial } from "three";
import type { V3 } from "../../layout/types";
import { stationTone } from "../../sim/engine";
import { useBranchSim } from "../../store";
import { MAT } from "../materials";
import { Cyl } from "../primitives";
import { TONE_HEX } from "../Selectable";

/** A small status light coloured by the station's live state; red pulses. */
export function Beacon({ stationId, p }: { stationId: string; p: V3 }) {
  const material = useMemo(() => new MeshStandardMaterial({ color: "#2fb344", emissive: "#2fb344", emissiveIntensity: 1.2, toneMapped: false }), []);
  const color = useMemo(() => new Color(), []);
  useFrame(({ clock }) => {
    const st = useBranchSim.getState().sim?.stations.find((s) => s.id === stationId);
    if (!st) return;
    const tone = stationTone(st);
    color.set(TONE_HEX[tone]);
    material.color.copy(color);
    material.emissive.copy(color);
    material.emissiveIntensity = tone === "red" ? 0.6 + 0.9 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 5)) : tone === "grey" ? 0.15 : 1.1;
  });
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group position={p}>
      <Cyl p={[0, 0.02, 0]} r={0.035} h={0.04} m={MAT.aluDark} low cast={false} />
      <mesh position={[0, 0.09, 0]} scale={[0.045, 0.1, 0.045]} material={material}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
      </mesh>
    </group>
  );
}

/** Screen glow that follows a machine's state: blue in service, flashing red when down. */
export function StatusScreen({ stationId, p, s, r }: { stationId: string; p: V3; s: V3; r?: V3 }) {
  const material = useMemo(() => MAT.screen.clone(), []);
  useFrame(({ clock }) => {
    const st = useBranchSim.getState().sim?.stations.find((x) => x.id === stationId);
    if (!st?.atm) return;
    const ok = st.atm.state === "ok" || st.atm.state === "lowCash";
    material.emissive.set(ok ? "#4fb3ff" : "#e05252");
    material.emissiveIntensity = ok ? 0.8 + Math.sin(clock.elapsedTime * 1.6) * 0.15 : 0.5 + 0.5 * Math.abs(Math.sin(clock.elapsedTime * 3));
  });
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh position={p} scale={s} rotation={r} material={material}>
      <boxGeometry />
    </mesh>
  );
}
