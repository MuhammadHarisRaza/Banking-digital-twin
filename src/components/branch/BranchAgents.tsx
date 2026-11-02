import { Bot } from "lucide-react";
import { AGENTS } from "../../data/agents";
import { APPLICATIONS } from "../../data/applications";
import { useAppLauncher } from "../../hooks/useAppLauncher";
import type { Branch } from "../../types";
import StatusBadge from "../common/StatusBadge";

export default function BranchAgents({ branch }: { branch: Branch }) {
  const launch = useAppLauncher();

  return (
    <ul className="space-y-1.5">
      {branch.agents.map(({ agentId, status }) => {
        const agent = AGENTS[agentId];
        const app = APPLICATIONS[agent.appId];
        return (
          <li key={agentId} className="flex items-center gap-2.5 rounded-lg border border-line-soft bg-card/50 px-3 py-1.5">
            <Bot className="size-5 shrink-0 text-brand" strokeWidth={1.4} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] leading-tight font-medium">{agent.name}</div>
              <div className="text-[12.5px] leading-snug text-soft">{agent.purpose}</div>
            </div>
            <div className="shrink-0 text-right">
              <StatusBadge status={status} />
              <button
                type="button"
                onClick={() => launch(agent.appId, branch.id)}
                aria-label={`Open connected application ${app.name}`}
                className="block w-full text-right text-[12.5px] text-brand transition-colors hover:text-brand-bright"
              >
                {app.name}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
