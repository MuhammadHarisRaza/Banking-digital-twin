import { useCallback } from "react";
import { useNavigate } from "react-router";
import { APP_LINKS } from "../config/appLinks";
import type { AppLinkKey } from "../types";

/** Opens the deployed app in a new tab, or the local placeholder route when no URL is set. */
export function useAppLauncher() {
  const navigate = useNavigate();

  return useCallback(
    (key: AppLinkKey, branchId?: string) => {
      const { url, fallbackRoute } = APP_LINKS[key];
      const query = branchId ? `?branch=${encodeURIComponent(branchId)}` : "";
      if (url) {
        window.open(`${url}${query}`, "_blank", "noopener,noreferrer");
      } else {
        navigate(`${fallbackRoute}${query}`);
      }
    },
    [navigate],
  );
}
