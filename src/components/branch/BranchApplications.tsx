import { ExternalLink } from "lucide-react";
import { APPLICATIONS } from "../../data/applications";
import { useAppLauncher } from "../../hooks/useAppLauncher";
import type { Branch } from "../../types";
import { APP_ICONS } from "../common/appIcons";
import StatusBadge from "../common/StatusBadge";

export default function BranchApplications({ branch }: { branch: Branch }) {
  const launch = useAppLauncher();

  return (
    <div className="-mx-3 -mt-3 overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Application</th>
            <th scope="col">Category</th>
            <th scope="col">Version</th>
            <th scope="col">Deployment</th>
            <th scope="col">Last deployed</th>
            <th scope="col">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {branch.applications.map(({ appId, status, deployedOn }) => {
            const app = APPLICATIONS[appId];
            const Icon = APP_ICONS[appId];
            return (
              <tr key={appId}>
                <td className="!text-ink">
                  <span className="flex items-center gap-3">
                    <Icon className="size-5 text-gold" strokeWidth={1.5} aria-hidden="true" />
                    {app.name}
                  </span>
                </td>
                <td>{app.category}</td>
                <td>{app.version}</td>
                <td>
                  <StatusBadge status={status} />
                </td>
                <td>{deployedOn}</td>
                <td className="!py-1">
                  <button
                    type="button"
                    aria-label={`Open ${app.name}`}
                    onClick={() => launch(appId, branch.id)}
                    className="grid size-7 place-items-center rounded text-ink transition-colors hover:bg-white/10 hover:text-gold"
                  >
                    <ExternalLink className="size-[18px]" strokeWidth={1.6} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
