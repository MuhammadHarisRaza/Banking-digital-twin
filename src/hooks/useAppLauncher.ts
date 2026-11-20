import { useCallback } from "react";
import { useNavigate } from "react-router";
import { APP_LINKS } from "../config/appLinks";
import { useSettings } from "../store/settingsStore";
import type { AppLinkKey } from "../types";

/** Opens the deployed app in a new tab, or the local placeholder route when no URL is set. */
export function useAppLauncher() {
  const navigate = useNavigate();
  const overrides = useSettings((s) => s.config.appLinks);

  return useCallback(
    (key: AppLinkKey, branchId?: string) => {
      const { fallbackRoute } = APP_LINKS[key];
      // A URL set in Settings wins over the build-time environment value.
      const url = overrides[key]?.trim() || APP_LINKS[key].url;
      const query = branchId ? `?branch=${encodeURIComponent(branchId)}` : "";
      if (url) {
        window.open(`${url}${query}`, "_blank", "noopener,noreferrer");
      } else {
        navigate(`${fallbackRoute}${query}`);
      }
    },
    [navigate, overrides],
  );
}
