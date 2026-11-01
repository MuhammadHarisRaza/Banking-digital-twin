import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { DEFAULT_BRANCH_ID, getBranch } from "../data/branches";

const CLOSED = "none";

/** The selection lives in the URL, so it survives app launches and the back button. */
export function useBranchSelection() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("branch");

  const selected = raw === CLOSED ? null : (getBranch(raw) ?? getBranch(DEFAULT_BRANCH_ID)!);

  const select = useCallback((id: string) => setParams({ branch: id }, { replace: true }), [setParams]);
  const close = useCallback(() => setParams({ branch: CLOSED }, { replace: true }), [setParams]);

  return { selected, select, close };
}
