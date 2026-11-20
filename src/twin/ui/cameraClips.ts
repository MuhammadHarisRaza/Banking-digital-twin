import type { Asset } from "../layout/types";

/**
 * Recorded footage for the camera panels (as in the factory twin's video registry). Files live in
 * public/videos. They are royalty-free Mixkit stock clips (Mixkit License: free for commercial use, no
 * attribution needed), standing in for real branch CCTV until an NVR is integrated.
 */
export interface Clip {
  id: string;
  file: string;
  title: string;
  /** Where the clip came from, for the credits line. */
  source: string;
}

const clip = (id: string, title: string, mixkitId: number): Clip => ({
  id,
  file: `${import.meta.env.BASE_URL}videos/${id}.mp4`,
  title,
  source: `Mixkit #${mixkitId}`,
});

const ATM_USING = clip("atm-using", "Customer at ATM", 21911);
const ATM_TOUCH = clip("atm-touchscreen", "Touchscreen close-up", 12823);
const CASH_MACHINE = clip("cash-counting-machine", "Note counter", 45703);
const CASH_HAND = clip("teller-counting-cash", "Cash handling", 20859);
const VAULT = clip("vault-safe", "Safe deposit boxes", 24604);
const LOBBY = clip("lobby", "Lobby", 33956);

/** Clips for an ATM or a CCTV camera, best match first. Empty if the asset has no camera. */
export function clipsFor(asset: Asset): Clip[] {
  if (asset.kind === "atm") return asset.index % 2 ? [ATM_USING, ATM_TOUCH] : [ATM_TOUCH, ATM_USING];
  if (asset.kind !== "cctv") return [];
  const where = asset.name.toLowerCase();
  if (where.includes("atm")) return [ATM_USING, ATM_TOUCH];
  if (where.includes("teller")) return [CASH_MACHINE, CASH_HAND];
  if (where.includes("vault")) return [VAULT];
  return [LOBBY];
}
