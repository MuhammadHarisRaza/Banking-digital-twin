import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { useBranches } from "../data/branches";

/** The selection lives in the URL, so it survives app launches and the back button. */
export function useBranchSelection() {
  const [params, setParams] = useSearchParams();
  const { getBranch } = useBranches();
  const selected = getBranch(params.get("branch")) ?? null;

  const select = useCallback((id: string) => setParams({ branch: id }, { replace: true }), [setParams]);
  const close = useCallback(() => setParams({}, { replace: true }), [setParams]);

  return { selected, select, close };
}
