import type { BranchLayout } from "./types";

/**
 * The building sits on a raised plinth: the interior floor and the entrance apron are at y = 0, the
 * pavement 45 cm lower, reached by three steps across the frontage or an accessible 1:12 ramp at the
 * left end. People outside and the walkthrough camera take their height from here.
 */
export const PLINTH = 0.45;
export const APRON = 1.6; // depth of the landing in front of the glass
export const STEP_RISE = PLINTH / 3;
export const STEP_RUN = 0.3;
export const RAMP_LENGTH = PLINTH * 12;
export const RAMP_WIDTH = 1.2;
export const ROAD_DROP = 0.15;
/** Pavement depth in front of the building, from the glass to the kerb. */
export const PAVEMENT_TO = 6.2;

/** Half-width of the car-park driveway across the pavement. */
export const DRIVEWAY_HALF = 3.0;

export function frontage(layout: BranchLayout) {
  const left = -layout.width / 2;
  const right = layout.width / 2;
  const front = layout.depth / 2;
  const apronEdge = front + APRON;
  return {
    left,
    right,
    front,
    apronEdge,
    steps: { x0: left + RAMP_LENGTH + 0.2, x1: right + 0.3, z0: apronEdge, z1: apronEdge + STEP_RUN * 3 },
    ramp: { x0: left - 0.3, x1: left - 0.3 + RAMP_LENGTH, z0: apronEdge, z1: apronEdge + RAMP_WIDTH },
    kerb: front + PAVEMENT_TO,
    /** Car-park driving aisle and the driveway that joins it to the road (x centre). */
    aisle: right + 12.4,
  };
}

export function groundHeight(layout: BranchLayout, x: number, z: number) {
  const f = frontage(layout);
  const onPlot = x >= f.left - 0.3 && x <= f.right + 0.3;
  if (onPlot && z <= f.apronEdge) return 0;
  const { steps, ramp } = f;
  if (x >= steps.x0 && x <= steps.x1 && z > steps.z0 && z <= steps.z1) {
    const k = Math.min(2, Math.floor((z - steps.z0) / STEP_RUN));
    return -STEP_RISE * (k + 1);
  }
  if (x >= ramp.x0 && x <= ramp.x1 && z > ramp.z0 && z <= ramp.z1) {
    // Rises towards the steps end, where it meets the landing.
    return -PLINTH * (1 - (x - ramp.x0) / RAMP_LENGTH);
  }
  // Dropped kerb at the driveway: a short ramp down to the road instead of a step.
  if (Math.abs(x - f.aisle) <= DRIVEWAY_HALF && z > f.kerb - 0.9 && z < f.kerb + 0.3) {
    const t = (z - (f.kerb - 0.9)) / 1.2;
    return -PLINTH - ROAD_DROP * Math.min(1, Math.max(0, t));
  }
  if (z > f.kerb) return -PLINTH - ROAD_DROP;
  return -PLINTH;
}
